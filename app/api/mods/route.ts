import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TheFarawayDev — the only profile this app scans.
const STEAM_ID = "76561199121866975"

type SteamVoteData = { score?: number; votes_up?: number; votes_down?: number }

type SteamPublishedFile = {
  publishedfileid: string
  title?: string
  short_description?: string
  app_name?: string
  consumer_appid?: number
  creator?: string
  time_created?: number
  time_updated?: number
  views?: number
  subscriptions?: number
  lifetime_subscriptions?: number
  favorited?: number
  followers?: number
  num_comments_public?: number
  preview_url?: string
  file_size?: string | number
  tags?: { tag?: string; display_name?: string }[]
  vote_data?: SteamVoteData
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
  description: string
  game: string
  creatorId?: string
  createdAt: number | null
  updatedAt: number | null
  views: number
  subscriptions: number
  lifetimeSubscriptions: number
  favorites: number
  followers: number
  commentCount: number
  votesUp: number
  votesDown: number
  score: number
  tags: string[]
  url: string
  previewUrl: string | null
  fileSize: number
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
    url.searchParams.set("appid", "0") // 0 = across all games
    url.searchParams.set("return_metadata", "true")
    url.searchParams.set("return_short_description", "true")
    url.searchParams.set("return_vote_data", "true")

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

  const mods: Mod[] = raw.map((item) => ({
    id: item.publishedfileid,
    title: item.title?.trim() || "Untitled",
    description: item.short_description?.trim() || "",
    game: item.app_name?.trim() || (item.consumer_appid ? `App ${item.consumer_appid}` : "Unknown"),
    creatorId: item.creator || STEAM_ID,
    createdAt: item.time_created ?? null,
    updatedAt: item.time_updated ?? null,
    views: item.views ?? 0,
    subscriptions: item.subscriptions ?? 0,
    lifetimeSubscriptions: item.lifetime_subscriptions ?? 0,
    favorites: item.favorited ?? 0,
    followers: item.followers ?? 0,
    commentCount: item.num_comments_public ?? 0,
    votesUp: item.vote_data?.votes_up ?? 0,
    votesDown: item.vote_data?.votes_down ?? 0,
    score: item.vote_data?.score ?? 0,
    tags: (item.tags ?? []).map((t) => t.display_name || t.tag || "").filter(Boolean),
    url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
    previewUrl: item.preview_url ?? null,
    fileSize: Number(item.file_size) || 0,
  }))

  mods.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  const games = Array.from(new Set(mods.map((m) => m.game))).sort((a, b) => a.localeCompare(b))

  const totals = {
    mods: mods.length,
    subscriptions: mods.reduce((s, m) => s + m.subscriptions, 0),
    lifetimeSubscriptions: mods.reduce((s, m) => s + m.lifetimeSubscriptions, 0),
    favorites: mods.reduce((s, m) => s + m.favorites, 0),
    views: mods.reduce((s, m) => s + m.views, 0),
    comments: mods.reduce((s, m) => s + m.commentCount, 0),
  }

  return NextResponse.json({ steamId: STEAM_ID, count: mods.length, games, totals, mods })
}
