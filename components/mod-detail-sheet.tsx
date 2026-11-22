"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bookmark,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronLeft,
  Copy,
  History,
  MonitorPlay,
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
  X,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ModComments } from "@/components/mod-comments"
import { ModStatusPills } from "@/components/mod-status"
import { ModThumb } from "@/components/mod-thumb"
import type { ModStatus } from "@/hooks/use-workshop-state"
import { steamImage } from "@/lib/images"
import { approval } from "@/lib/mods"
import { formatBytes, formatDate, formatFullNumber, formatNumber, formatPercent, formatRelative } from "@/lib/format"
import type { Mod } from "@/lib/types"
import { cn } from "@/lib/utils"

function Stat({ icon: Icon, label, value, title, delta }: { icon: typeof Users; label: string; value: string; title?: string; delta?: number | null }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-3" title={title}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold">{value}</span>
        {delta ? (
          <span className={cn("text-xs font-medium tabular-nums", delta > 0 ? "text-updated" : "text-destructive")}>
            {delta > 0 ? "+" : "−"}
            {formatNumber(Math.abs(delta))}
          </span>
        ) : null}
      </span>
    </div>
  )
}

const secondary = cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 flex-col gap-0.5 px-1 text-[11px] font-medium sm:h-9 sm:flex-row sm:gap-1.5 sm:text-sm [&_svg:not([class*='size-'])]:size-4")

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="lg"
      className={secondary}
      title="Copy or share the link"
      onClick={async () => {
        try {
          if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ url })
          else await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
    >
      {copied ? <Check className="text-updated" /> : <Copy />}
      {copied ? "Copied" : "Share"}
    </Button>
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

/**
 * Swipe right to dismiss (phones). Only engages for clearly horizontal drags so
 * vertical scrolling is unaffected; moves the panel directly for 60fps tracking.
 */
function useSwipeToClose(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  const drag = useRef<{ x: number; y: number; dx: number; t: number; decided: boolean; active: boolean } | null>(null)

  function end() {
    const d = drag.current
    const el = ref.current
    drag.current = null
    if (!d?.active || !el) return
    const velocity = d.dx / Math.max(1, Date.now() - d.t)
    el.style.transition = "transform 200ms cubic-bezier(0.2, 0, 0, 1)"
    if (d.dx > 110 || velocity > 0.6) {
      el.style.transform = "translateX(100%)"
      setTimeout(onClose, 160)
    } else {
      el.style.transform = ""
    }
  }

  return {
    onTouchEnd: end,
    onTouchCancel: end,
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0]
      drag.current = { x: t.clientX, y: t.clientY, dx: 0, t: Date.now(), decided: false, active: false }
    },
    onTouchMove(e: React.TouchEvent) {
      const d = drag.current
      const el = ref.current
      if (!d || !el) return
      const t = e.touches[0]
      const dx = t.clientX - d.x
      const dy = t.clientY - d.y
      if (!d.decided) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        d.decided = true
        d.active = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.4
      }
      if (!d.active) return
      d.dx = Math.max(0, dx)
      el.style.transition = "none"
      el.style.transform = `translateX(${d.dx}px)`
    },
  }
}

export function ModDetailSheet({
  mod,
  open,
  onOpenChange,
  status,
  newCommentsSince,
  isWatched,
  onToggleWatch,
  onTagClick,
  delta,
}: {
  mod: Mod | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Status as it was before the sheet opened (opening marks the mod as seen). */
  status?: ModStatus
  newCommentsSince?: number
  isWatched: boolean
  onToggleWatch: () => void
  onTagClick?: (tag: string) => void
  /** Changes since the stats baseline. */
  delta?: { subscriptions?: number | null; favorites?: number | null; views?: number | null; since?: number | null }
}) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const swipe = useSwipeToClose(popupRef, () => onOpenChange(false))

  useEffect(() => {
    if (open) setScrolled(false)
  }, [open, mod?.id])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={popupRef}
        side="right"
        showCloseButton={false}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 160)}
        {...swipe}
        className="touch-pan-y gap-0 overflow-y-auto overscroll-contain p-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-xl data-[side=right]:sm:border-l"
      >
        {mod && (
          <>
            {/* Top bar: back on phones, close on larger screens; turns solid once the hero scrolls away. */}
            <div
              className={cn(
                "sticky top-0 z-20 -mb-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] transition-colors",
                scrolled ? "border-b bg-popover/90 backdrop-blur-xl" : "bg-transparent",
              )}
            >
              <div className="flex h-14 items-center gap-2 px-2 sm:px-3">
                <SheetClose
                  render={
                    <Button
                      variant="ghost"
                      className={cn("h-10 gap-0.5 rounded-full pl-1.5 pr-3 sm:hidden", !scrolled && "bg-popover/75 shadow-sm backdrop-blur")}
                    />
                  }
                >
                  <ChevronLeft className="size-5" /> Back
                </SheetClose>
                <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold transition-opacity", scrolled ? "opacity-100" : "opacity-0")} aria-hidden>
                  {mod.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleWatch}
                  aria-pressed={isWatched}
                  aria-label={isWatched ? "Stop watching" : "Watch"}
                  className={cn("size-10 rounded-full sm:hidden", !scrolled && "bg-popover/75 shadow-sm backdrop-blur", isWatched && "text-primary")}
                >
                  <Bookmark className={cn("size-5", isWatched && "fill-current")} />
                </Button>
                <SheetClose
                  render={
                    <Button variant="ghost" size="icon" aria-label="Close" className={cn("hidden rounded-full sm:inline-flex", !scrolled && "bg-popover/75 shadow-sm backdrop-blur")} />
                  }
                >
                  <X />
                </SheetClose>
              </div>
            </div>

            <div className="relative">
              <ModThumb src={steamImage(mod.previewUrl, 1280)} className="aspect-video w-full" />
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

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <a href={mod.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "h-11 px-3.5 sm:h-9")}>
                    Open on Steam <ExternalLink />
                  </a>
                  <Button
                    variant={isWatched ? "secondary" : "outline"}
                    size="lg"
                    onClick={onToggleWatch}
                    aria-pressed={isWatched}
                    className={cn("h-11 px-3.5 sm:h-9", isWatched && "text-primary")}
                  >
                    <Bookmark className={cn(isWatched && "fill-current")} />
                    {isWatched ? "Watching" : "Watch"}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <a href={`steam://url/CommunityFilePage/${mod.id}`} className={secondary} title="Open in the Steam app">
                    <MonitorPlay /> Steam app
                  </a>
                  <a
                    href={`https://steamcommunity.com/sharedfiles/filedetails/changelog/${mod.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={secondary}
                    title="Change notes"
                  >
                    <History /> Changes
                  </a>
                  <CopyLink url={mod.url} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
                <Stat icon={Users} label="Subscribers" value={formatNumber(mod.subscriptions)} title={formatFullNumber(mod.subscriptions)} delta={delta?.subscriptions} />
                <Stat icon={TrendingUp} label="Lifetime subs" value={formatNumber(mod.lifetimeSubscriptions)} title={formatFullNumber(mod.lifetimeSubscriptions)} />
                <Stat icon={Heart} label="Favorites" value={formatNumber(mod.favorites)} title={formatFullNumber(mod.favorites)} delta={delta?.favorites} />
                <Stat icon={UserPlus} label="Followers" value={formatNumber(mod.followers)} title={formatFullNumber(mod.followers)} />
                <Stat icon={Eye} label="Views" value={formatNumber(mod.views)} title={formatFullNumber(mod.views)} delta={delta?.views} />
                <Stat icon={FileArchive} label="File size" value={formatBytes(mod.fileSize)} />
              </div>

              <Rating mod={mod} />

              {mod.description && (
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{mod.description}</p>
              )}

              {mod.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                  {mod.tags.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => onTagClick?.(t)}
                        className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        title={`Search for “${t}”`}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <section className="flex flex-col border-t" aria-labelledby="comments-heading">
              <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-center justify-between gap-3 border-b bg-popover/95 px-5 py-3 backdrop-blur sm:px-6">
                <h3 id="comments-heading" className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4" /> Comments
                  <span className="font-normal text-muted-foreground tabular-nums">{formatFullNumber(mod.commentCount)}</span>
                </h3>
                <a href={`${mod.url}#commentthread_PublishedFile_Public_${mod.creatorId}_${mod.id}_area`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
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
