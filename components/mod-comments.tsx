"use client"

import { Fragment } from "react"
import useSWR from "swr"
import { Loader2, MessageSquareOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatRelative } from "@/lib/format"
import type { Comment } from "@/app/api/comments/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type CommentsResponse = { total: number; comments: Comment[] }

function renderCommentText(text: string) {
  if (!text.includes("__EMOTICON__")) return text

  const parts = text.split(/__EMOTICON__(.*?)__EMOTICON_END__/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <img
          key={i}
          src={part}
          alt="emoticon"
          className="inline-block h-5 w-auto align-sub mx-0.5"
          loading="lazy"
        />
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function ModComments({ modId, ownerId }: { modId: string; ownerId?: string }) {
  const { data, error, isLoading } = useSWR<CommentsResponse>(
    `/api/comments?id=${modId}${ownerId ? `&owner=${ownerId}` : ""}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading comments…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 text-sm text-destructive">Could not load comments.</div>
    )
  }

  if (data.comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
        <MessageSquareOff className="size-6" />
        No comments yet.
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {data.comments.map((c) => (
        <li key={c.id} className="flex gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
          <Avatar className="size-8 shrink-0">
            {c.avatar ? <AvatarImage src={c.avatar || "/placeholder.svg"} alt="" /> : null}
            <AvatarFallback className="text-xs">
              {c.author.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {c.authorUrl ? (
                <a
                  href={c.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {c.author}
                </a>
              ) : (
                <span className="text-sm font-medium text-foreground">{c.author}</span>
              )}
              {c.isOwner && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  You
                </span>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatRelative(c.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 text-pretty break-words">
              {renderCommentText(c.text)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
