export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// GET: Fetch the 50 most recent notifications
export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ error: "Database not initialized" }, { status: 500 });

    const snapshot = await adminDb.collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      body: doc.data().body,
      // Convert Firestore timestamp to a readable string
      timestamp: doc.data().timestamp?.toDate()?.toLocaleString() || 'Unknown date' 
    }));

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// DELETE: Fast delete a notification by ID
export async function DELETE(req: Request) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Database not initialized" }, { status: 500 });

    // Grab the ID from the URL (e.g., /api/admin/notifications?id=12345)
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });

    // Delete it from Firestore
    await adminDb.collection('notifications').doc(id).delete();
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}