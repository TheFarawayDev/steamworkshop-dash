import "server-only"
import type { Mod } from "@/lib/types"

const API = "https://api.steampowered.com"
/** Steam caps `publishedfileids` per request; stay well under it. */
const DETAILS_CHUNK = 100
const USER_FILES_PAGE = 100
const MAX_PAGES = 50

type SteamPublishedFile = {
  publishedfileid: string
  result?: number
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
  vote_data?: { score?: number; votes_up?: number; votes_down?: number }
}

type SteamResponse = {
  response?: { total?: number; publishedfiledetails?: SteamPublishedFile[] }
}

export class SteamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message)
  }
}

function apiKey(): string {
  const key = process.env.STEAM_API_KEY
  if (!key) throw new SteamError("STEAM_API_KEY is not configured.", 500)
  return key
}

/** Seconds Steam responses are reused between requests (bypassed with `fresh`). */
export const STEAM_REVALIDATE = 120

export type FetchOptions = { fresh?: boolean }

async function steamGet(url: URL, { fresh }: FetchOptions = {}): Promise<SteamResponse> {
  const res = await fetch(url, {
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: STEAM_REVALIDATE, tags: ["steam"] } }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new SteamError(`Steam API request failed (${res.status}).`)
  return (await res.json()) as SteamResponse
}

function toMod(item: SteamPublishedFile, fallbackCreator = ""): Mod {
  const up = item.vote_data?.votes_up ?? 0
  const down = item.vote_data?.votes_down ?? 0
  return {
    id: item.publishedfileid,
    title: item.title?.trim() || "Untitled",
    description: item.short_description?.trim() || "",
    game: item.app_name?.trim() || (item.consumer_appid ? `App ${item.consumer_appid}` : "Unknown"),
    appId: item.consumer_appid ?? null,
    creatorId: item.creator || fallbackCreator,
    createdAt: item.time_created ?? null,
    updatedAt: item.time_updated ?? null,
    views: item.views ?? 0,
    subscriptions: item.subscriptions ?? 0,
    lifetimeSubscriptions: item.lifetime_subscriptions ?? 0,
    favorites: item.favorited ?? 0,
    followers: item.followers ?? 0,
    commentCount: item.num_comments_public ?? 0,
    votesUp: up,
    votesDown: down,
    score: item.vote_data?.score ?? 0,
    tags: (item.tags ?? []).map((t) => t.display_name || t.tag || "").filter(Boolean),
    url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
    previewUrl: item.preview_url || null,
    fileSize: Number(item.file_size) || 0,
  }
}

/** Every Workshop item published by `steamId`, across all games. */
export async function getUserMods(steamId: string, opts: FetchOptions = {}): Promise<Mod[]> {
  const key = apiKey()
  const raw: SteamPublishedFile[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${API}/IPublishedFileService/GetUserFiles/v1/`)
    url.searchParams.set("key", key)
    url.searchParams.set("steamid", steamId)
    url.searchParams.set("numperpage", String(USER_FILES_PAGE))
    url.searchParams.set("page", String(page))
    url.searchParams.set("appid", "0") // 0 = across all games
    url.searchParams.set("return_metadata", "true")
    url.searchParams.set("return_short_description", "true")
    url.searchParams.set("return_vote_data", "true")
    url.searchParams.set("return_tags", "true")

    const data = await steamGet(url, opts)
    const details = data.response?.publishedfiledetails ?? []
    raw.push(...details)

    const total = data.response?.total ?? raw.length
    if (details.length < USER_FILES_PAGE || raw.length >= total) break
  }

  return raw.map((item) => toMod(item, steamId))
}

/** Details for arbitrary Workshop item ids (unknown/removed ids are dropped). */
export async function getModsById(ids: string[], opts: FetchOptions = {}): Promise<Mod[]> {
  const key = apiKey()
  const unique = Array.from(new Set(ids.filter(isWorkshopId)))
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += DETAILS_CHUNK) chunks.push(unique.slice(i, i + DETAILS_CHUNK))

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const url = new URL(`${API}/IPublishedFileService/GetDetails/v1/`)
      url.searchParams.set("key", key)
      url.searchParams.set("includevotes", "true")
      url.searchParams.set("includemetadata", "true")
      url.searchParams.set("short_description", "true")
      url.searchParams.set("includetags", "true")
      chunk.forEach((id, i) => url.searchParams.set(`publishedfileids[${i}]`, id))
      const data = await steamGet(url, opts)
      return data.response?.publishedfiledetails ?? []
    }),
  )

  // result !== 1 means the item is missing, private or removed.
  return results
    .flat()
    .filter((item) => item.result === undefined || item.result === 1)
    .filter((item) => item.title !== undefined)
    .map((item) => toMod(item))
}

export function isWorkshopId(id: unknown): id is string {
  return typeof id === "string" && /^\d{1,20}$/.test(id)
}
