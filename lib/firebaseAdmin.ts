import * as admin from "firebase-admin";

export function initAdmin() {
  // 1. If Firebase Admin is already initialized, don't do it again
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 2. BUILD-PROOF SHIELD: If Vercel is building the app, environment variables 
  // might be missing. We exit gracefully instead of crashing the build.
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin variables missing. Skipping initialization during build.");
    return null;
  }

  // 3. Initialize normally for actual live user requests
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // This replace regex fixes Vercel's habit of breaking private key line breaks
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  return admin.app();
}

// 4. Actually run the initialization!
initAdmin();

// 5. Safely export the services. 
// (If Vercel skipped initialization during build, we export a safe fallback to prevent crashes)
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null as any;
export const adminMessaging = admin.apps.length > 0 ? admin.messaging() : null as any;