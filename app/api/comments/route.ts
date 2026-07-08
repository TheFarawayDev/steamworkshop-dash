import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const STEAM_ID = "76561199121866975"

export type Comment = {
  id: string
  author: string
  authorUrl: string | null
  avatar: string | null
  text: string
  createdAt: number | null
  isOwner: boolean
}

function decodeEntities(str: string): string {
  return str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#034;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim()
}

function firstMatch(block: string, re: RegExp): string | null {
  const m = block.match(re)
  return m ? m[1] : null
}

function parseComments(htmlStr: string): Comment[] {
  if (!htmlStr) return []
  // Each comment block starts with class="commentthread_comment ..."
  const blocks = htmlStr.split(/class="commentthread_comment /).slice(1)
  const comments: Comment[] = []

  for (const block of blocks) {
    const id = firstMatch(block, /id="comment_(\d+)"/) ?? crypto.randomUUID()
    const authorRaw = firstMatch(block, /commentthread_author_link"[^>]*>([\s\S]*?)<\/a>/)
    const author = authorRaw ? decodeEntities(authorRaw) : "Unknown"
    const authorUrl = firstMatch(block, /commentthread_author_link"\s+href="([^"]+)"/)
    const avatar = firstMatch(block, /commentthread_comment_avatar[\s\S]*?<img[^>]*src="([^"]+)"/)
    const tsRaw = firstMatch(block, /data-timestamp="(\d+)"/)
    const textRaw = firstMatch(block, /commentthread_comment_text[^>]*>([\s\S]*?)<\/div>/)

    comments.push({
      id,
      author,
      authorUrl,
      avatar,
      text: textRaw ? decodeEntities(textRaw) : "",
      createdAt: tsRaw ? Number(tsRaw) : null,
      isOwner: authorUrl?.includes("TheFarawayDev") ?? false,
    })
  }

  return comments
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Missing or invalid mod id." }, { status: 400 })
  }

  const owner = searchParams.get("owner") || STEAM_ID

  const res = await fetch(
    `https://steamcommunity.com/comment/PublishedFile_Public/render/${owner}/${id}/?count=1000`,
    { cache: "no-store" },
  )
  if (!res.ok) {
    return NextResponse.json({ error: `Failed to load comments (${res.status}).` }, { status: 502 })
  }

  const data = (await res.json()) as {
    success?: boolean
    total_count?: number
    comments_html?: string
  }

  const comments = parseComments(data.comments_html ?? "")
  // Newest first.
  comments.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  return NextResponse.json({ total: data.total_count ?? comments.length, comments })
}
