"use client"

import { memo } from "react"
import { Bookmark, Eye, Heart, MessageSquare, ThumbsUp, Users } from "lucide-react"
import { ModStatusPills } from "@/components/mod-status"
import { ModThumb } from "@/components/mod-thumb"
import type { ModStatus } from "@/hooks/use-workshop-state"
import { steamImage } from "@/lib/images"
import { approval } from "@/lib/mods"
import { formatDate, formatNumber, formatPercent, formatRelative } from "@/lib/format"
import type { Mod } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  mod: Mod
  status: ModStatus
  watched: boolean
  foreign: boolean
  /** Subscriber change since the stats baseline, if known. */
  subsDelta?: number | null
  onOpen: (id: string) => void
  onToggleWatch: (id: string) => void
}

function SubsDelta({ value }: { value?: number | null }) {
  if (!value) return null
  return (
    <span className={cn("text-[11px] font-medium", value > 0 ? "text-updated" : "text-destructive")}>
      {value > 0 ? "+" : "−"}
      {formatNumber(Math.abs(value))}
    </span>
  )
}

function WatchButton({ watched, onToggle, className }: { watched: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={watched}
      aria-label={watched ? "Stop watching" : "Watch for updates"}
      title={watched ? "Watching — click to stop" : "Watch for updates"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2",
        watched ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Bookmark className={cn("size-4", watched && "fill-current")} />
    </button>
  )
}

function Metric({ icon: Icon, value, label, className }: { icon: typeof Users; value: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={label}>
      <Icon className="size-3.5 opacity-70" />
      <span className="tabular-nums">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

export const ModCard = memo(function ModCard({ mod, status, watched, foreign, subsDelta, onOpen, onToggleWatch }: Props) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30">
      <div className="relative aspect-[16/9] overflow-hidden">
        <ModThumb src={steamImage(mod.previewUrl, 640)} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <ModStatusPills status={status} className="[&>span]:bg-background/85 [&>span]:backdrop-blur" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 text-[15px] font-semibold leading-snug text-balance">
            <button type="button" onClick={() => onOpen(mod.id)} className="text-left after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
              {mod.title}
            </button>
          </h3>
          <WatchButton watched={watched} onToggle={() => onToggleWatch(mod.id)} className="relative z-10 -mr-1.5 -mt-1" />
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{mod.game}</span>
          {foreign && <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">Watched</span>}
          <span aria-hidden>·</span>
          <time dateTime={mod.updatedAt ? new Date(mod.updatedAt * 1000).toISOString() : undefined} title={`Updated ${formatDate(mod.updatedAt)}`}>
            Updated {formatRelative(mod.updatedAt)}
          </time>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Metric icon={Users} value={formatNumber(mod.subscriptions)} label="Subscribers" />
            <SubsDelta value={subsDelta} />
          </span>
          <Metric icon={Heart} value={formatNumber(mod.favorites)} label="Favorites" />
          <Metric icon={ThumbsUp} value={formatPercent(approval(mod))} label="Approval" />
          <Metric
            icon={MessageSquare}
            value={formatNumber(mod.commentCount)}
            label="Comments"
            className={cn(status.newComments > 0 && "font-semibold text-chatter")}
          />
        </div>
      </div>
    </article>
  )
})

export const ModRow = memo(function ModRow({ mod, status, watched, foreign, subsDelta, onOpen, onToggleWatch }: Props) {
  return (
    <article className="group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-4">
      <ModThumb src={steamImage(mod.previewUrl, 128, 128)} className="size-14 shrink-0 rounded-lg sm:size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold sm:text-[15px]">
            <button type="button" onClick={() => onOpen(mod.id)} className="text-left after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
              {mod.title}
            </button>
          </h3>
          <ModStatusPills status={status} className="hidden shrink-0 flex-nowrap sm:flex" />
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{mod.game}</span>
          {foreign && <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">Watched</span>}
          <span aria-hidden>·</span>
          <span title={formatDate(mod.updatedAt)}>Updated {formatRelative(mod.updatedAt)}</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Posted {formatDate(mod.createdAt)}</span>
        </p>
        <ModStatusPills status={status} className="sm:hidden" />
        <div className="flex gap-3 text-xs text-muted-foreground md:hidden">
          <Metric icon={Users} value={formatNumber(mod.subscriptions)} label="Subscribers" />
          <Metric icon={Heart} value={formatNumber(mod.favorites)} label="Favorites" />
          <Metric icon={MessageSquare} value={formatNumber(mod.commentCount)} label="Comments" className={cn(status.newComments > 0 && "font-semibold text-chatter")} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-5 text-xs text-muted-foreground md:flex">
        <span className="inline-flex w-24 items-center gap-1">
          <Metric icon={Users} value={formatNumber(mod.subscriptions)} label="Subscribers" />
          <SubsDelta value={subsDelta} />
        </span>
        <Metric icon={Heart} value={formatNumber(mod.favorites)} label="Favorites" className="w-14" />
        <Metric icon={Eye} value={formatNumber(mod.views)} label="Views" className="w-14" />
        <Metric icon={ThumbsUp} value={formatPercent(approval(mod))} label="Approval" className="w-12" />
        <Metric icon={MessageSquare} value={formatNumber(mod.commentCount)} label="Comments" className={cn("w-12", status.newComments > 0 && "font-semibold text-chatter")} />
      </div>
      <WatchButton watched={watched} onToggle={() => onToggleWatch(mod.id)} className="relative z-10 shrink-0" />
    </article>
  )
})
