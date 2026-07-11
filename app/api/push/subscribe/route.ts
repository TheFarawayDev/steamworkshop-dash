import { NextResponse } from 'next/server'
import { db } from '@/firebase/admin'

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 })
    }
    const body = await req.json()
    const { subscription, watchedMods, seenMods } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Base64 encode the endpoint URL to use as a Firestore document ID (safe characters)
    const subId = Buffer.from(subscription.endpoint).toString('base64').replace(/[/+=]/g, '')
    
    // We merge so we don't accidentally overwrite an existing seenMods state if only updating watchedMods
    await db.collection('subscriptions').doc(subId).set({
      subscription,
      watchedMods: watchedMods || [],
      seenMods: seenMods || {},
      updatedAt: new Date().toISOString()
    }, { merge: true })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Subscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
