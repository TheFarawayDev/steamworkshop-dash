import { NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function GET(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 })
    }

    // Secure the cron endpoint if it's called via HTTP (e.g., from Vercel Cron)
    const authHeader = req.headers.get('authorization')
    if (
      process.env.NODE_ENV !== 'development' && 
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch all subscriptions
    const snapshot = await db.collection('subscriptions').get()
    const allModsToWatch = new Set<string>()
    const subs: any[] = []

    snapshot.forEach(doc => {
      const data = doc.data()
      subs.push({ id: doc.id, ...data })
      if (Array.isArray(data.watchedMods)) {
        data.watchedMods.forEach(modId => allModsToWatch.add(modId))
      }
      if (Array.isArray(data.seenMods)) {
        // Also keep track of what they have seen
      }
    })

    if (allModsToWatch.size === 0) {
      return NextResponse.json({ success: true, message: 'No mods to watch' })
    }

    // 2. Fetch latest data from Steam
    const key = process.env.STEAM_API_KEY
    if (!key) throw new Error("STEAM_API_KEY is not configured")

    const url = new URL("https://api.steampowered.com/IPublishedFileService/GetDetails/v1/")
    url.searchParams.set("key", key)
    
    Array.from(allModsToWatch).forEach((id, index) => {
      url.searchParams.append(`publishedfileids[${index}]`, id)
    })

    let res = await fetch(url.toString(), { cache: "no-store" })
    let rawMods: any[] = []
    if (res.ok) {
      const data = await res.json()
      rawMods = data.response?.publishedfiledetails ?? []
    }

    // Create a map for quick lookup
    const currentStats = new Map<string, { updatedAt: number, commentCount: number, title: string }>()
    for (const raw of rawMods) {
      currentStats.set(raw.publishedfileid, {
        updatedAt: raw.time_updated ?? 0,
        commentCount: raw.num_comments_public ?? 0,
        title: raw.title ?? 'Unknown Mod'
      })
    }

    // 3. For each subscription, check if watched mods have changes
    const pushPromises: Promise<any>[] = []

    for (const sub of subs) {
      const userSeen = sub.seenMods || {}
      let hasChanges = false
      const newSeen = { ...userSeen }

      for (const modId of (sub.watchedMods || [])) {
        const current = currentStats.get(modId)
        if (!current) continue

        const prev = userSeen[modId]
        
        if (prev) {
          if (current.updatedAt > prev.updatedAt) {
            pushPromises.push(webpush.sendNotification(sub.subscription, JSON.stringify({
              title: "Mod Updated!",
              body: `${current.title} has a new update.`,
              url: "/",
              tag: modId
            })))
            hasChanges = true
          } else if (current.commentCount > prev.commentCount) {
            pushPromises.push(webpush.sendNotification(sub.subscription, JSON.stringify({
              title: "New Comment",
              body: `${current.title} has new comments.`,
              url: "/",
              tag: modId
            })))
            hasChanges = true
          }
        }
        newSeen[modId] = current
      }

      // Update Firestore if there are changes (or just to initialize seen mods)
      if (hasChanges || Object.keys(userSeen).length === 0) {
        await db.collection('subscriptions').doc(sub.id).update({
          seenMods: newSeen,
          lastChecked: new Date().toISOString()
        })
      }
    }

    // Wait for all pushes to finish (catching errors for expired subs)
    const results = await Promise.allSettled(pushPromises)
    // Handle 410 Gone (expired subscriptions) here if needed

    return NextResponse.json({ success: true, pushes: pushPromises.length })

  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
