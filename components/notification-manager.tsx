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

  useEffect(() => {
    if (permission !== "granted") return

    // Load initial states to avoid triggering notifications on first load
    try {
      const storedSeen = localStorage.getItem("steam-dashboard-seen")
      if (storedSeen) {
        lastCheckedRef.current = JSON.parse(storedSeen)
      }
    } catch (e) {}

    const interval = setInterval(async () => {
      try {
        const stored = localStorage.getItem("steam-dashboard-watched-mods")
        if (!stored) return
        const watchedIds = JSON.parse(stored) as string[]
        if (watchedIds.length === 0) return

        const res = await fetch(`/api/mods/watched?ids=${watchedIds.join(",")}`)
        if (!res.ok) return
        const data = await res.json()

        const currentSeen = { ...lastCheckedRef.current }
        let hasChanges = false

        for (const mod of data.mods) {
          const prev = currentSeen[mod.id]
          const nowUpdatedAt = mod.updatedAt ?? 0
          
          if (prev) {
            if (nowUpdatedAt > prev.updatedAt) {
              sendNotification("Mod Updated!", `${mod.title} has a new update.`, mod.id)
              hasChanges = true
            } else if (mod.commentCount > prev.commentCount) {
              sendNotification("New Comment", `${mod.title} has new comments.`, mod.id)
              hasChanges = true
            }
          }
          currentSeen[mod.id] = { id: mod.id, updatedAt: nowUpdatedAt, commentCount: mod.commentCount, title: mod.title }
        }

        if (hasChanges) {
          lastCheckedRef.current = currentSeen
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 60 * 1000) // Poll every 1 minute

    return () => clearInterval(interval)
  }, [permission])

  async function sendNotification(title: string, body: string, tag: string) {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: "/icon-512.png",
          badge: "/icon-dark-32x32.png",
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
