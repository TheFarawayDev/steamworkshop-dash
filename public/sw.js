/* Workshop dashboard service worker: offline shell + background update checks. */
const CACHE = "workshop-v4"
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ALERTS_CACHE).map((k) => caches.delete(k))))
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
    event.respondWith(networkFirst(request))
  } else if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|jpg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

/* ---- Background update checks (Periodic Background Sync) ----------------
 * Shares its state with the page via Cache Storage; keep in sync with lib/alerts.ts. */
const ALERTS_CACHE = "workshop-alerts"
const ALERTS_KEY = "/__alerts/state"
const OWNER_ID = "76561199121866975"

async function readAlerts() {
  const res = await (await caches.open(ALERTS_CACHE)).match(ALERTS_KEY)
  return res ? res.json() : null
}

async function writeAlerts(state) {
  await (await caches.open(ALERTS_CACHE)).put(
    ALERTS_KEY,
    new Response(JSON.stringify(state), { headers: { "Content-Type": "application/json" } }),
  )
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("HTTP " + res.status)
  return res.json()
}

async function checkForUpdates() {
  const state = await readAlerts()
  if (!state || !state.enabled) return
  const ids = state.ids || []

  const mods = new Map()
  if (state.includeOwn) {
    const own = await fetchJson("/api/mods?fresh=1")
    for (const m of own.mods || []) if (!m.creatorId || m.creatorId === OWNER_ID) mods.set(m.id, m)
  }
  if (ids.length) {
    const watched = await fetchJson("/api/mods/watched?fresh=1&ids=" + ids.join(","))
    for (const m of watched.mods || []) mods.set(m.id, m)
  }

  const snapshot = { ...(state.snapshot || {}) }
  const notes = []
  for (const mod of mods.values()) {
    const prev = snapshot[mod.id]
    if (prev) {
      const updated = (mod.updatedAt || 0) > prev.updatedAt
      const newComments = Math.max(0, mod.commentCount - prev.commentCount)
      if (updated || newComments) {
        const c = newComments + " new comment" + (newComments === 1 ? "" : "s")
        notes.push({
          title: updated ? "Mod updated" : "New comments",
          body: updated && newComments ? mod.title + " · updated · " + c : updated ? mod.title + " has a new update." : mod.title + " · " + c,
          id: mod.id,
        })
      }
    }
    snapshot[mod.id] = { updatedAt: mod.updatedAt || 0, commentCount: mod.commentCount, title: mod.title }
  }

  // Re-read in case the page changed settings meanwhile, then merge our snapshot.
  const latest = (await readAlerts()) || state
  await writeAlerts({ ...latest, snapshot: { ...latest.snapshot, ...snapshot }, lastCheck: Date.now() })

  await Promise.all(
    notes.slice(0, 5).map((n) =>
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        tag: "mod-" + n.id,
        data: { url: "/?mod=" + n.id },
      }),
    ),
  )
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "workshop-check") event.waitUntil(checkForUpdates().catch(() => {}))
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
