import "server-only"
import { NextResponse } from "next/server"
import { SteamError } from "@/lib/steam"

/** Uniform JSON error response for route handlers. */
export function errorResponse(err: unknown, context: string) {
  if (err instanceof SteamError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error(`[${context}]`, err)
  if (err instanceof Error && err.name === "TimeoutError") {
    return NextResponse.json({ error: "Steam took too long to respond." }, { status: 504 })
  }
  if (err instanceof TypeError && err.message === "fetch failed") {
    return NextResponse.json({ error: "Could not reach Steam." }, { status: 502 })
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 })
}
