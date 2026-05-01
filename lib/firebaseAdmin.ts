import * as admin from 'firebase-admin';

// 1. Check if variables exist
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error(`
    🚨 FIREBASE ADMIN INIT FAILED! 🚨
    Missing Environment Variables:
    PROJECT_ID: ${!!projectId}
    CLIENT_EMAIL: ${!!clientEmail}
    PRIVATE_KEY: ${!!privateKey}
  `);
}

// 2. Initialize App
if (!admin.apps.length && projectId && clientEmail && privateKey) {
  try {
    // Format the private key safely for both Localhost and Vercel
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log("✅ Firebase Admin Initialized Successfully!");
  } catch (error) {
    console.error("🚨 Firebase Admin Initialization Error:", error);
  }
}

// 3. Export Database and Messaging
// If it fails to initialize, this will explicitly tell your API route to throw a proper error
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminMessaging = admin.apps.length ? admin.messaging() : null;