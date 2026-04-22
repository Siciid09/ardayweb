import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// These come from your .env.local file
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function initAdmin() {
  if (getApps().length <= 0) {
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  }
}

initAdmin();
export const adminDb = getFirestore();
export const adminAuth = getAuth();