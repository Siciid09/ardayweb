import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    // 1. Initialize Secure Server Environment
    initAdmin();
    const auth = getAuth();
    const db = getFirestore();

    // 2. Parse Request Data
    const body = await req.json();
    const { quizId, questions } = body;

    // Validate Payload
    if (!quizId || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Invalid payload. Require quizId and questions array." }, { status: 400 });
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

    // 4. Verify Admin Role (Must be hoadmin or reagent to upload content)
    const requesterDoc = await db.collection("users").doc(decodedToken.uid).get();
    const role = requesterDoc.data()?.role;
    if (role !== "hoadmin" && role !== "reagent") {
      return NextResponse.json({ error: "Forbidden. Content upload requires admin rights." }, { status: 403 });
    }

    // 5. Verify the parent Quiz actually exists
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizSnap = await quizRef.get();
    if (!quizSnap.exists) {
      return NextResponse.json({ error: "Target quiz document does not exist." }, { status: 404 });
    }

    // 6. Execute the Firestore Batch Write
    // Firestore batches allow up to 500 operations. We split if it's larger.
    const MAX_BATCH_SIZE = 450; 
    let currentBatch = db.batch();
    let operationCount = 0;

    for (const q of questions) {
      // Validate individual question structure
      if (!q.questionText || !Array.isArray(q.options) || q.correctAnswerIndex === undefined) {
        continue; // Skip invalid questions
      }

      // Generate a new document ID inside the questions subcollection
      const newQuestionRef = quizRef.collection("questions").doc();
      
      currentBatch.set(newQuestionRef, {
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: Number(q.correctAnswerIndex),
        createdAt: new Date(),
      });

      operationCount++;

      // If we hit the Firestore batch limit, commit and start a new batch
      if (operationCount >= MAX_BATCH_SIZE) {
        await currentBatch.commit();
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining items in the final batch
    if (operationCount > 0) {
      await currentBatch.commit();
    }

    // 7. Update the total question count on the parent Quiz document
    // FieldValue.increment ensures atomic accuracy even if multiple admins upload at once
    await quizRef.update({
      questionCount: FieldValue.increment(questions.length),
      updatedAt: new Date(),
    });

    // 8. Return Success
    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${questions.length} questions to the database.` 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}