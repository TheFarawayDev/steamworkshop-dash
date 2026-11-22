import type { LucideIcon } from "lucide-react"
import { Eye, Heart, MessageSquare, Package, TrendingUp, Users } from "lucide-react"
import { formatDate, formatFullNumber, formatNumber } from "@/lib/format"
import type { Totals } from "@/lib/types"
import { cn } from "@/lib/utils"

type Tile = { key: keyof Totals; label: string; icon: LucideIcon }

const TILES: Tile[] = [
  { key: "mods", label: "Published", icon: Package },
  { key: "subscriptions", label: "Subscribers", icon: Users },
  { key: "lifetimeSubscriptions", label: "Lifetime subs", icon: TrendingUp },
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "views", label: "Views", icon: Eye },
  { key: "comments", label: "Comments", icon: MessageSquare },
]

function Delta({ value, since }: { value: number; since: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const up = value > 0
  return (
    <span
      className={cn("text-xs font-medium tabular-nums", up ? "text-updated" : "text-destructive")}
      title={`${up ? "+" : ""}${formatFullNumber(value)} since ${formatDate(since / 1000)}`}
    >
      {up ? "▲" : "▼"} {formatNumber(Math.abs(value))}
    </span>
  )
}

export function StatTiles({
  totals,
  delta,
  since,
  scope,
  className,
}: {
  totals: Totals
  delta?: Partial<Record<keyof Totals, number>> | null
  since?: number | null
  scope: string
  className?: string
}) {
  return (
    <section
      aria-label={`Totals for ${scope}`}
      className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3 lg:grid-cols-6", className)}
    >
      {TILES.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex flex-col gap-1.5 bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Icon className="size-3.5" />
            {label}
          </span>
          <span className="text-2xl font-semibold tracking-tight" title={formatFullNumber(totals[key])}>
            {formatNumber(totals[key])}
          </span>
          {delta && since ? <Delta value={delta[key] ?? 0} since={since} /> : <span className="h-4" aria-hidden />}
        </div>
      ))}
    </section>
  )
}
