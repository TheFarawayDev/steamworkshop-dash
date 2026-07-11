const CACHE = "workshop-shell-v1"
const SHELL = ["/", "/icon-512.png", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Network-first for API + Steam data so mods/comments stay fresh.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  // Cache-first for everything else (app shell, icons, assets).
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
            return res
          })
          .catch(() => cached)
      )
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        // If so, just focus it.
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || "Workshop Update", {
        body: data.body || "You have a new notification.",
        icon: "/icon-512.png",
        badge: "/icon-dark-32x32.png",
        vibrate: [100, 50, 100],
        data: { url: data.url || "/" },
        tag: data.tag || "default",
        requireInteraction: true,
        renotify: true,
        silent: false
      })
    )
  } catch (e) {
    console.error("Error parsing push payload", e)
  }
})
