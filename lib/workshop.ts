import "server-only"
import { OWNER_STEAM_ID } from "@/lib/config"
import { computeTotals } from "@/lib/mods"
import { getUserMods, type FetchOptions } from "@/lib/steam"
import type { ModsResponse } from "@/lib/types"

/** Everything the dashboard needs for the owner's profile. Shared by the page and /api/mods. */
export async function getWorkshop(opts: FetchOptions = {}): Promise<ModsResponse> {
  const mods = await getUserMods(OWNER_STEAM_ID, opts)
  mods.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  return {
    steamId: OWNER_STEAM_ID,
    count: mods.length,
    games: Array.from(new Set(mods.map((m) => m.game))).sort((a, b) => a.localeCompare(b)),
    totals: computeTotals(mods),
    mods,
    fetchedAt: Date.now(),
  }
}
