"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import {
  AlertCircle,
  BarChart3,
  BellDot,
  Bookmark,
  CheckCheck,
  Download,
  LayoutGrid,
  List,
  Package,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertsMenu } from "@/components/alerts-menu"
import { BottomNav, type NavKey } from "@/components/bottom-nav"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { EmptyState, LoadingState, Tab, WatchForm } from "@/components/dashboard-parts"
import { ModCard, ModRow } from "@/components/mod-card"
import { StatTiles } from "@/components/stat-tiles"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAlerts } from "@/hooks/use-alerts"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useStatsHistory } from "@/hooks/use-stats-history"
import { getStatus, hasActivity, useSeen, useWatched, type ModStatus } from "@/hooks/use-workshop-state"
import { DEFAULT_GAME, OWNER_NAME, OWNER_STEAM_ID } from "@/lib/config"
import { downloadCsv } from "@/lib/export"
import { fetcher } from "@/lib/fetcher"
import { formatRelative } from "@/lib/format"
import { computeTotals, isSortKey, SORTS, sortMods, type SortKey } from "@/lib/mods"
import type { Mod, ModsResponse, WatchedResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

// Only loaded when first needed: keeps the initial bundle small.
const ModDetailSheet = dynamic(() => import("@/components/mod-detail-sheet").then((m) => m.ModDetailSheet), { ssr: false })
const Insights = dynamic(() => import("@/components/insights").then((m) => m.Insights), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  ),
})

const ALL = "all"
const WATCHED = "watched"
const NO_STATUS: ModStatus = { isNew: false, isUpdated: false, newComments: 0 }

type View = "grid" | "list"
type Mode = "mods" | "insights"
const isView = (v: unknown): v is View => v === "grid" || v === "list"
const isViewOrNull = (v: unknown): v is View | null => v === null || isView(v)
const isMode = (v: unknown): v is Mode => v === "mods" || v === "insights"
const isString = (v: unknown): v is string => typeof v === "string"
const isOwn = (m: Mod) => !m.creatorId || m.creatorId === OWNER_STEAM_ID

/* ------------------------------------------------------------------ */

function Header({
  fetchedAt,
  refreshing,
  onRefresh,
  children,
}: {
  fetchedAt?: number
  refreshing: boolean
  onRefresh: () => void
  children?: React.ReactNode
}) {
  // Re-render periodically so "synced Xm ago" stays current.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="safe-top sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={36} height={36} className="size-9 shrink-0 rounded-[10px] shadow-sm shadow-black/20" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{OWNER_NAME}</span>
            <span className="truncate text-xs text-muted-foreground">
              Workshop dashboard
              {fetchedAt ? <span className="hidden sm:inline"> · synced {formatRelative(Math.floor(fetchedAt / 1000))}</span> : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 [&_button]:size-10 sm:[&_button]:size-8">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing} aria-label="Refresh data" title="Refresh (R)" className="hidden sm:inline-flex">
            <RefreshCw className={cn("size-[18px]", refreshing && "animate-spin")} />
          </Button>
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon: typeof Package }[]
  label: string
}) {
  return (
    <div className="flex h-9 shrink-0 items-center rounded-lg border bg-card p-0.5" role="group" aria-label={label}>
      {options.map(({ value: v, label: text, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
            value === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {text}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function WorkshopDashboard({ initial }: { initial: ModsResponse | null }) {
  const { data, error, isLoading, mutate } = useSWR<ModsResponse>("/api/mods", fetcher, {
    fallbackData: initial ?? undefined,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    refreshInterval: 5 * 60_000,
  })
  const { watched, toggle: toggleWatch, add: addWatch } = useWatched()
  const { seen, markSeen, hydrated: seenHydrated } = useSeen()

  const watchedPath = watched.length ? `/api/mods/watched?ids=${[...watched].sort().join(",")}` : null
  const { data: watchedData, mutate: mutateWatched } = useSWR<WatchedResponse>(watchedPath, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    refreshInterval: 5 * 60_000,
  })

  const [game, setGame] = useLocalStorage<string>("dash-game", DEFAULT_GAME, isString)
  const [sort, setSort] = useLocalStorage<SortKey>("dash-sort", "updated-desc", isSortKey)
  const [storedView, setView] = useLocalStorage<View | null>("dash-view", null, isViewOrNull)
  const isPhone = useMediaQuery(PHONE_QUERY)
  // Compact rows suit phones; larger screens get the card grid unless the user picked one.
  const view: View = storedView ?? (isPhone ? "list" : "grid")
  const [mode, setMode] = useLocalStorage<Mode>("dash-mode", "mods", isMode)
  const [query, setQuery] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Detail sheet: remember what was unread *before* opening, since opening marks it seen.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openedWith, setOpenedWith] = useState<{ status: ModStatus; since?: number } | null>(null)

  const allMods = useMemo(() => {
    const map = new Map<string, Mod>()
    data?.mods.forEach((m) => map.set(m.id, m))
    watchedData?.mods.forEach((m) => map.has(m.id) || map.set(m.id, m))
    return Array.from(map.values())
  }, [data, watchedData])
  const byId = useMemo(() => new Map(allMods.map((m) => [m.id, m])), [allMods])
  const watchedSet = useMemo(() => new Set(watched), [watched])

  const history = useStatsHistory(allMods)
  const alerts = useAlerts({ watched, all: allMods, isOwn })

  const games = data?.games ?? []
  const activeTab = game === ALL || game === WATCHED || !data || games.includes(game) ? game : ALL

  const scoped = useMemo(() => {
    if (activeTab === WATCHED) return allMods.filter((m) => watchedSet.has(m.id))
    const own = allMods.filter(isOwn)
    return activeTab === ALL ? own : own.filter((m) => m.game === activeTab)
  }, [allMods, activeTab, watchedSet])

  const statuses = useMemo(() => {
    const map = new Map<string, ModStatus>()
    for (const m of allMods) map.set(m.id, seenHydrated ? getStatus(m, seen[m.id]) : NO_STATUS)
    return map
  }, [allMods, seen, seenHydrated])

  const watchedUnread = useMemo(
    () => allMods.filter((m) => watchedSet.has(m.id) && hasActivity(statuses.get(m.id) ?? NO_STATUS)).length,
    [allMods, watchedSet, statuses],
  )

  const unreadInScope = useMemo(() => scoped.filter((m) => hasActivity(statuses.get(m.id)!)), [scoped, statuses])

  const visible = useMemo(() => {
    let mods = unreadOnly ? unreadInScope : scoped
    const q = query.trim().toLowerCase()
    if (q) {
      mods = mods.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.id === q ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return sortMods(mods, sort)
  }, [scoped, unreadInScope, unreadOnly, query, sort])

  const totals = useMemo(() => computeTotals(scoped), [scoped])
  const totalsDelta = useMemo(() => history.totalsDelta(scoped), [history, scoped])
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  // Refs keep the open/watch callbacks stable so memoized cards don't all re-render.
  const seenRef = useRef(seen)
  seenRef.current = seen
  const byIdRef = useRef(byId)
  byIdRef.current = byId

  // The open sheet gets its own history entry, so the phone's back button/gesture closes it.
  const pushedRef = useRef(false)

  const openMod = useCallback(
    (id: string, { push = true }: { push?: boolean } = {}) => {
      const mod = byIdRef.current.get(id)
      if (!mod) return
      const prev = seenRef.current[id]
      setOpenedWith({ status: getStatus(mod, prev), since: prev?.seenAt })
      setSelectedId(id)
      setSheetOpen(true)
      markSeen([mod])
      const url = new URL(window.location.href)
      url.searchParams.set("mod", id)
      if (push && !pushedRef.current) {
        window.history.pushState({ ...window.history.state, sheet: id }, "", url)
        pushedRef.current = true
      } else {
        window.history.replaceState({ ...window.history.state, sheet: id }, "", url)
      }
    },
    [markSeen],
  )

  const onSheetChange = useCallback((open: boolean) => {
    if (open) return setSheetOpen(true)
    setSheetOpen(false)
    if (pushedRef.current) {
      pushedRef.current = false
      window.history.back()
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete("mod")
      const { sheet: _sheet, ...rest } = (window.history.state ?? {}) as Record<string, unknown>
      window.history.replaceState(rest, "", url)
    }
  }, [])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (!(e.state as { sheet?: string } | null)?.sheet) {
        pushedRef.current = false
        setSheetOpen(false)
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Deep link: /?mod=<id> (used by notifications), opened once data is ready.
  const [pendingModId, setPendingModId] = useState<string | null>(null)
  useEffect(() => {
    setPendingModId(new URLSearchParams(window.location.search).get("mod"))
  }, [])
  useEffect(() => {
    if (!pendingModId || !data || !seenHydrated) return
    if (byId.has(pendingModId)) {
      setPendingModId(null)
      openMod(pendingModId, { push: false })
    } else if (!watchedSet.has(pendingModId) || watchedData) {
      setPendingModId(null) // Not one of ours and not watched: nothing to show.
    }
  }, [pendingModId, data, watchedData, byId, seenHydrated, watchedSet, openMod])

  // Notification clicks while the app is already open (see public/sw.js).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-mod" && typeof e.data.id === "string") setPendingModId(e.data.id)
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        mutate(fetcher<ModsResponse>("/api/mods?fresh=1"), { revalidate: false }),
        watchedPath ? mutateWatched(fetcher<WatchedResponse>(`${watchedPath}&fresh=1`), { revalidate: false }) : null,
      ])
    } catch {
      // SWR keeps the previous data and exposes the error.
    } finally {
      setRefreshing(false)
    }
  }, [mutate, mutateWatched, watchedPath])

  // Keyboard: "/" search, "r" refresh.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(el.tagName) || el.isContentEditable) return
      if (e.key === "/") {
        e.preventDefault()
        setMode("mods")
        requestAnimationFrame(() => searchRef.current?.focus())
      } else if (e.key === "r") {
        refresh()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [refresh, setMode])

  const onTagClick = useCallback(
    (tag: string) => {
      setQuery(tag)
      setMode("mods")
      onSheetChange(false)
    },
    [onSheetChange, setMode],
  )

  // Phone tab bar: Watched is a game-tab shortcut, so remember where to return to.
  const lastGameRef = useRef(DEFAULT_GAME)
  useEffect(() => {
    if (activeTab !== WATCHED) lastGameRef.current = activeTab
  }, [activeTab])

  const navActive: NavKey = mode === "insights" ? "insights" : activeTab === WATCHED ? "watched" : "mods"
  const onNav = useCallback(
    (key: NavKey) => {
      const same = key === navActive
      if (key === "search") {
        setMode("mods")
        requestAnimationFrame(() => {
          searchRef.current?.focus()
          searchRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
        })
        return
      }
      if (same) return window.scrollTo({ top: 0, behavior: "smooth" })
      if (key === "insights") setMode("insights")
      else {
        setMode("mods")
        setGame(key === "watched" ? WATCHED : lastGameRef.current)
      }
      window.scrollTo({ top: 0 })
    },
    [navActive, setGame, setMode],
  )

  // Keep the selected game chip visible in the horizontally scrolling row.
  const tabsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
  }, [activeTab])

  const scopeLabel = activeTab === ALL ? "all games" : activeTab === WATCHED ? "watched mods" : activeTab
  const countFor = (g: string) => data?.mods.filter((m) => m.game === g).length ?? 0

  const renderItem = (mod: Mod) => {
    const props = {
      mod,
      status: statuses.get(mod.id) ?? NO_STATUS,
      watched: watchedSet.has(mod.id),
      foreign: !isOwn(mod),
      subsDelta: history.modDelta(mod),
      onOpen: openMod,
      onToggleWatch: toggleWatch,
    }
    return view === "grid" ? (
      <li key={mod.id} className="flex [content-visibility:auto] [contain-intrinsic-size:auto_340px] [&>article]:flex-1">
        <ModCard {...props} />
      </li>
    ) : (
      <li key={mod.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_88px]">
        <ModRow {...props} />
      </li>
    )
  }

  return (
    <>
      <Header fetchedAt={data?.fetchedAt} refreshing={refreshing || (isLoading && !data)} onRefresh={refresh}>
        <AlertsMenu alerts={alerts} watchedCount={watched.length} />
      </Header>

      <PullToRefresh onRefresh={refresh} refreshing={refreshing}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:gap-6 sm:px-6 sm:pb-16 sm:pt-8">
        {isLoading && !data ? (
          <LoadingState />
        ) : error && !data ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">Couldn&apos;t load your mods.</span> {(error as Error).message}
              </span>
            </span>
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && "animate-spin")} /> Try again
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5" /> Showing saved data — the last refresh failed: {(error as Error).message}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">Workshop</h1>
                  <p className="text-sm text-muted-foreground">
                    Totals for <span className="font-medium text-foreground">{scopeLabel}</span>
                    {history.baselineAt && <> · change since {formatRelative(Math.floor(history.baselineAt / 1000))}</>}
                  </p>
                </div>
                <div className="hidden sm:block">
                <Segmented
                  label="Section"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "mods", label: "Mods", icon: Package },
                    { value: "insights", label: "Insights", icon: BarChart3 },
                  ]}
                />
                </div>
              </div>
              <StatTiles totals={totals} delta={totalsDelta} since={history.baselineAt} scope={scopeLabel} />
            </div>

            <div ref={tabsRef} role="tablist" aria-label="Filter by game" className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0 [&>button]:snap-start">
              <Tab active={activeTab === ALL} onClick={() => setGame(ALL)} count={data?.count}>
                All games
              </Tab>
              {games.map((g) => (
                <Tab key={g} active={activeTab === g} onClick={() => setGame(g)} count={countFor(g)}>
                  {g}
                </Tab>
              ))}
              <Tab
                active={activeTab === WATCHED}
                onClick={() => setGame(WATCHED)}
                count={watched.length}
                icon={<Bookmark className={cn("size-3.5", activeTab === WATCHED && "fill-current")} />}
              >
                Watched
              </Tab>
            </div>

            {mode === "insights" ? (
              <Insights mods={scoped} scopeLabel={scopeLabel} showGames={activeTab === ALL} history={history} onSelect={openMod} />
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      type="search"
                      enterKeyHint="search"
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      placeholder="Search title, tag or description"
                      aria-label="Search mods"
                      className="h-10 bg-card pl-9 pr-9 sm:h-9 [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : (
                      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
                        /
                      </kbd>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={unreadOnly ? "secondary" : "outline"}
                      size="lg"
                      onClick={() => setUnreadOnly((v) => !v)}
                      aria-pressed={unreadOnly}
                      className={cn("bg-card", unreadOnly && "bg-secondary text-primary")}
                      title="Only show mods with new updates or comments"
                    >
                      <BellDot />
                      Unread
                      <span className="text-xs tabular-nums opacity-70">{unreadInScope.length}</span>
                    </Button>
                    <Select items={SORTS} value={sort} onValueChange={(v) => isSortKey(v) && setSort(v)}>
                      <SelectTrigger className="h-9 flex-1 bg-card sm:w-[180px] sm:flex-none" aria-label="Sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex h-9 shrink-0 items-center rounded-lg border bg-card p-0.5" role="group" aria-label="Layout">
                      {(["grid", "list"] as const).map((v) => {
                        const Icon = v === "grid" ? LayoutGrid : List
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            aria-pressed={view === v}
                            aria-label={`${v} view`}
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded-md transition-colors",
                              view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {activeTab === WATCHED && <WatchForm onAdd={addWatch} existing={watched} />}

                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span aria-live="polite">
                    <span className="font-medium tabular-nums text-foreground">{visible.length}</span> {visible.length === 1 ? "mod" : "mods"}
                    {query && <> matching “{query}”</>}
                  </span>
                  <span className="flex items-center gap-4">
                    {unreadInScope.length > 0 && (
                      <button type="button" onClick={() => markSeen(unreadInScope)} className="-my-2 inline-flex items-center gap-1.5 py-2 text-xs font-medium hover:text-foreground">
                        <CheckCheck className="size-3.5" /> <span className="sm:hidden">Read all</span><span className="hidden sm:inline">Mark all as read</span>
                      </button>
                    )}
                    {visible.length > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadCsv(visible, `workshop-${scopeLabel.replace(/\W+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-foreground"
                        title="Download the mods shown as a CSV spreadsheet"
                      >
                        <Download className="size-3.5" /> <span className="sm:hidden">CSV</span><span className="hidden sm:inline">Export CSV</span>
                      </button>
                    )}
                  </span>
                </div>

                {visible.length === 0 ? (
                  activeTab === WATCHED && watched.length === 0 ? (
                    <EmptyState icon={Bookmark} title="Nothing watched yet">
                      Tap the bookmark on any mod, or paste a Workshop link above, to follow its updates and comments.
                    </EmptyState>
                  ) : unreadOnly && !query ? (
                    <EmptyState icon={CheckCheck} title="You're all caught up">
                      No new updates or comments here.
                    </EmptyState>
                  ) : (
                    <EmptyState icon={SearchX} title="No mods match">
                      Try a different search or filter.
                    </EmptyState>
                  )
                ) : (
                  <ul className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "divide-y overflow-hidden rounded-2xl border bg-card"}>
                    {visible.map(renderItem)}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </main>
      </PullToRefresh>

      <BottomNav
        active={navActive}
        onSelect={onNav}
        badges={{ watched: watchedUnread }}
      />

      {selectedId && (
        <ModDetailSheet
          mod={selected}
          open={sheetOpen && !!selected}
          onOpenChange={onSheetChange}
          status={openedWith?.status}
          newCommentsSince={openedWith?.status.newComments ? openedWith.since : undefined}
          isWatched={selected ? watchedSet.has(selected.id) : false}
          onToggleWatch={() => selected && toggleWatch(selected.id)}
          onTagClick={onTagClick}
          delta={
            selected
              ? {
                  subscriptions: history.modDelta(selected),
                  favorites: history.modDelta(selected, "favorites"),
                  views: history.modDelta(selected, "views"),
                }
              : undefined
          }
        />
      )}
    </>
  )
}
