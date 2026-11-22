"use client"

import type { Mod } from "@/lib/types"

/**
 * Device-local update alerts. State lives in Cache Storage so that both the page
 * and the service worker (periodic background sync) read and write the same
 * snapshot — whichever checks first notifies, the other sees nothing new.
 * Keep the shape in sync with public/sw.js.
 */
export type AlertSnapshot = { updatedAt: number; commentCount: number; title: string }
export type AlertState = {
  enabled: boolean
  /** Also alert for every mod the owner published, not just watched ones. */
  includeOwn: boolean
  ids: string[]
  snapshot: Record<string, AlertSnapshot>
  lastCheck: number
}

const CACHE = "workshop-alerts"
const KEY = "/__alerts/state"
export const PERIODIC_TAG = "workshop-check"

const EMPTY: AlertState = { enabled: false, includeOwn: false, ids: [], snapshot: {}, lastCheck: 0 }

export async function readAlertState(): Promise<AlertState> {
  try {
    const res = await (await caches.open(CACHE)).match(KEY)
    return res ? { ...EMPTY, ...((await res.json()) as Partial<AlertState>) } : EMPTY
  } catch {
    return EMPTY
  }
}

export async function writeAlertState(patch: Partial<AlertState>): Promise<AlertState> {
  const next = { ...(await readAlertState()), ...patch }
  try {
    await (await caches.open(CACHE)).put(KEY, new Response(JSON.stringify(next), { headers: { "Content-Type": "application/json" } }))
  } catch {}
  return next
}

export type AlertChange = { mod: Mod; updated: boolean; newComments: number }

/** Diffs mods against the stored snapshot and returns what changed (new mods only get a baseline). */
export function diffMods(mods: Mod[], snapshot: Record<string, AlertSnapshot>) {
  const changes: AlertChange[] = []
  const next: Record<string, AlertSnapshot> = { ...snapshot }
  for (const mod of mods) {
    const prev = snapshot[mod.id]
    if (prev) {
      const updated = (mod.updatedAt ?? 0) > prev.updatedAt
      const newComments = Math.max(0, mod.commentCount - prev.commentCount)
      if (updated || newComments) changes.push({ mod, updated, newComments })
    }
    next[mod.id] = { updatedAt: mod.updatedAt ?? 0, commentCount: mod.commentCount, title: mod.title }
  }
  return { changes, next }
}

export function describe({ mod, updated, newComments }: AlertChange) {
  const comments = `${newComments} new comment${newComments === 1 ? "" : "s"}`
  return {
    title: updated ? "Mod updated" : "New comments",
    body: updated && newComments ? `${mod.title} · updated · ${comments}` : updated ? `${mod.title} has a new update.` : `${mod.title} · ${comments}`,
  }
}

export async function notify(change: AlertChange) {
  const reg = await navigator.serviceWorker.ready
  const { title, body } = describe(change)
  await reg.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: `mod-${change.mod.id}`,
    data: { url: `/?mod=${change.mod.id}` },
  })
}

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> }
}

/** Background checks: only available for installed PWAs on Chromium browsers. */
export async function setBackgroundChecks(on: boolean): Promise<boolean> {
  try {
    const reg = (await navigator.serviceWorker.ready) as PeriodicSyncRegistration
    if (!reg.periodicSync) return false
    if (!on) {
      await reg.periodicSync.unregister(PERIODIC_TAG)
      return false
    }
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName })
    if (status.state !== "granted") return false
    await reg.periodicSync.register(PERIODIC_TAG, { minInterval: 30 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}
