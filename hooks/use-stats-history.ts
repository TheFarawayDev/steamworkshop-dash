"use client"

import { useEffect, useMemo } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { Mod, Totals } from "@/lib/types"

/**
 * A daily, device-local snapshot of every mod's numbers. Steam's API only gives
 * current values, so this is what makes trends and "+N this week" possible.
 */
type Row = [subs: number, lifetime: number, favorites: number, views: number, comments: number]
type Day = { d: string; t: number; m: Record<string, Row> }
type History = { v: 1; days: Day[] }

const KEY = "stats-history"
const MAX_DAYS = 120
const EMPTY: History = { v: 1, days: [] }
const isHistory = (v: unknown): v is History => !!v && typeof v === "object" && Array.isArray((v as History).days)

const dayKey = (t: number) => new Date(t).toLocaleDateString("en-CA") // YYYY-MM-DD, local time
const toRow = (m: Mod): Row => [m.subscriptions, m.lifetimeSubscriptions, m.favorites, m.views, m.commentCount]

export type Metric = "subscriptions" | "lifetimeSubscriptions" | "favorites" | "views" | "comments"
const COL: Record<Metric, number> = { subscriptions: 0, lifetimeSubscriptions: 1, favorites: 2, views: 3, comments: 4 }

export type Point = { t: number; value: number }

export function useStatsHistory(mods: Mod[], windowDays = 7) {
  const [history, setHistory, hydrated] = useLocalStorage<History>(KEY, EMPTY, isHistory)

  // Record today's snapshot (replacing an earlier one from today).
  useEffect(() => {
    if (!hydrated || mods.length === 0) return
    const now = Date.now()
    const today = dayKey(now)
    setHistory((prev) => {
      const days = (isHistory(prev) ? prev.days : []).filter((d) => d.d !== today)
      const m: Record<string, Row> = {}
      for (const mod of mods) m[mod.id] = toRow(mod)
      return { v: 1, days: [...days, { d: today, t: now, m }].slice(-MAX_DAYS) }
    })
  }, [mods, hydrated, setHistory])

  const days = history.days
  const today = dayKey(Date.now())

  /** The snapshot to compare against: closest to `windowDays` ago, else the oldest before today. */
  const baseline = useMemo(() => {
    const past = days.filter((d) => d.d !== today)
    if (past.length === 0) return null
    const target = Date.now() - windowDays * 86_400_000
    return past.reduce((best, d) => (Math.abs(d.t - target) < Math.abs(best.t - target) ? d : best))
  }, [days, today, windowDays])

  return useMemo(() => {
    function modDelta(mod: Mod, metric: Metric = "subscriptions"): number | null {
      const row = baseline?.m[mod.id]
      if (!row) return null
      const current = toRow(mod)[COL[metric]]
      return current - row[COL[metric]]
    }

    function totalsDelta(scope: Mod[]): Partial<Record<keyof Totals, number>> | null {
      if (!baseline) return null
      const out: Partial<Record<keyof Totals, number>> = { mods: 0 }
      for (const metric of Object.keys(COL) as Metric[]) {
        let sum = 0
        for (const m of scope) sum += modDelta(m, metric) ?? 0
        out[metric] = sum
      }
      out.mods = scope.filter((m) => !baseline.m[m.id]).length
      return out
    }

    /** Daily totals of `metric` over the scope (mods missing on a day count as 0). */
    function series(scope: Mod[], metric: Metric = "subscriptions"): Point[] {
      const ids = scope.map((m) => m.id)
      return days.map((d) => ({
        t: d.t,
        value: ids.reduce((s, id) => s + (d.m[id]?.[COL[metric]] ?? 0), 0),
      }))
    }

    return { baseline, baselineAt: baseline?.t ?? null, days: days.length, modDelta, totalsDelta, series }
  }, [baseline, days])
}
