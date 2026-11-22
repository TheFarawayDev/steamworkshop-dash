"use client"

import { useState } from "react"
import { Plus, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { parseWorkshopId } from "@/lib/mods"
import { cn } from "@/lib/utils"

export function Tab({
  active,
  onClick,
  children,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
    >
      {icon}
      {children}
      {count != null && <span className={cn("tabular-nums text-xs", active ? "opacity-70" : "opacity-60")}>{count}</span>}
    </button>
  )
}

export function WatchForm({ onAdd, existing }: { onAdd: (id: string) => void; existing: string[] }) {
  const [value, setValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const id = parseWorkshopId(value)
    if (!id) return setMessage("Paste a Workshop link (…/filedetails/?id=123) or a numeric id.")
    if (existing.includes(id)) return setMessage("You're already watching that mod.")
    onAdd(id)
    setValue("")
    setMessage(null)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-dashed bg-card/50 p-4">
      <label htmlFor="watch-input" className="text-sm font-medium">
        Watch any Workshop item
      </label>
      <p className="text-xs text-muted-foreground">
        Track updates and comments on mods you don&apos;t own. Watched mods are included in update alerts.
      </p>
      <div className="flex gap-2">
        <Input
          id="watch-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setMessage(null)
          }}
          placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=…"
          className="h-9"
          aria-invalid={!!message}
          aria-describedby={message ? "watch-msg" : undefined}
        />
        <Button type="submit" size="lg" disabled={!value.trim()}>
          <Plus /> Watch
        </Button>
      </div>
      {message && (
        <p id="watch-msg" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </form>
  )
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading mods">
      <Skeleton className="h-[92px] w-full rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
      <Icon className="size-7 text-muted-foreground/60" />
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

