"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { diffMods, notify, readAlertState, setBackgroundChecks, writeAlertState, type AlertState } from "@/lib/alerts"
import type { Mod } from "@/lib/types"

export type Support = "unknown" | "supported" | "needs-install" | "unsupported"

/**
 * Device-local alerts. `check` is called whenever fresh mod data arrives; it notifies
 * about watched (and optionally own) mods that changed since the last check.
 */
export function useAlerts({ watched, all, isOwn }: { watched: string[]; all: Mod[]; isOwn: (m: Mod) => boolean }) {
  const [support, setSupport] = useState<Support>("unknown")
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [state, setState] = useState<AlertState | null>(null)
  const [background, setBackground] = useState(false)
  const checking = useRef(false)

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "Notification" in window && "caches" in window
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    setSupport(ok ? "supported" : ios && !standalone ? "needs-install" : "unsupported")
    if ("Notification" in window) setPermission(Notification.permission)
    if (ok) readAlertState().then(setState)
  }, [])

  // Mirror the watch list so the service worker knows what to check.
  const idsKey = watched.join(",")
  useEffect(() => {
    if (!state) return
    if (state.ids.join(",") !== idsKey) writeAlertState({ ids: watched }).then(setState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, state?.ids])

  const tracked = useCallback(
    (s: AlertState) => {
      const ids = new Set(s.ids)
      return all.filter((m) => ids.has(m.id) || (s.includeOwn && isOwn(m)))
    },
    [all, isOwn],
  )

  // Check for changes whenever data changes.
  useEffect(() => {
    if (!state?.enabled || permission !== "granted" || checking.current || all.length === 0) return
    checking.current = true
    ;(async () => {
      try {
        const current = await readAlertState()
        const { changes, next } = diffMods(tracked(current), current.snapshot)
        for (const c of changes.slice(0, 5)) await notify(c).catch(() => {})
        setState(await writeAlertState({ snapshot: next, lastCheck: Date.now() }))
      } finally {
        checking.current = false
      }
    })()
  }, [all, state?.enabled, state?.includeOwn, permission, tracked])

  const enable = useCallback(async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== "granted") throw new Error("Notification permission was not granted.")
    const current = await readAlertState()
    // Baseline everything so turning alerts on doesn't fire a burst of notifications.
    const { next } = diffMods(tracked({ ...current, ids: watched }), current.snapshot)
    setState(await writeAlertState({ enabled: true, ids: watched, snapshot: next, lastCheck: Date.now() }))
    setBackground(await setBackgroundChecks(true))
  }, [tracked, watched])

  const disable = useCallback(async () => {
    setState(await writeAlertState({ enabled: false }))
    await setBackgroundChecks(false)
    setBackground(false)
  }, [])

  const setIncludeOwn = useCallback(
    async (includeOwn: boolean) => {
      const current = await readAlertState()
      const { next } = diffMods(tracked({ ...current, includeOwn }), current.snapshot)
      setState(await writeAlertState({ includeOwn, snapshot: next }))
    },
    [tracked],
  )

  useEffect(() => {
    if (state?.enabled && permission === "granted") setBackgroundChecks(true).then(setBackground)
  }, [state?.enabled, permission])

  return { support, permission, state, background, enable, disable, setIncludeOwn }
}
