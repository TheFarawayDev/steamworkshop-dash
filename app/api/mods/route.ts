import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api"
import { getWorkshop } from "@/lib/workshop"

export const dynamic = "force-dynamic"

/** `?fresh=1` skips the short server cache (used by the Refresh button). */
export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.has("fresh")
  try {
    return NextResponse.json(await getWorkshop({ fresh }))
  } catch (err) {
    return errorResponse(err, "api/mods")
  }
}
