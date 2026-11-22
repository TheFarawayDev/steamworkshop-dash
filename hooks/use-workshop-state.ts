"use client"

import { useCallback } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { Mod } from "@/lib/types"

/** What the user had seen of a mod the last time they opened it. */
export type SeenEntry = { updatedAt: number; commentCount: number; seenAt?: number }
export type SeenMap = Record<string, SeenEntry>

// Keys kept compatible with earlier versions of the dashboard.
export const WATCHED_KEY = "steam-dashboard-watched-mods"
const SEEN_KEY = "steam-dashboard-seen"

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string")
const isObject = (v: unknown): v is SeenMap => !!v && typeof v === "object" && !Array.isArray(v)

export type ModStatus = {
  isNew: boolean
  isUpdated: boolean
  newComments: number
}

export function getStatus(mod: Mod, seen: SeenEntry | undefined): ModStatus {
  if (!seen) return { isNew: true, isUpdated: false, newComments: 0 }
  return {
    isNew: false,
    isUpdated: (mod.updatedAt ?? 0) > seen.updatedAt,
    newComments: Math.max(0, mod.commentCount - seen.commentCount),
  }
}

export function hasActivity(s: ModStatus) {
  return s.isNew || s.isUpdated || s.newComments > 0
}

const now = () => Math.floor(Date.now() / 1000)

export function useWatched() {
  const [watched, setWatched, hydrated] = useLocalStorage<string[]>(WATCHED_KEY, [], isStringArray)

  const toggle = useCallback(
    (id: string) => setWatched((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setWatched],
  )
  const add = useCallback(
    (id: string) => setWatched((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setWatched],
  )

  return { watched, toggle, add, hydrated }
}

export function useSeen() {
  const [seen, setSeen, hydrated] = useLocalStorage<SeenMap>(SEEN_KEY, {}, isObject)

  const markSeen = useCallback(
    (mods: Mod[]) =>
      setSeen((prev) => {
        const next = { ...prev }
        const t = now()
        for (const m of mods) next[m.id] = { updatedAt: m.updatedAt ?? 0, commentCount: m.commentCount, seenAt: t }
        return next
      }),
    [setSeen],
  )

  return { seen, markSeen, hydrated }
}
