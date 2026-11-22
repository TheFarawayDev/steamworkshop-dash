import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api"
import { getModsById, isWorkshopId } from "@/lib/steam"
import type { WatchedResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

const MAX_IDS = 200

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fresh = searchParams.has("fresh")
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isWorkshopId)

  if (ids.length === 0) return NextResponse.json({ mods: [] } satisfies WatchedResponse)
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Too many ids (max ${MAX_IDS}).` }, { status: 400 })
  }

  try {
    const mods = await getModsById(ids, { fresh })
    return NextResponse.json({ mods } satisfies WatchedResponse)
  } catch (err) {
    return errorResponse(err, "api/mods/watched")
  }
}
