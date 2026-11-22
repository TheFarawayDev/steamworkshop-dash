const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const full = new Intl.NumberFormat("en")

export function formatNumber(n: number): string {
  return n < 10_000 ? full.format(n) : compact.format(n)
}

export function formatFullNumber(n: number): string {
  return full.format(n)
}

export function formatDate(unix: number | null): string {
  if (!unix) return "—"
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(unix: number | null): string {
  if (!unix) return "—"
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatRelative(unix: number | null, now = Date.now()): string {
  if (!unix) return ""
  const sec = Math.max(0, Math.round((now - unix * 1000) / 1000))
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${parseFloat((bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1))} ${units[i]}`
}

export function formatPercent(ratio: number | null): string {
  return ratio == null ? "—" : `${Math.round(ratio * 100)}%`
}
