import { approval } from "@/lib/mods"
import type { Mod } from "@/lib/types"

const iso = (unix: number | null) => (unix ? new Date(unix * 1000).toISOString() : "")

function csvCell(v: string | number): string {
  const s = String(v)
  // Quote when needed; prefix formula-looking text so spreadsheets don't execute it.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function modsToCsv(mods: Mod[]): string {
  const header = ["id", "title", "game", "posted", "updated", "subscribers", "lifetime_subscribers", "favorites", "followers", "views", "comments", "votes_up", "votes_down", "approval", "file_size_bytes", "tags", "url"]
  const rows = mods.map((m) => [
    m.id, m.title, m.game, iso(m.createdAt), iso(m.updatedAt), m.subscriptions, m.lifetimeSubscriptions, m.favorites,
    m.followers, m.views, m.commentCount, m.votesUp, m.votesDown, approval(m)?.toFixed(3) ?? "", m.fileSize, m.tags.join("; "), m.url,
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
}

export function downloadCsv(mods: Mod[], name: string) {
  const blob = new Blob(["﻿" + modsToCsv(mods)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
