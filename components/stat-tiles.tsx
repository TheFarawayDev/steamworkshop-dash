import type { LucideIcon } from "lucide-react"
import { Eye, Heart, MessageSquare, Package, TrendingUp, Users } from "lucide-react"
import { formatFullNumber, formatNumber } from "@/lib/format"
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

export function StatTiles({ totals, scope, className }: { totals: Totals; scope: string; className?: string }) {
  return (
    <section aria-label={`Totals for ${scope}`} className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3 lg:grid-cols-6", className)}>
      {TILES.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex flex-col gap-2 bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Icon className="size-3.5" />
            {label}
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums" title={formatFullNumber(totals[key])}>
            {formatNumber(totals[key])}
          </span>
        </div>
      ))}
    </section>
  )
}
