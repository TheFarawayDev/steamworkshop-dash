import { NextResponse } from "next/server"
import { OWNER_STEAM_ID, OWNER_VANITY } from "@/lib/config"
import { errorResponse } from "@/lib/api"
import { parseComments } from "@/lib/comments"
import { isWorkshopId } from "@/lib/steam"
import type { CommentsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

const COMMENTS_PAGE = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const owner = searchParams.get("owner") || OWNER_STEAM_ID
  const start = Math.max(0, Number(searchParams.get("start")) || 0)
  const count = Math.min(100, Math.max(1, Number(searchParams.get("count")) || COMMENTS_PAGE))

  if (!isWorkshopId(id)) {
    return NextResponse.json({ error: "Missing or invalid mod id." }, { status: 400 })
  }
  if (!/^\d{17}$/.test(owner)) {
    return NextResponse.json({ error: "Invalid owner id." }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://steamcommunity.com/comment/PublishedFile_Public/render/${owner}/${id}/?start=${start}&count=${count}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to load comments (${res.status}).` }, { status: 502 })
    }

    const data = (await res.json()) as { total_count?: number; comments_html?: string }
    const comments = parseComments(data.comments_html ?? "", {
      steamId: OWNER_STEAM_ID,
      vanity: OWNER_VANITY,
    })

    const total = data.total_count ?? start + comments.length
    const body: CommentsResponse = { total, start, comments, hasMore: start + comments.length < total }
    return NextResponse.json(body)
  } catch (err) {
    return errorResponse(err, "api/comments")
  }
}
