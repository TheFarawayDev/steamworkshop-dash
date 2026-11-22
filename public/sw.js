/* Workshop dashboard service worker: offline shell + Web Push. */
const CACHE = "workshop-v3"
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function putInCache(request, response) {
  if (response && response.ok && response.type === "basic") {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
  }
  return response
}

/** Network first, falling back to cache (HTML and API data stay fresh). */
function networkFirst(request, fallbackUrl) {
  return fetch(request)
    .then((res) => putInCache(request, res))
    .catch(() =>
      caches.match(request).then((cached) => cached || (fallbackUrl ? caches.match(fallbackUrl) : undefined)),
    )
    .then((res) => res || Response.error())
}

/** Cache first for immutable build assets and icons. */
function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request).then((res) => putInCache(request, res)))
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"))
  } else if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/push/")) return
    event.respondWith(networkFirst(request))
  } else if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|jpg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Workshop update", {
      body: data.body || "Something changed on a watched mod.",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: data.tag || "workshop",
      renotify: true,
      data: { url: data.url || "/" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/", self.location.origin)
  const modId = target.searchParams.get("mod")

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (existing) {
        if (modId) existing.postMessage({ type: "open-mod", id: modId })
        return existing.focus()
      }
      return self.clients.openWindow(target.href)
    }),
  )
})
