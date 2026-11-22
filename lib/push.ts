import "server-only"
import { createHash } from "node:crypto"
import webpush from "web-push"

let configured = false

/** Configures VAPID once; returns false if keys are missing. */
export function ensureWebPush(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey)
  configured = true
  return true
}

/** Stable, Firestore-safe document id for a push endpoint. */
export function subscriptionId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex")
}

/** Legacy id scheme (base64 with symbols stripped) used by earlier versions. */
export function legacySubscriptionId(endpoint: string): string {
  return Buffer.from(endpoint).toString("base64").replace(/[/+=]/g, "")
}

export type PushPayload = { title: string; body: string; url: string; tag: string }

export { webpush }
