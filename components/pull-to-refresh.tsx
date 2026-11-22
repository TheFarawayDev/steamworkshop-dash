"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const TRIGGER = 72
const MAX = 120

/**
 * Touch pull-to-refresh for the page (installed PWAs have no browser one).
 * Native overscroll refresh is disabled in globals.css so they don't both fire.
 */
export function PullToRefresh({ onRefresh, refreshing, children }: { onRefresh: () => Promise<unknown> | void; refreshing: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const state = useRef<{ y: number; active: boolean } | null>(null)
  const pullRef = useRef(0)
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const start = (e: TouchEvent) => {
      state.current = window.scrollY <= 0 && e.touches.length === 1 ? { y: e.touches[0].clientY, active: false } : null
    }
    const move = (e: TouchEvent) => {
      const s = state.current
      if (!s) return
      const dy = e.touches[0].clientY - s.y
      if (!s.active) {
        if (dy < 8 || window.scrollY > 0) return void (dy < -4 && (state.current = null))
        s.active = true
      }
      e.preventDefault() // keep the page from scrolling while pulling
      const eased = Math.min(MAX, dy * 0.5)
      pullRef.current = eased
      setPull(eased)
    }
    const end = () => {
      const triggered = state.current?.active && pullRef.current >= TRIGGER
      state.current = null
      pullRef.current = 0
      setPull(0)
      if (triggered) {
        navigator.vibrate?.(10)
        refreshRef.current()
      }
    }

    el.addEventListener("touchstart", start, { passive: true })
    el.addEventListener("touchmove", move, { passive: false })
    el.addEventListener("touchend", end)
    el.addEventListener("touchcancel", end)
    return () => {
      el.removeEventListener("touchstart", start)
      el.removeEventListener("touchmove", move)
      el.removeEventListener("touchend", end)
      el.removeEventListener("touchcancel", end)
    }
  }, [])

  const shown = refreshing ? TRIGGER * 0.75 : pull
  const ready = pull >= TRIGGER

  return (
    <div ref={ref} className="relative">
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{ transform: `translateY(${shown - 40}px)`, opacity: shown ? Math.min(1, shown / 40) : 0, transition: pull ? "none" : "transform 200ms, opacity 200ms" }}
      >
        <span className={cn("flex size-9 items-center justify-center rounded-full border bg-popover shadow-md", ready && "text-primary")}>
          <RefreshCw
            className={cn("size-4", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
          />
        </span>
        <span className="sr-only">{refreshing ? "Refreshing" : ""}</span>
      </div>
      <div style={{ transform: pull ? `translateY(${pull * 0.6}px)` : undefined, transition: pull ? "none" : "transform 200ms" }}>{children}</div>
    </div>
  )
}
