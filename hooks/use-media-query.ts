"use client"

import { useSyncExternalStore } from "react"

/** Live CSS media query match; `false` during SSR. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const PHONE_QUERY = "(max-width: 639px)"
