"use client"

import { useEffect, useState, useRef } from "react"
import { Bell, BellOff } from "lucide-react"

type ModStat = { id: string; updatedAt: number; commentCount: number; title: string }

export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const lastCheckedRef = useRef<Record<string, ModStat>>({})

  useEffect(() => {
    setIsSupported("Notification" in window && "serviceWorker" in navigator)
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  async function requestPermission() {
    if (!isSupported) return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async function syncSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!sub && vapidPublicKey) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })
      }
      
      if (sub) {
        const storedWatched = localStorage.getItem("steam-dashboard-watched-mods")
        const watchedMods = storedWatched ? JSON.parse(storedWatched) : []
        const storedSeen = localStorage.getItem("steam-dashboard-seen")
        const seenMods = storedSeen ? JSON.parse(storedSeen) : {}

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, watchedMods, seenMods })
        })
      }
    } catch (err) {
      console.error("Failed to sync push subscription:", err)
    }
  }

  useEffect(() => {
    if (permission === "granted") {
      syncSubscription()
      
      // Also sync when other tabs or components update local storage
      const handleStorage = () => syncSubscription()
      window.addEventListener("storage", handleStorage)
      window.addEventListener("mods-watched-changed", handleStorage)
      
      return () => {
        window.removeEventListener("storage", handleStorage)
        window.removeEventListener("mods-watched-changed", handleStorage)
      }
    }
  }, [permission])

  async function sendNotification(title: string, body: string, tag: string) {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: "/icon-512.png",
          badge: "/icon-dark-32x32.png",
          // @ts-expect-error - vibrate is not included in all TS NotificationOptions definitions
          vibrate: [100, 50, 100],
          data: { url: "/" },
          tag,
          requireInteraction: true,
          renotify: true,
          silent: false,
        })
      }
    } else {
      new Notification(title, { body, icon: "/icon-512.png" })
    }
  }

  if (!isSupported) return null

  function handleTestNotification() {
    if (isTesting) return
    setIsTesting(true)
    
    // Send an immediate notification
    sendNotification("Test (Active)", "This is what it looks like when the app is open.", "test-active")
    
    // Send another one after 5 seconds to test backgrounding
    setTimeout(() => {
      sendNotification("Test (Background)", "This is what it looks like when your phone is locked/backgrounded!", "test-bg")
      setIsTesting(false)
    }, 5000)
  }

  if (permission === "granted") {
    return (
      <button 
        onClick={handleTestNotification}
        disabled={isTesting}
        title="Click to test notifications (sends one immediately and another in 5 seconds)"
        className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-80"
      >
        <Bell className={`size-3.5 ${isTesting ? "animate-pulse text-amber-500" : ""}`} />
        {isTesting ? "Lock your phone now! (5s...)" : "Notifications Active"}
      </button>
    )
  }

  return (
    <button 
      onClick={requestPermission}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <BellOff className="size-3.5" />
      Enable Notifications
    </button>
  )
}
