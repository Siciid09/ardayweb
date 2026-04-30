// app/api/notify/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { adminDb, adminMessaging } from '../../../../lib/firebaseAdmin';
import admin from 'firebase-admin'; // Needed for FieldValue

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, messageBody, topic } = body;

    // Validate the request
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Missing title or message body' },
        { status: 400 }
      );
    }

    // 1. Save the notification to Firestore (so it shows in the app's history)
    await adminDb.collection('notifications').add({
      title: title,
      body: messageBody,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Build the FCM Message payload
    const message = {
      notification: {
        title: title,
        body: messageBody,
      },
      topic: topic || 'all_users', // Default to all_users
    };

    // 3. Send the Push Notification
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