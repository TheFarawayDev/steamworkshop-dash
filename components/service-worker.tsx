"use client"

import { useEffect } from "react"

/** Registers /sw.js (offline shell + push notifications). */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Non-fatal: the app still works online without it.
    })
  }, [])
  return null
}
