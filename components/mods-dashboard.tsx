"use client"

import { useMemo, useState } from "react"
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
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-4">
        <SummaryStat label="Published mods" value={formatNumber(t.mods)} />
        <SummaryStat label="Subscribers" value={formatNumber(t.subscriptions)} />
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
        <Select value={effectiveGame} onValueChange={setGame}>
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
        {filtered.map((mod) => (
          <li key={mod.id}>
            <button
              type="button"
              onClick={() => openMod(mod)}
              className="group flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
            >
              {mod.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mod.previewUrl || "/placeholder.svg"}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium leading-snug text-foreground text-pretty group-hover:text-primary">
                    {mod.title}
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <Badge variant="secondary" className="w-fit font-normal">
                    {mod.game}
                  </Badge>
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
              <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1" title="Subscribers">
                  <Users className="size-3.5" />
                  {formatNumber(mod.subscriptions)}
                </span>
                <span className="flex items-center gap-1" title="Favorites">
                  <Star className="size-3.5" />
                  {formatNumber(mod.favorites)}
                </span>
                <span
                  className="flex items-center gap-1 font-medium text-foreground"
                  title="Comments"
                >
                  <MessageSquare className="size-3.5" />
                  {formatNumber(mod.commentCount)}
                </span>
              </div>
            </button>
          </li>
        ))}
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
