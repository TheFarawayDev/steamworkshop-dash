import type { Mod, Totals } from "@/lib/types"

export function computeTotals(mods: Mod[]): Totals {
  return mods.reduce<Totals>(
    (t, m) => ({
      mods: t.mods + 1,
      subscriptions: t.subscriptions + m.subscriptions,
      lifetimeSubscriptions: t.lifetimeSubscriptions + m.lifetimeSubscriptions,
      favorites: t.favorites + m.favorites,
      views: t.views + m.views,
      comments: t.comments + m.commentCount,
    }),
    { mods: 0, subscriptions: 0, lifetimeSubscriptions: 0, favorites: 0, views: 0, comments: 0 },
  )
}

/** Share of up-votes, or null when nobody has voted. */
export function approval(mod: Pick<Mod, "votesUp" | "votesDown">): number | null {
  const total = mod.votesUp + mod.votesDown
  return total > 0 ? mod.votesUp / total : null
}

/** Pulls a Workshop id out of a pasted URL or bare id. */
export function parseWorkshopId(input: string): string | null {
  const s = input.trim()
  if (/^\d{1,20}$/.test(s)) return s
  const m = s.match(/[?&]id=(\d{1,20})/)
  return m ? m[1] : null
}

export type SortKey =
  | "updated-desc"
  | "created-desc"
  | "created-asc"
  | "subs-desc"
  | "favorites-desc"
  | "comments-desc"
  | "rating-desc"
  | "title-asc"

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "updated-desc", label: "Recently updated" },
  { value: "created-desc", label: "Newest" },
  { value: "created-asc", label: "Oldest" },
  { value: "subs-desc", label: "Most subscribers" },
  { value: "favorites-desc", label: "Most favorited" },
  { value: "comments-desc", label: "Most comments" },
  { value: "rating-desc", label: "Highest rated" },
  { value: "title-asc", label: "Title A–Z" },
]

const comparators: Record<SortKey, (a: Mod, b: Mod) => number> = {
  "updated-desc": (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  "created-desc": (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  "created-asc": (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  "subs-desc": (a, b) => b.subscriptions - a.subscriptions,
  "favorites-desc": (a, b) => b.favorites - a.favorites,
  "comments-desc": (a, b) => b.commentCount - a.commentCount,
  "rating-desc": (a, b) => (approval(b) ?? -1) - (approval(a) ?? -1) || b.votesUp - a.votesUp,
  "title-asc": (a, b) => a.title.localeCompare(b.title),
}

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && v in comparators
}

export function sortMods(mods: Mod[], key: SortKey): Mod[] {
  return [...mods].sort(comparators[key] ?? comparators["updated-desc"])
}
