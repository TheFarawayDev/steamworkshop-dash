"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import {
  AlertCircle,
  BellDot,
  Bookmark,
  CheckCheck,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModCard, ModRow } from "@/components/mod-card"
import { ModDetailSheet } from "@/components/mod-detail-sheet"
import { NotificationManager } from "@/components/notification-manager"
import { StatTiles } from "@/components/stat-tiles"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { getStatus, hasActivity, useSeen, useWatched, type ModStatus } from "@/hooks/use-workshop-state"
import { DEFAULT_GAME, OWNER_NAME, OWNER_STEAM_ID } from "@/lib/config"
import { fetcher } from "@/lib/fetcher"
import { formatRelative } from "@/lib/format"
import { computeTotals, isSortKey, parseWorkshopId, SORTS, sortMods, type SortKey } from "@/lib/mods"
import type { Mod, ModsResponse, WatchedResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

const ALL = "all"
const WATCHED = "watched"

type View = "grid" | "list"
const isView = (v: unknown): v is View => v === "grid" || v === "list"
const isString = (v: unknown): v is string => typeof v === "string"

/* ------------------------------------------------------------------ */

function Header({
  fetchedAt,
  refreshing,
  onRefresh,
}: {
  fetchedAt?: number
  refreshing: boolean
  onRefresh: () => void
}) {
  // Re-render periodically so "updated Xm ago" stays current.
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
          <img src="/logo-96.png" alt="" className="size-8 shrink-0 rounded-lg ring-1 ring-border" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{OWNER_NAME}</span>
            <span className="truncate text-xs text-muted-foreground">
              Workshop dashboard
              {fetchedAt ? <span className="hidden sm:inline"> · synced {formatRelative(Math.floor(fetchedAt / 1000))}</span> : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing} aria-label="Refresh data" title="Refresh">
            <RefreshCw className={cn("size-[18px]", refreshing && "animate-spin")} />
          </Button>
          <NotificationManager />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function Tab({
  active,
  onClick,
  children,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
    >
      {icon}
      {children}
      {count != null && <span className={cn("tabular-nums text-xs", active ? "opacity-70" : "opacity-60")}>{count}</span>}
    </button>
  )
}

function WatchForm({ onAdd, existing }: { onAdd: (id: string) => void; existing: string[] }) {
  const [value, setValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const id = parseWorkshopId(value)
    if (!id) return setMessage("Paste a Workshop link (…/filedetails/?id=123) or a numeric id.")
    if (existing.includes(id)) return setMessage("You're already watching that mod.")
    onAdd(id)
    setValue("")
    setMessage(null)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-dashed bg-card/50 p-4">
      <label htmlFor="watch-input" className="text-sm font-medium">
        Watch any Workshop item
      </label>
      <p className="text-xs text-muted-foreground">
        Track updates and comments on mods you don&apos;t own. Watched mods are included in update alerts.
      </p>
      <div className="flex gap-2">
        <Input
          id="watch-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setMessage(null)
          }}
          placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=…"
          className="h-9"
          aria-invalid={!!message}
          aria-describedby={message ? "watch-msg" : undefined}
        />
        <Button type="submit" size="lg" disabled={!value.trim()}>
          <Plus /> Watch
        </Button>
      </div>
      {message && (
        <p id="watch-msg" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </form>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading mods">
      <Skeleton className="h-[92px] w-full rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, children }: { icon: typeof SearchX; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
      <Icon className="size-7 text-muted-foreground/60" />
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function WorkshopDashboard() {
  const { data, error, isLoading, mutate } = useSWR<ModsResponse>("/api/mods", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60_000,
  })
  const { watched, toggle: toggleWatch, add: addWatch } = useWatched()
  const { seen, markSeen, hydrated: seenHydrated } = useSeen()

  const watchedKey = watched.length ? `/api/mods/watched?ids=${[...watched].sort().join(",")}` : null
  const { data: watchedData, mutate: mutateWatched } = useSWR<WatchedResponse>(watchedKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const [game, setGame] = useLocalStorage<string>("dash-game", DEFAULT_GAME, isString)
  const [sort, setSort] = useLocalStorage<SortKey>("dash-sort", "updated-desc", isSortKey)
  const [view, setView] = useLocalStorage<View>("dash-view", "grid", isView)
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

  const isOwn = useCallback((m: Mod) => !m.creatorId || m.creatorId === OWNER_STEAM_ID, [])
  const games = data?.games ?? []
  const activeTab = game === ALL || game === WATCHED || !data || games.includes(game) ? game : ALL

  const scoped = useMemo(() => {
    if (activeTab === WATCHED) return allMods.filter((m) => watched.includes(m.id))
    const own = allMods.filter(isOwn)
    return activeTab === ALL ? own : own.filter((m) => m.game === activeTab)
  }, [allMods, activeTab, watched, isOwn])

  const statuses = useMemo(() => {
    const map = new Map<string, ModStatus>()
    for (const m of allMods) map.set(m.id, getStatus(m, seen[m.id]))
    return map
  }, [allMods, seen])

  const unreadInScope = useMemo(
    () => (seenHydrated ? scoped.filter((m) => hasActivity(statuses.get(m.id)!)) : []),
    [scoped, statuses, seenHydrated],
  )

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
  const selected = allMods.find((m) => m.id === selectedId) ?? null

  const openMod = useCallback(
    (mod: Mod) => {
      setOpenedWith({ status: getStatus(mod, seen[mod.id]), since: seen[mod.id]?.seenAt })
      setSelectedId(mod.id)
      setSheetOpen(true)
      markSeen([mod])
      const url = new URL(window.location.href)
      url.searchParams.set("mod", mod.id)
      window.history.replaceState(null, "", url)
    },
    [seen, markSeen],
  )

  const onSheetChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      const url = new URL(window.location.href)
      url.searchParams.delete("mod")
      window.history.replaceState(null, "", url)
    }
  }, [])

  // Deep link: /?mod=<id> (used by push notifications), opened once data is ready.
  const [pendingModId, setPendingModId] = useState<string | null>(null)
  useEffect(() => {
    setPendingModId(new URLSearchParams(window.location.search).get("mod"))
  }, [])
  useEffect(() => {
    if (!pendingModId || !data || !seenHydrated) return
    const mod = allMods.find((m) => m.id === pendingModId)
    if (mod) {
      setPendingModId(null)
      openMod(mod)
    } else if (!watched.includes(pendingModId) || watchedData) {
      setPendingModId(null) // Not one of ours and not watched: nothing to show.
    }
  }, [pendingModId, data, watchedData, allMods, seenHydrated, watched, openMod])

  // Notification clicks while the app is already open (see public/sw.js).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-mod" && typeof e.data.id === "string") {
        setPendingModId(e.data.id)
        mutate()
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [mutate])

  // "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === "/" && !/input|textarea|select/i.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  async function refresh() {
    setRefreshing(true)
    try {
      await Promise.all([mutate(), watchedKey ? mutateWatched() : null])
    } finally {
      setRefreshing(false)
    }
  }

  const scopeLabel = activeTab === ALL ? "all games" : activeTab === WATCHED ? "watched mods" : activeTab
  const countFor = (g: string) => data?.mods.filter((m) => m.game === g).length ?? 0

  return (
    <>
      <Header fetchedAt={data?.fetchedAt} refreshing={refreshing || (isLoading && !data)} onRefresh={refresh} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
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
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Workshop</h1>
                  <p className="text-sm text-muted-foreground">
                    Totals for <span className="font-medium text-foreground">{scopeLabel}</span>
                  </p>
                </div>
              </div>
              <StatTiles totals={totals} scope={scopeLabel} />
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Filter by game" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
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

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, tag or description"
                  aria-label="Search mods"
                  className="h-9 bg-card pl-9 pr-9"
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
                  <span className="tabular-nums text-xs opacity-70">{unreadInScope.length}</span>
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

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span aria-live="polite">
                <span className="font-medium tabular-nums text-foreground">{visible.length}</span>{" "}
                {visible.length === 1 ? "mod" : "mods"}
                {query && <> matching “{query}”</>}
              </span>
              {unreadInScope.length > 0 && (
                <button
                  type="button"
                  onClick={() => markSeen(unreadInScope)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-foreground"
                >
                  <CheckCheck className="size-3.5" /> Mark all as read
                </button>
              )}
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
            ) : view === "grid" ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((mod) => (
                  <li key={mod.id} className="flex">
                    <div className="flex-1 [&>article]:h-full">
                      <ModCard
                        mod={mod}
                        status={seenHydrated ? statuses.get(mod.id)! : { isNew: false, isUpdated: false, newComments: 0 }}
                        watched={watched.includes(mod.id)}
                        foreign={!isOwn(mod)}
                        onOpen={() => openMod(mod)}
                        onToggleWatch={() => toggleWatch(mod.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {visible.map((mod) => (
                  <li key={mod.id}>
                    <ModRow
                      mod={mod}
                      status={seenHydrated ? statuses.get(mod.id)! : { isNew: false, isUpdated: false, newComments: 0 }}
                      watched={watched.includes(mod.id)}
                      foreign={!isOwn(mod)}
                      onOpen={() => openMod(mod)}
                      onToggleWatch={() => toggleWatch(mod.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <ModDetailSheet
        mod={selected}
        open={sheetOpen && !!selected}
        onOpenChange={onSheetChange}
        status={openedWith?.status}
        newCommentsSince={openedWith?.status.newComments ? openedWith.since : undefined}
        isWatched={selected ? watched.includes(selected.id) : false}
        onToggleWatch={() => selected && toggleWatch(selected.id)}
      />
    </>
  )
}
