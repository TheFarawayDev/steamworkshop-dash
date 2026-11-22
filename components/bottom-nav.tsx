"use client"

import { BarChart3, Bookmark, Package, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export type NavKey = "mods" | "watched" | "insights" | "search"

const ITEMS: { key: NavKey; label: string; icon: typeof Package }[] = [
  { key: "mods", label: "Mods", icon: Package },
  { key: "watched", label: "Watched", icon: Bookmark },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "search", label: "Search", icon: Search },
]

/** Phone-only tab bar, thumb-reachable and clear of the home indicator. */
export function BottomNav({ active, onSelect, badges }: { active: NavKey; onSelect: (key: NavKey) => void; badges?: Partial<Record<NavKey, number>> }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const on = active === key
          const badge = badges?.[key]
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(key)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex size-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
                  on ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("relative flex h-7 w-14 items-center justify-center rounded-full transition-colors", on && "bg-primary/15")}>
                  <Icon className={cn("size-5", on && key === "watched" && "fill-current")} />
                  {!!badge && (
                    <span className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-chatter px-1 text-[10px] font-semibold text-background tabular-nums">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
