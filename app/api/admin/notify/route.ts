export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore'; // Safe import

export async function POST(request: NextRequest) {
  try {
    // 1. SAFETY CHECK (This fixes the TypeScript "possibly null" error!)
    if (!adminDb || !adminMessaging) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Check server logs.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { title, messageBody, topic } = body;

    // Validate the request
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Missing title or message body' },
        { status: 400 }
      );
    }

    // 2. Save the notification to Firestore
    // TypeScript now knows adminDb is 100% safe to use because of the check above!
    await adminDb.collection('notifications').add({
      title: title,
      body: messageBody,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 3. Build the FCM Message payload
    const message = {
      notification: {
        title: title,
        body: messageBody,
      },
      topic: topic || 'all_users',
    };

    // 4. Send the Push Notification
    const response = await adminMessaging.send(message);
    
    return NextResponse.json({ 
      success: true, 
      messageId: response 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}