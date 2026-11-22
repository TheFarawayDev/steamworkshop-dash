/** Shared, client-safe types used by both API routes and UI. */

export type Mod = {
  id: string
  title: string
  description: string
  game: string
  appId: number | null
  creatorId: string
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

export type Totals = {
  mods: number
  subscriptions: number
  lifetimeSubscriptions: number
  favorites: number
  views: number
  comments: number
}

export type ModsResponse = {
  steamId: string
  count: number
  games: string[]
  totals: Totals
  mods: Mod[]
  fetchedAt: number
}

export type WatchedResponse = { mods: Mod[] }

export type Comment = {
  id: string
  author: string
  authorUrl: string | null
  avatar: string | null
  /** Plain text; Steam emoticons are encoded as `__EMOTICON__<url>__EMOTICON_END__`. */
  text: string
  createdAt: number | null
  isOwner: boolean
}

export type CommentsResponse = { total: number; start: number; comments: Comment[]; hasMore: boolean }

export type ApiError = { error: string }
