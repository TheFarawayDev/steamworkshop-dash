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
      className={cn("grid grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-6", className)}
    >
      {TILES.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex min-w-0 flex-col gap-1 bg-card p-3 sm:gap-1.5 sm:p-4">
          <span className="flex items-center gap-1.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <span className="text-xl font-semibold tracking-tight sm:text-2xl" title={formatFullNumber(totals[key])}>
            {formatNumber(totals[key])}
          </span>
          {delta && since ? <Delta value={delta[key] ?? 0} since={since} /> : <span className="hidden h-4 sm:block" aria-hidden />}
        </div>
      ))}
    </section>
  )
}
