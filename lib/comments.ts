import "server-only"
import type { Comment } from "@/lib/types"

const EMOTICON_HOSTS = /^https:\/\/(?:[a-z0-9-]+\.)*(?:steamstatic\.com|steamcommunity\.com|steampowered\.com)\//i

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** Converts a fragment of Steam comment HTML to plain text, keeping emoticons as markers. */
function htmlToText(html: string): string {
  const withEmoticons = html.replace(/<img[^>]*>/gi, (tag) => {
    const src = tag.match(/src="([^"]+)"/i)?.[1]
    if (src && /emoticon/i.test(tag) && EMOTICON_HOSTS.test(src)) {
      return `__EMOTICON__${src}__EMOTICON_END__`
    }
    return ""
  })

  return decodeEntities(
    withEmoticons
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

function firstMatch(block: string, re: RegExp): string | null {
  return block.match(re)?.[1] ?? null
}

export function parseComments(html: string, owner: { steamId: string; vanity: string }): Comment[] {
  if (!html) return []
  const blocks = html.split(/class="commentthread_comment /).slice(1)

  return blocks.map((block, index) => {
    const authorUrl = firstMatch(block, /commentthread_author_link"\s+href="([^"]+)"/)
    const authorRaw = firstMatch(block, /commentthread_author_link"[^>]*>([\s\S]*?)<\/a>/)
    const avatar = firstMatch(block, /commentthread_comment_avatar[\s\S]*?<img[^>]*src="([^"]+)"/)
    const ts = firstMatch(block, /data-timestamp="(\d+)"/)
    const textRaw = firstMatch(block, /commentthread_comment_text[^>]*>([\s\S]*?)<\/div>/)

    const isOwner =
      !!authorUrl &&
      (authorUrl.includes(`/profiles/${owner.steamId}`) ||
        authorUrl.toLowerCase().includes(`/id/${owner.vanity.toLowerCase()}`))

    return {
      id: firstMatch(block, /id="comment_(\d+)"/) ?? `idx-${index}`,
      author: authorRaw ? htmlToText(authorRaw) || "Unknown" : "Unknown",
      authorUrl,
      avatar: avatar && /^https:\/\//.test(avatar) ? avatar : null,
      text: textRaw ? htmlToText(textRaw) : "",
      createdAt: ts ? Number(ts) : null,
      isOwner,
    }
  })
}
