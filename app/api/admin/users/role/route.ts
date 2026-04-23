export const dynamic = "force-dynamic"; // <-- ADD THIS TO THE VERY TOP
import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin"; // We will create this helper next
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Define the allowed roles to prevent injection of invalid roles
const ALLOWED_ROLES = ["user", "reagent", "hoadmin"];

export async function POST(req: Request) {
  try {
    // 1. Initialize Firebase Admin (Safe for Next.js hot-reloading)
    initAdmin();
    const auth = getAuth();
    const db = getFirestore();

    // 2. Parse the Request Body
    const body = await req.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "Missing required fields: userId or newRole" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    // 3. Extract the Authorization Token from the Headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid token." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    // 4. Verify the Token to get the Requester's UID
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json(
        { error: "Unauthorized. Token expired or invalid." },
        { status: 401 }
      );
    }

    const requesterUid = decodedToken.uid;

    // 5. Verify the Requester is actually a 'hoadmin'
    const requesterDoc = await db.collection("users").doc(requesterUid).get();
    
    if (!requesterDoc.exists) {
      return NextResponse.json(
        { error: "Requester profile not found." },
        { status: 404 }
      );
    }

    const requesterData = requesterDoc.data();
    if (requesterData?.role !== "hoadmin") {
      return NextResponse.json(
        { error: "Forbidden. Only super admins (hoadmin) can change roles." },
        { status: 403 }
      );
    }

    // 6. Security Checks Passed! Update the target user's role
    await db.collection("users").doc(userId).update({
      role: newRole,
      updatedAt: new Date(),
    });

    // 7. Return Success
    return NextResponse.json(
      { success: true, message: `User role updated to ${newRole}` },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}