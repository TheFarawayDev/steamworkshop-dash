import { NextResponse } from "next/server"
import { OWNER_STEAM_ID, OWNER_VANITY } from "@/lib/config"
import { errorResponse } from "@/lib/api"
import { parseComments } from "@/lib/comments"
import { isWorkshopId } from "@/lib/steam"
import type { CommentsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const owner = searchParams.get("owner") || OWNER_STEAM_ID

  if (!isWorkshopId(id)) {
    return NextResponse.json({ error: "Missing or invalid mod id." }, { status: 400 })
  }
  if (!/^\d{17}$/.test(owner)) {
    return NextResponse.json({ error: "Invalid owner id." }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://steamcommunity.com/comment/PublishedFile_Public/render/${owner}/${id}/?start=0&count=500`,
      { cache: "no-store", signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to load comments (${res.status}).` }, { status: 502 })
    }

    const data = (await res.json()) as { total_count?: number; comments_html?: string }
    const comments = parseComments(data.comments_html ?? "", {
      steamId: OWNER_STEAM_ID,
      vanity: OWNER_VANITY,
    }).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

    const body: CommentsResponse = { total: data.total_count ?? comments.length, comments }
    return NextResponse.json(body)
  } catch (err) {
    return errorResponse(err, "api/comments")
  }
}
