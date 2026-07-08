"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  CalendarPlus,
  CalendarClock,
  Users,
  Eye,
  Star,
  Search,
  ThumbsUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModDetailSheet } from "@/components/mod-detail-sheet"
import { formatDate, formatRelative, formatNumber } from "@/lib/format"
import type { Mod } from "@/app/api/mods/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DEFAULT_GAME = "RimWorld"

type Totals = {
  mods: number
  subscriptions: number
  favorites: number
  views: number
  comments: number
  lifetimeSubscriptions: number
}

type ModsResponse = {
  steamId: string
  count: number
  games: string[]
  totals: Totals
  mods: Mod[]
}

type SortKey = "created-desc" | "created-asc" | "updated-desc" | "subs-desc" | "comments-desc"

const SORTS: { value: SortKey; label: string }[] = [
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "subs-desc", label: "Most subscribers" },
  { value: "comments-desc", label: "Most comments" },
]

function sortMods(mods: Mod[], key: SortKey): Mod[] {
  const copy = [...mods]
  switch (key) {
    case "created-asc":
      return copy.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    case "updated-desc":
      return copy.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    case "subs-desc":
      return copy.sort((a, b) => b.subscriptions - a.subscriptions)
    case "comments-desc":
      return copy.sort((a, b) => b.commentCount - a.commentCount)
    default:
      return copy.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function ModsDashboard() {
  const { data, error, isLoading } = useSWR<ModsResponse>("/api/mods", fetcher, {
    revalidateOnFocus: false,
  })

  const [game, setGame] = useState<string>(DEFAULT_GAME)
  const [sort, setSort] = useState<SortKey>("created-desc")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Mod | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [seenMods, setSeenMods] = useState<Record<string, { updatedAt: number; commentCount: number }>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem("steam-dashboard-seen")
      if (stored) setSeenMods(JSON.parse(stored))
    } catch (err) {}
  }, [])

  const games = data?.games ?? []
  const effectiveGame = useMemo(() => {
    if (!data) return DEFAULT_GAME
    if (game === "all") return "all"
    return games.includes(game) ? game : "all"
  }, [data, game, games])

  const filtered = useMemo(() => {
    let mods = data?.mods ?? []
    if (effectiveGame !== "all") mods = mods.filter((m) => m.game === effectiveGame)
    const q = query.trim().toLowerCase()
    if (q) {
      mods = mods.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return sortMods(mods, sort)
  }, [data, effectiveGame, query, sort])

  function openMod(mod: Mod) {
    setSelected(mod)
    setSheetOpen(true)
    
    const updatedSeen = {
      ...seenMods,
      [mod.id]: { updatedAt: mod.updatedAt ?? 0, commentCount: mod.commentCount },
    }
    setSeenMods(updatedSeen)
    try {
      localStorage.setItem("steam-dashboard-seen", JSON.stringify(updatedSeen))
    } catch (err) {}
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your Workshop mods…
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>Could not load your mods. Please try again shortly.</p>
      </div>
    )
  }

  const t = data.totals

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-primary/10 bg-card/40 p-5 shadow-sm backdrop-blur-md sm:grid-cols-5">
        <SummaryStat label="Published mods" value={formatNumber(t.mods)} />
        <SummaryStat label="Subscribers" value={formatNumber(t.subscriptions)} />
        <SummaryStat label="Lifetime Subs" value={formatNumber(t.lifetimeSubscriptions)} />
        <SummaryStat label="Favorites" value={formatNumber(t.favorites)} />
        <SummaryStat label="Comments" value={formatNumber(t.comments)} />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mods by name, tag, or description…"
            className="pl-9"
          />
        </div>
        <Select value={effectiveGame} onValueChange={(v) => v && setGame(v)}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All games ({data.count})</SelectItem>
            {games.map((g) => {
              const n = data.mods.filter((m) => m.game === g).length
              return (
                <SelectItem key={g} value={g}>
                  {g} ({n})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground tabular-nums">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> mods
      </div>

      {/* List */}
      <ul className="flex flex-col gap-3">
        {filtered.map((mod) => {
          const seen = seenMods[mod.id]
          const isNewUpdate = seen && (mod.updatedAt ?? 0) > seen.updatedAt
          const isNewComments = seen && mod.commentCount > seen.commentCount
          const isUnseen = !seen

          return (
            <li key={mod.id}>
              <button
                type="button"
                onClick={() => openMod(mod)}
                className="group flex w-full flex-col gap-3 rounded-xl border border-primary/5 bg-card/60 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
              >
                {mod.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mod.previewUrl || "/placeholder.svg"}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border/50 transition-transform group-hover:scale-105"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center">
                    <span className="inline-flex items-center gap-1.5 font-semibold leading-snug text-foreground text-pretty group-hover:text-primary transition-colors">
                      {mod.title}
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="font-normal bg-secondary/50">
                        {mod.game}
                      </Badge>
                      {isUnseen && <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 font-semibold text-[10px] px-1.5 py-0">NEW</Badge>}
                      {isNewUpdate && <Badge variant="default" className="bg-green-500 hover:bg-green-600 font-semibold text-[10px] px-1.5 py-0">NEW UPDATE</Badge>}
                      {isNewComments && <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 font-semibold text-[10px] px-1.5 py-0">NEW COMMENTS</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <span className="flex items-center gap-1" title="Date posted">
                      <CalendarPlus className="size-3.5" />
                      Posted {formatDate(mod.createdAt)}
                    </span>
                    <span className="flex items-center gap-1" title="Date updated">
                      <CalendarClock className="size-3.5" />
                      Updated {formatDate(mod.updatedAt)}
                      <span className="text-muted-foreground/70">
                        ({formatRelative(mod.updatedAt)})
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground tabular-nums sm:gap-4 sm:flex-nowrap">
                  <span className="flex items-center gap-1" title="Subscribers">
                    <Users className="size-3.5 text-primary/70" />
                    {formatNumber(mod.subscriptions)}
                  </span>
                  <span className="flex items-center gap-1" title="Favorites">
                    <Star className="size-3.5 text-yellow-500/70" />
                    {formatNumber(mod.favorites)}
                  </span>
                  <span className="flex items-center gap-1" title="Views">
                    <Eye className="size-3.5 text-blue-500/70" />
                    {formatNumber(mod.views)}
                  </span>
                  <span className="flex items-center gap-1" title="Score">
                    <ThumbsUp className="size-3.5 text-green-500/70" />
                    {formatNumber(mod.votesUp)}
                  </span>
                  <span
                    className={`flex items-center gap-1 font-medium ${isNewComments ? 'text-amber-500' : 'text-foreground'}`}
                    title="Comments"
                  >
                    <MessageSquare className="size-3.5" />
                    {formatNumber(mod.commentCount)}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No mods match your filters.
        </div>
      )}

      <ModDetailSheet mod={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
