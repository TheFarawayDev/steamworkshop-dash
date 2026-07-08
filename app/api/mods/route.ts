import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TheFarawayDev — the only profile this app scans.
const STEAM_ID = "76561199121866975"

type SteamPublishedFile = {
  publishedfileid: string
  title?: string
  app_name?: string
  consumer_appid?: number
  time_created?: number
  time_updated?: number
  views?: number
  subscriptions?: number
  favorited?: number
  preview_url?: string
}

type SteamResponse = {
  response?: {
    total?: number
    publishedfiledetails?: SteamPublishedFile[]
  }
}

export type Mod = {
  id: string
  title: string
  game: string
  createdAt: number | null
  updatedAt: number | null
  views: number
  subscriptions: number
  favorites: number
  commentCount: number
  url: string
  previewUrl: string | null
}

// Fetch just the comment total for a single workshop item (count=1 is enough).
async function fetchCommentCount(publishedFileId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://steamcommunity.com/comment/PublishedFile_Public/render/${STEAM_ID}/${publishedFileId}/?count=1`,
      { cache: "no-store" },
    )
    if (!res.ok) return 0
    const data = (await res.json()) as { success?: boolean; total_count?: number }
    return data.total_count ?? 0
  } catch {
    return 0
  }
}

export async function GET() {
  const key = process.env.STEAM_API_KEY
  if (!key) {
    return NextResponse.json({ error: "STEAM_API_KEY is not configured." }, { status: 500 })
  }

  const raw: SteamPublishedFile[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = new URL("https://api.steampowered.com/IPublishedFileService/GetUserFiles/v1/")
    url.searchParams.set("key", key)
    url.searchParams.set("steamid", STEAM_ID)
    url.searchParams.set("numperpage", String(perPage))
    url.searchParams.set("page", String(page))
    url.searchParams.set("return_metadata", "true")
    url.searchParams.set("appid", "0") // 0 = across all games

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Steam API request failed (${res.status}).` },
        { status: 502 },
      )
    }

    const data = (await res.json()) as SteamResponse
    const details = data.response?.publishedfiledetails ?? []
    if (details.length === 0) break
    raw.push(...details)

    const total = data.response?.total ?? raw.length
    if (raw.length >= total || details.length < perPage) break
    page += 1
    if (page > 50) break
  }

  // Fetch comment counts for every mod in parallel.
  const counts = await Promise.all(raw.map((item) => fetchCommentCount(item.publishedfileid)))

  const mods: Mod[] = raw.map((item, i) => ({
    id: item.publishedfileid,
    title: item.title?.trim() || "Untitled",
    game: item.app_name?.trim() || (item.consumer_appid ? `App ${item.consumer_appid}` : "Unknown"),
    createdAt: item.time_created ?? null,
    updatedAt: item.time_updated ?? null,
    views: item.views ?? 0,
    subscriptions: item.subscriptions ?? 0,
    favorites: item.favorited ?? 0,
    commentCount: counts[i],
    url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
    previewUrl: item.preview_url ?? null,
  }))

  mods.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  const games = Array.from(new Set(mods.map((m) => m.game))).sort((a, b) => a.localeCompare(b))

  return NextResponse.json({ steamId: STEAM_ID, count: mods.length, games, mods })
}
