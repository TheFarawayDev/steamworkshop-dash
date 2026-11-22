"use client"

import {
  Bookmark,
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Eye,
  FileArchive,
  Heart,
  MessageSquare,
  MessageSquarePlus,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ModComments } from "@/components/mod-comments"
import { ModStatusPills } from "@/components/mod-status"
import { ModThumb } from "@/components/mod-thumb"
import type { ModStatus } from "@/hooks/use-workshop-state"
import { approval } from "@/lib/mods"
import { formatBytes, formatDate, formatFullNumber, formatNumber, formatPercent, formatRelative } from "@/lib/format"
import type { Mod } from "@/lib/types"
import { cn } from "@/lib/utils"

function Stat({ icon: Icon, label, value, title }: { icon: typeof Users; label: string; value: string; title?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-3" title={title}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function Rating({ mod }: { mod: Mod }) {
  const ratio = approval(mod)
  const total = mod.votesUp + mod.votesDown
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">Approval</span>
        <span className="text-sm font-semibold tabular-nums">{formatPercent(ratio)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={ratio == null ? undefined : Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Approval">
        <div className="h-full rounded-full bg-updated" style={{ width: `${(ratio ?? 0) * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          <ThumbsUp className="size-3.5" /> {formatFullNumber(mod.votesUp)}
        </span>
        <span>{total ? `${formatFullNumber(total)} votes` : "No votes yet"}</span>
        <span className="flex items-center gap-1">
          {formatFullNumber(mod.votesDown)} <ThumbsDown className="size-3.5" />
        </span>
      </div>
    </div>
  )
}

export function ModDetailSheet({
  mod,
  open,
  onOpenChange,
  status,
  newCommentsSince,
  isWatched,
  onToggleWatch,
}: {
  mod: Mod | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Status as it was before the sheet opened (opening marks the mod as seen). */
  status?: ModStatus
  newCommentsSince?: number
  isWatched: boolean
  onToggleWatch: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {mod && (
          <>
            <div className="relative">
              <ModThumb src={mod.previewUrl} className="aspect-video w-full" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-popover to-transparent" />
            </div>

            <div className="-mt-6 flex flex-col gap-4 px-5 pb-5 sm:px-6">
              <div className="relative flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{mod.game}</span>
                  {status && <ModStatusPills status={status} />}
                </div>
                <SheetTitle className="text-xl font-semibold leading-snug text-balance sm:text-2xl">{mod.title}</SheetTitle>
                <SheetDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                  <span className="flex items-center gap-1">
                    <CalendarPlus className="size-3.5" /> Posted {formatDate(mod.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3.5" /> Updated {formatDate(mod.updatedAt)} · {formatRelative(mod.updatedAt)}
                  </span>
                </SheetDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={mod.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "px-3.5")}>
                  Open on Steam <ExternalLink />
                </a>
                <Button variant={isWatched ? "secondary" : "outline"} size="lg" onClick={onToggleWatch} aria-pressed={isWatched} className={cn("px-3.5", isWatched && "text-primary")}>
                  <Bookmark className={cn(isWatched && "fill-current")} />
                  {isWatched ? "Watching" : "Watch"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
                <Stat icon={Users} label="Subscribers" value={formatNumber(mod.subscriptions)} title={formatFullNumber(mod.subscriptions)} />
                <Stat icon={TrendingUp} label="Lifetime subs" value={formatNumber(mod.lifetimeSubscriptions)} title={formatFullNumber(mod.lifetimeSubscriptions)} />
                <Stat icon={Heart} label="Favorites" value={formatNumber(mod.favorites)} title={formatFullNumber(mod.favorites)} />
                <Stat icon={UserPlus} label="Followers" value={formatNumber(mod.followers)} title={formatFullNumber(mod.followers)} />
                <Stat icon={Eye} label="Views" value={formatNumber(mod.views)} title={formatFullNumber(mod.views)} />
                <Stat icon={FileArchive} label="File size" value={formatBytes(mod.fileSize)} />
              </div>

              <Rating mod={mod} />

              {mod.description && (
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{mod.description}</p>
              )}

              {mod.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                  {mod.tags.map((t) => (
                    <li key={t} className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <section className="flex flex-col border-t" aria-labelledby="comments-heading">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-popover/95 px-5 py-3 backdrop-blur sm:px-6">
                <h3 id="comments-heading" className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4" /> Comments
                  <span className="font-normal text-muted-foreground tabular-nums">{formatFullNumber(mod.commentCount)}</span>
                </h3>
                <a href={`${mod.url}#commentthread_PublishedFile_Public_${mod.creatorId}_${mod.id}_area`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mr-9")}>
                  <MessageSquarePlus /> Reply on Steam
                </a>
              </div>
              <div className="pb-[env(safe-area-inset-bottom)] sm:px-2">
                <ModComments modId={mod.id} ownerId={mod.creatorId || undefined} newSince={newCommentsSince} />
              </div>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
