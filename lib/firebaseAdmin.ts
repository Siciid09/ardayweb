import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("🚨 FIREBASE ADMIN INIT FAILED: Missing Environment Variables.");
}

if (!admin.apps.length && projectId && clientEmail && privateKey) {
  try {
    let formattedKey = privateKey;

    // --- GOD MODE SANITIZER ---
    try {
      // TRAP 1: Did Vercel wrap it in quotes? JSON.parse removes them and fixes \n automatically.
      // TRAP 2: Did you accidentally paste the ENTIRE Firebase JSON file? This extracts just the key.
      const parsed = JSON.parse(privateKey);
      if (parsed && parsed.private_key) {
        formattedKey = parsed.private_key; 
      } else if (typeof parsed === 'string') {
        formattedKey = parsed;
      }
    } catch (e) {
      // Not JSON, which is fine! Proceed to manual cleanup.
    }

    // TRAP 3: Fallback manual cleanup for stray quotes and raw \n text characters
    formattedKey = formattedKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    // ---------------------------

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

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminMessaging = admin.apps.length ? admin.messaging() : null;