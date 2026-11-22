"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

/** Workshop preview image with a graceful fallback. */
export function ModThumb({ src, className, alt = "" }: { src: string | null; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground/60", className)}>
        <ImageOff className="size-5" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("bg-muted object-cover", className)}
    />
  )
}
