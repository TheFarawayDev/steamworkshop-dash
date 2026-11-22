import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/firebase/admin"
import { errorResponse } from "@/lib/api"
import { ensureWebPush, webpush, type PushPayload } from "@/lib/push"
import { getModsById } from "@/lib/steam"
import type { Mod } from "@/lib/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Snapshot = { updatedAt: number; commentCount: number; title?: string }

type SubscriptionDoc = {
  subscription: webpush.PushSubscription
  watchedMods?: string[]
  /** What this device has already been notified about. */
  notified?: Record<string, Snapshot>
  /** Legacy name for `notified`. */
  seenMods?: Record<string, Snapshot>
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV === "development"
  return req.headers.get("authorization") === `Bearer ${secret}`
}

function describeChange(mod: Mod, prev: Snapshot): PushPayload | null {
  const updated = (mod.updatedAt ?? 0) > prev.updatedAt
  const newComments = Math.max(0, mod.commentCount - prev.commentCount)
  if (!updated && newComments === 0) return null

  const commentText = `${newComments} new comment${newComments === 1 ? "" : "s"}`
  return {
    title: updated ? "Mod updated" : "New comments",
    body: updated && newComments ? `${mod.title} · updated · ${commentText}` : updated ? `${mod.title} has a new update.` : `${mod.title} · ${commentText}`,
    url: `/?mod=${mod.id}`,
    tag: `mod-${mod.id}`,
  }
}

/**
 * Checks every watched mod for updates/new comments and sends Web Push
 * notifications. Triggered by Vercel Cron and the GitHub Actions workflow.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!db) return NextResponse.json({ error: "Firebase is not configured." }, { status: 500 })
  if (!ensureWebPush()) return NextResponse.json({ error: "VAPID keys are not configured." }, { status: 500 })

  try {
    const snapshot = await db.collection("subscriptions").get()
    const subs = snapshot.docs.map((doc) => ({ ref: doc.ref, data: doc.data() as SubscriptionDoc }))

    const watched = new Set(subs.flatMap((s) => s.data.watchedMods ?? []))
    if (watched.size === 0) return NextResponse.json({ success: true, subscriptions: subs.length, pushes: 0 })

    const current = new Map((await getModsById([...watched])).map((m) => [m.id, m]))

    let sent = 0
    let removed = 0
    let failed = 0

    await Promise.all(
      subs.map(async ({ ref, data }) => {
        const prevState = data.notified ?? data.seenMods ?? {}
        const nextState: Record<string, Snapshot> = {}
        const payloads: PushPayload[] = []

        for (const id of data.watchedMods ?? []) {
          const mod = current.get(id)
          if (!mod) {
            if (prevState[id]) nextState[id] = prevState[id]
            continue
          }
          const prev = prevState[id]
          // First sighting just records a baseline; no notification.
          const change = prev ? describeChange(mod, prev) : null
          if (change) payloads.push(change)
          nextState[id] = { updatedAt: mod.updatedAt ?? 0, commentCount: mod.commentCount, title: mod.title }
        }

        let gone = false
        for (const payload of payloads) {
          try {
            await webpush.sendNotification(data.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
            sent++
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              gone = true
              break
            }
            failed++
            console.error("[push/cron] send failed", status, err)
          }
        }

        if (gone) {
          await ref.delete()
          removed++
          return
        }

        if (JSON.stringify(nextState) !== JSON.stringify(prevState) || data.seenMods) {
          await ref.update({
            notified: nextState,
            ...(data.seenMods ? { seenMods: FieldValue.delete() } : {}),
            lastChecked: new Date().toISOString(),
          })
        }
      }),
    )

    return NextResponse.json({ success: true, subscriptions: subs.length, mods: current.size, pushes: sent, failed, removed })
  } catch (err) {
    return errorResponse(err, "api/push/cron")
  }
}
