import "server-only"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

function init(): Firestore | null {
  if (getApps().length) return getFirestore()

  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY } = process.env
  if (!projectId || !clientEmail || !FIREBASE_PRIVATE_KEY) return null

  try {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }),
    })
    return getFirestore()
  } catch (error) {
    console.error("Firebase admin initialization error", error)
    return null
  }
}

/** Firestore client, or null when Firebase credentials are not configured. */
export const db = init()
