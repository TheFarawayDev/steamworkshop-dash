import { NextResponse } from "next/server"
import type { Mod } from "../route"

export const dynamic = "force-dynamic"

type SteamVoteData = { score?: number; votes_up?: number; votes_down?: number }

type SteamPublishedFile = {
  publishedfileid: string
  title?: string
  short_description?: string
  app_name?: string
  consumer_appid?: number
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
    publishedfiledetails?: SteamPublishedFile[]
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get("ids")
  
  if (!idsParam) {
    return NextResponse.json({ mods: [] })
  }

  const ids = idsParam.split(",").filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ mods: [] })
  }

  const key = process.env.STEAM_API_KEY
  if (!key) {
    return NextResponse.json({ error: "STEAM_API_KEY is not configured." }, { status: 500 })
  }

  const url = new URL("https://api.steampowered.com/IPublishedFileService/GetDetails/v1/")
  url.searchParams.set("key", key)
  url.searchParams.set("return_metadata", "true")
  url.searchParams.set("return_short_description", "true")
  url.searchParams.set("return_vote_data", "true")
  
  // Add each ID to the query params
  ids.forEach((id, index) => {
    url.searchParams.append(`publishedfileids[${index}]`, id)
  })

  let res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) {
    // Fallback to ISteamRemoteStorage if GetDetails isn't supported for this endpoint
    const fallbackUrl = new URL("https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/")
    
    const formData = new URLSearchParams()
    formData.append("itemcount", String(ids.length))
    ids.forEach((id, index) => {
      formData.append(`publishedfileids[${index}]`, id)
    })

    res = await fetch(fallbackUrl.toString(), {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Steam API request failed.` }, { status: 502 })
    }
  }

  const data = (await res.json()) as SteamResponse
  const raw = data.response?.publishedfiledetails ?? []

  return NextResponse.json({ mods: mapRawToMods(raw) })
}

function mapRawToMods(raw: SteamPublishedFile[]): Mod[] {
  return raw.map((item) => ({
    id: item.publishedfileid,
    title: item.title?.trim() || "Untitled",
    description: item.short_description?.trim() || "",
    game: item.app_name?.trim() || (item.consumer_appid ? `App ${item.consumer_appid}` : "Unknown"),
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
}
