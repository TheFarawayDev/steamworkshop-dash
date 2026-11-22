import { NextResponse } from "next/server"
import { OWNER_STEAM_ID } from "@/lib/config"
import { errorResponse } from "@/lib/api"
import { computeTotals } from "@/lib/mods"
import { getUserMods } from "@/lib/steam"
import type { ModsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const mods = await getUserMods(OWNER_STEAM_ID)
    mods.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

    const body: ModsResponse = {
      steamId: OWNER_STEAM_ID,
      count: mods.length,
      games: Array.from(new Set(mods.map((m) => m.game))).sort((a, b) => a.localeCompare(b)),
      totals: computeTotals(mods),
      mods,
      fetchedAt: Date.now(),
    }
    return NextResponse.json(body)
  } catch (err) {
    return errorResponse(err, "api/mods")
  }
}
