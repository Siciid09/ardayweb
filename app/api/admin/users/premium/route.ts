export const dynamic = "force-dynamic"; // <-- ADDS THIS
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // <-- New smart DB
import { getAuth } from "firebase-admin/auth";

export async function POST(req: Request) {
  try {
    // 1. Initialize Secure Server Environment
    const auth = getAuth();
    const db = adminDb;

    // Safety check in case Vercel env variables are missing during build
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    // 2. Parse Request Data
    const body = await req.json();
    const { userId, isPaid } = body;

    if (!userId || typeof isPaid !== "boolean") {
      return NextResponse.json({ error: "Missing or invalid userId/isPaid fields." }, { status: 400 });
    }

    // 3. Authenticate the Requester
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
    }

    // 4. Fetch Requester's Role
    const requesterDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!requesterDoc.exists) {
      return NextResponse.json({ error: "Admin profile not found." }, { status: 404 });
    }

    const requesterRole = requesterDoc.data()?.role;

    // 5. THE TRICK LOGIC (Routing the data)
    if (requesterRole === "badmin") {
      // SUPER ADMIN: Write to the core user document
      await db.collection("users").doc(userId).update({
        isPremium: isPaid,
        pro: isPaid, // Keeping both in sync for backward compatibility
        updatedAt: new Date(),
      });

      return NextResponse.json({ 
        success: true, 
        message: `Successfully updated core premium status to ${isPaid}.` 
      }, { status: 200 });

    } else if (requesterRole === "admin") {
      // SHADOW ADMIN: Intercept and write to the isolated 'bixiyay' collection
      // We use set() with merge: true so it creates the doc if it doesn't exist
      await db.collection("bixiyay").doc(userId).set({
        bixiyay: isPaid,
        managedBy: decodedToken.uid, // Track who made the change
        updatedAt: new Date(),
      }, { merge: true });

      return NextResponse.json({ 
        success: true, 
        message: `Successfully recorded payment status.` // Vague message so they don't know it's a shadow collection
      }, { status: 200 });

    } else {
      // Normal users or unauthorized roles
      return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 });
    }

  } catch (error: any) {
    console.error("Premium Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}