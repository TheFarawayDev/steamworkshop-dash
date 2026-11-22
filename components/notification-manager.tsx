"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { useWatched } from "@/hooks/use-workshop-state"
import { cn } from "@/lib/utils"

type Support = "unknown" | "supported" | "needs-install" | "unsupported"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Service worker did not start. Try reloading the page.")), 10_000),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

async function saveSubscription(sub: PushSubscription, watchedMods: string[]) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), watchedMods }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || `Could not save subscription (${res.status}).`)
  }
}

export function NotificationManager() {
  const { watched, hydrated } = useWatched()
  const [support, setSupport] = useState<Support>("unknown")
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const lastSynced = useRef<string | null>(null)

  useEffect(() => {
    const hasSW = "serviceWorker" in navigator
    const hasNotif = "Notification" in window
    const hasPush = "PushManager" in window
    if (hasSW && hasNotif && hasPush) setSupport("supported")
    else if (hasSW && /iphone|ipad|ipod/i.test(navigator.userAgent)) setSupport("needs-install")
    else setSupport("unsupported")
    if (hasNotif) setPermission(Notification.permission)

    if (hasSW && hasPush) {
      getRegistration()
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {})
    }
  }, [])

  // Keep the server's copy of the watch list in sync with this device.
  useEffect(() => {
    if (!subscribed || !hydrated) return
    const key = watched.join(",")
    if (lastSynced.current === key) return
    const t = setTimeout(async () => {
      try {
        const reg = await getRegistration()
        const sub = await reg.pushManager.getSubscription()
        if (!sub) return setSubscribed(false)
        await saveSubscription(sub, watched)
        lastSynced.current = key
      } catch (err) {
        setError((err as Error).message)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [watched, subscribed, hydrated])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      if (!VAPID_PUBLIC_KEY) throw new Error("Push is not configured on the server (missing VAPID public key).")
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") throw new Error("Notification permission was not granted.")
      const reg = await getRegistration()
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))
      await saveSubscription(sub, watched)
      lastSynced.current = watched.join(",")
      setSubscribed(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }, [watched])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const reg = await getRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      lastSynced.current = null
      setSubscribed(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  const sendTest = useCallback(async (delayMs: number) => {
    setTesting(true)
    try {
      const reg = await getRegistration()
      await new Promise((r) => setTimeout(r, delayMs))
      await reg.showNotification("Test notification", {
        body: delayMs ? "Background delivery works." : "Notifications are working.",
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        tag: "test",
        data: { url: "/" },
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setTesting(false)
    }
  }, [])

  if (support === "unknown" || support === "unsupported") return null

  const active = subscribed && permission === "granted"
  const Icon = active ? BellRing : permission === "denied" ? BellOff : Bell

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={active ? "Notifications on" : "Notifications off"}
            className={cn("relative", active && "text-primary")}
          />
        }
      >
        <Icon className="size-[18px]" />
        {active && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <PopoverTitle>Update alerts</PopoverTitle>
          <PopoverDescription>
            Get a push notification when a watched mod is updated or gets new comments — even when the app is closed.
          </PopoverDescription>
        </div>

        {support === "needs-install" ? (
          <div className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0" />
            On iPhone and iPad, add this site to your Home Screen (Share → Add to Home Screen) and open it from there to
            enable notifications.
          </div>
        ) : permission === "denied" ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            Notifications are blocked for this site. Allow them in your browser settings, then reload.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Watching</span>
              <span className="font-medium tabular-nums">
                {watched.length} mod{watched.length === 1 ? "" : "s"}
              </span>
            </div>
            {active ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={testing} onClick={() => sendTest(0)}>
                    <Send /> Test now
                  </Button>
                  <Button variant="outline" size="sm" disabled={testing} onClick={() => sendTest(5000)}>
                    {testing ? <Loader2 className="animate-spin" /> : <Send />} In 5 s
                  </Button>
                </div>
                <Button variant="ghost" size="sm" disabled={busy} onClick={disable} className="text-muted-foreground">
                  {busy && <Loader2 className="animate-spin" />} Turn off on this device
                </Button>
              </div>
            ) : (
              <Button disabled={busy} onClick={enable}>
                {busy ? <Loader2 className="animate-spin" /> : <Bell />} Enable on this device
              </Button>
            )}
            {watched.length === 0 && (
              <p className="text-xs text-muted-foreground">Tip: bookmark mods to choose what you get alerts for.</p>
            )}
          </>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  )
}
