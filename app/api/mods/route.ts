import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type SteamPublishedFile = {
  publishedfileid: string
  title?: string
  app_name?: string
  consumer_appid?: number
  time_created?: number
  time_updated?: number
  file_type?: number
  views?: number
  subscriptions?: number
  favorited?: number
  banned?: boolean
  visibility?: number
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
  url: string
  previewUrl: string | null
}

// Resolve a vanity URL (custom profile name) to a 64-bit steamid.
async function resolveSteamId(input: string, key: string): Promise<string | null> {
  const trimmed = input.trim()

  // Direct 17-digit steamid64
  if (/^\d{17}$/.test(trimmed)) return trimmed

  // Extract from a full profile URL if provided
  const idUrl = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (idUrl) return idUrl[1]

  let vanity = trimmed
  const vanityUrl = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/)
  if (vanityUrl) vanity = vanityUrl[1]

  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`,
    { cache: "no-store" },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { response?: { success?: number; steamid?: string } }
  if (data.response?.success === 1 && data.response.steamid) return data.response.steamid
  return null
}

export async function GET(request: Request) {
  const key = process.env.STEAM_API_KEY
  if (!key) {
    return NextResponse.json({ error: "STEAM_API_KEY is not configured." }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get("steamid")
  if (!rawId) {
    return NextResponse.json({ error: "Missing steamid parameter." }, { status: 400 })
  }

  const steamId = await resolveSteamId(rawId, key)
  if (!steamId) {
    return NextResponse.json(
      { error: "Could not resolve that Steam ID or profile name. Try your 17-digit SteamID64." },
      { status: 404 },
    )
  }

  const mods: Mod[] = []
  let page = 1
  const perPage = 100

  // Page through all published files for this user.
  while (true) {
    const url = new URL("https://api.steampowered.com/IPublishedFileService/GetUserFiles/v1/")
    url.searchParams.set("key", key)
    url.searchParams.set("steamid", steamId)
    url.searchParams.set("numperpage", String(perPage))
    url.searchParams.set("page", String(page))
    url.searchParams.set("return_metadata", "true")
    // appid 0 returns items across all games
    url.searchParams.set("appid", "0")

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Steam API request failed (${res.status}). The profile may be private.` },
        { status: 502 },
      )
    }

    const data = (await res.json()) as SteamResponse
    const details = data.response?.publishedfiledetails ?? []
    if (details.length === 0) break

    for (const item of details) {
      mods.push({
        id: item.publishedfileid,
        title: item.title?.trim() || "Untitled",
        game: item.app_name?.trim() || (item.consumer_appid ? `App ${item.consumer_appid}` : "Unknown"),
        createdAt: item.time_created ?? null,
        updatedAt: item.time_updated ?? null,
        views: item.views ?? 0,
        subscriptions: item.subscriptions ?? 0,
        favorites: item.favorited ?? 0,
        url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
        previewUrl: item.preview_url ?? null,
      })
    }

    const total = data.response?.total ?? mods.length
    if (mods.length >= total || details.length < perPage) break
    page += 1
    if (page > 50) break // safety cap
  }

  mods.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  return NextResponse.json({ steamId, count: mods.length, mods })
}
