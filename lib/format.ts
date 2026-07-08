export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return n.toLocaleString()
}

export function formatDate(unix: number | null): string {
  if (!unix) return "—"
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatRelative(unix: number | null): string {
  if (!unix) return ""
  const diffMs = Date.now() - unix * 1000
  const sec = Math.round(diffMs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const month = Math.round(day / 30)
  const year = Math.round(day / 365)

  if (sec < 60) return "just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 30) return `${day}d ago`
  if (month < 12) return `${month}mo ago`
  return `${year}y ago`
}
