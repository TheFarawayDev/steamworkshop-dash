"use client"

import {
  ExternalLink,
  CalendarPlus,
  CalendarClock,
  Users,
  Eye,
  Star,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  MessageSquare,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ModComments } from "@/components/mod-comments"
import { formatDate, formatRelative, formatNumber } from "@/lib/format"
import type { Mod } from "@/app/api/mods/route"

type StatProps = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

function Stat({ icon: Icon, label, value }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function ModDetailSheet({
  mod,
  open,
  onOpenChange,
}: {
  mod: Mod | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {mod && (
          <>
            <SheetHeader className="space-y-0 p-0">
              {mod.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mod.previewUrl || "/placeholder.svg"}
                  alt=""
                  className="aspect-video w-full border-b border-border object-cover"
                />
              )}
              <div className="flex flex-col gap-3 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {mod.game}
                  </Badge>
                  {mod.tags.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="font-normal text-muted-foreground">
                      {t}
                    </Badge>
                  ))}
                </div>
                <SheetTitle className="text-balance text-xl leading-snug">
                  {mod.title}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span className="flex items-center gap-1">
                    <CalendarPlus className="size-3.5" />
                    Posted {formatDate(mod.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    Updated {formatDate(mod.updatedAt)} ({formatRelative(mod.updatedAt)})
                  </span>
                </div>
                <a
                  href={mod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Open on Steam
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-6 pb-8">
              {mod.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 text-pretty">
                  {mod.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat icon={Users} label="Subscribers" value={formatNumber(mod.subscriptions)} />
                <Stat icon={UserPlus} label="Followers" value={formatNumber(mod.followers)} />
                <Stat icon={Star} label="Favorites" value={formatNumber(mod.favorites)} />
                <Stat icon={Eye} label="Views" value={formatNumber(mod.views)} />
                <Stat icon={ThumbsUp} label="Upvotes" value={formatNumber(mod.votesUp)} />
                <Stat icon={ThumbsDown} label="Downvotes" value={formatNumber(mod.votesDown)} />
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="size-4" />
                  Comments
                  <span className="text-muted-foreground tabular-nums">({mod.commentCount})</span>
                </h3>
                <div className="-mx-2 overflow-hidden rounded-lg border border-border">
                  <ModComments modId={mod.id} />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
