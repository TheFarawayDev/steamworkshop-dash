"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  CalendarPlus,
  CalendarClock,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModComments } from "@/components/mod-comments"
import { formatDate, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Mod } from "@/app/api/mods/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DEFAULT_GAME = "RimWorld"

type ModsResponse = {
  steamId: string
  count: number
  games: string[]
  mods: Mod[]
}

export function ModsDashboard() {
  const { data, error, isLoading } = useSWR<ModsResponse>("/api/mods", fetcher, {
    revalidateOnFocus: false,
  })

  const [game, setGame] = useState<string>(DEFAULT_GAME)
  const [expanded, setExpanded] = useState<string | null>(null)

  const games = data?.games ?? []
  // If RimWorld isn't present once data loads, fall back to "all".
  const effectiveGame = useMemo(() => {
    if (!data) return DEFAULT_GAME
    if (game === "all") return "all"
    return games.includes(game) ? game : "all"
  }, [data, game, games])

  const filtered = useMemo(() => {
    const mods = data?.mods ?? []
    if (effectiveGame === "all") return mods
    return mods.filter((m) => m.game === effectiveGame)
  }, [data, effectiveGame])

  const totalComments = useMemo(
    () => filtered.reduce((sum, m) => sum + m.commentCount, 0),
    [filtered],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your Workshop mods…
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={effectiveGame} onValueChange={setGame}>
            <SelectTrigger className="w-[200px]">
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
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground tabular-nums">
          <span>
            <span className="font-semibold text-foreground">{filtered.length}</span> mods
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            <span className="font-semibold text-foreground">{totalComments}</span> comments
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((mod) => {
          const isOpen = expanded === mod.id
          return (
            <li
              key={mod.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                {mod.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mod.previewUrl || "/placeholder.svg"}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={mod.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 font-medium leading-snug text-foreground text-pretty hover:text-primary"
                      >
                        {mod.title}
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </a>
                      <Badge variant="secondary" className="w-fit font-normal">
                        {mod.game}
                      </Badge>
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
                    <span className="flex items-center gap-1" title="Subscribers">
                      <Users className="size-3.5" />
                      {mod.subscriptions.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : mod.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors",
                    isOpen
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                  aria-expanded={isOpen}
                >
                  <MessageSquare className="size-4" />
                  {mod.commentCount}
                  <ChevronDown
                    className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border bg-muted/30">
                  <ModComments modId={mod.id} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No mods for this game.
        </div>
      )}
    </div>
  )
}
