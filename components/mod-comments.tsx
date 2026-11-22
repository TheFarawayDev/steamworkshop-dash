"use client"

import { Fragment } from "react"
import useSWRInfinite from "swr/infinite"
import { AlertCircle, Loader2, MessageSquareOff, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { fetcher } from "@/lib/fetcher"
import { formatDateTime, formatRelative } from "@/lib/format"
import type { CommentsResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

function renderCommentText(text: string) {
  if (!text.includes("__EMOTICON__")) return text
  return text.split(/__EMOTICON__(.*?)__EMOTICON_END__/g).map((part, i) =>
    i % 2 === 1 ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={i} src={part} alt="" className="mx-0.5 inline-block h-5 w-auto align-text-bottom" loading="lazy" />
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

const PAGE = 30

export function ModComments({
  modId,
  ownerId,
  /** Comments newer than this (unix seconds) are highlighted. */
  newSince,
}: {
  modId: string
  ownerId?: string
  newSince?: number
}) {
  const base = `/api/comments?id=${modId}${ownerId ? `&owner=${ownerId}` : ""}&count=${PAGE}`
  const { data: pages, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite<CommentsResponse>(
    (index, prev: CommentsResponse | null) => (prev && !prev.hasMore ? null : `${base}&start=${index * PAGE}`),
    fetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false },
  )
  const data = pages?.length
    ? {
        total: pages[0].total,
        // New comments shift Steam's offsets, so drop repeats across pages.
        comments: [...new Map(pages.flatMap((p) => p.comments).map((c) => [c.id, c])).values()],
        hasMore: pages[pages.length - 1].hasMore,
      }
    : undefined
  const loadingMore = isValidating && !!pages && size > pages.length

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-4 p-4" aria-busy>
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-4" />
          {(error as Error | undefined)?.message ?? "Could not load comments."}
        </span>
        <button type="button" onClick={() => mutate()} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
          <RotateCw className={cn("size-3.5", isValidating && "animate-spin")} /> Retry
        </button>
      </div>
    )
  }

  if (data.comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <MessageSquareOff className="size-6 opacity-60" />
        No comments yet.
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {data.comments.map((c) => {
        const isNew = newSince != null && c.createdAt != null && c.createdAt > newSince && !c.isOwner
        return (
          <li key={c.id} className={cn("relative flex gap-3 px-4 py-3.5", isNew && "bg-chatter/[0.07]")}>
            {isNew && <span className="absolute inset-y-0 left-0 w-0.5 bg-chatter" aria-hidden />}
            <Avatar className="size-8 shrink-0">
              {c.avatar && <AvatarImage src={c.avatar} alt="" />}
              <AvatarFallback className="text-xs">{c.author.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {c.authorUrl ? (
                  <a href={c.authorUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">
                    {c.author}
                  </a>
                ) : (
                  <span className="text-sm font-medium">{c.author}</span>
                )}
                {c.isOwner && (
                  <span className="rounded bg-primary/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">Author</span>
                )}
                {isNew && (
                  <span className="rounded bg-chatter/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-chatter">New</span>
                )}
                <time className="text-xs text-muted-foreground tabular-nums" title={formatDateTime(c.createdAt)}>
                  {formatRelative(c.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">{renderCommentText(c.text)}</p>
            </div>
          </li>
        )
      })}
      {(data.hasMore || error) && (
        <li className="flex justify-center p-3">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => setSize(size + 1)}>
            {loadingMore ? <Loader2 className="animate-spin" /> : error ? <RotateCw /> : null}
            {error ? "Retry" : `Show more · ${data.total - data.comments.length} left`}
          </Button>
        </li>
      )}
    </ul>
  )
}
