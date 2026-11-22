import { NextResponse } from "next/server"
import { db } from "@/firebase/admin"
import { legacySubscriptionId, subscriptionId } from "@/lib/push"
import { isWorkshopId } from "@/lib/steam"

export const dynamic = "force-dynamic"

const MAX_WATCHED = 200

type PushSubscriptionJSON = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

function parseSubscription(input: unknown): PushSubscriptionJSON | null {
  if (!input || typeof input !== "object") return null
  const s = input as Record<string, unknown>
  const keys = s.keys as Record<string, unknown> | undefined
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://")) return null
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null
  return {
    endpoint: s.endpoint,
    expirationTime: typeof s.expirationTime === "number" ? s.expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  }
}

/** Register or update a device's push subscription and the mods it watches. */
export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: "Firebase is not configured." }, { status: 500 })

  let body: { subscription?: unknown; watchedMods?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const subscription = parseSubscription(body.subscription)
  if (!subscription) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 })

  const watchedMods = Array.isArray(body.watchedMods)
    ? Array.from(new Set(body.watchedMods.filter(isWorkshopId))).slice(0, MAX_WATCHED)
    : []

  try {
    const id = subscriptionId(subscription.endpoint)
    const ref = db.collection("subscriptions").doc(id)
    const existing = await ref.get()

    // Carry notification state over from the legacy document id, if present.
    let carried: Record<string, unknown> = {}
    if (!existing.exists) {
      const legacyRef = db.collection("subscriptions").doc(legacySubscriptionId(subscription.endpoint))
      const legacy = await legacyRef.get()
      if (legacy.exists) {
        const data = legacy.data() ?? {}
        carried = { notified: data.notified ?? data.seenMods ?? {} }
        await legacyRef.delete()
      }
    }

    await ref.set(
      { ...carried, subscription, watchedMods, updatedAt: new Date().toISOString() },
      { merge: true },
    )
    return NextResponse.json({ success: true, watching: watchedMods.length })
  } catch (err) {
    console.error("[push/subscribe]", err)
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 })
  }
}

/** Remove a device's push subscription. */
export async function DELETE(req: Request) {
  if (!db) return NextResponse.json({ error: "Firebase is not configured." }, { status: 500 })

  let endpoint: unknown
  try {
    endpoint = ((await req.json()) as { endpoint?: unknown }).endpoint
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 })
  }

  try {
    await Promise.all([
      db.collection("subscriptions").doc(subscriptionId(endpoint)).delete(),
      db.collection("subscriptions").doc(legacySubscriptionId(endpoint)).delete(),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[push/unsubscribe]", err)
    return NextResponse.json({ error: "Could not remove subscription." }, { status: 500 })
  }
}
