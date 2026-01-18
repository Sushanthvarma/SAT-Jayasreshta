/**
 * API Route: POST /api/tests/[id]/submit
 * Submits a test attempt and calculates results
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getTestByIdAdmin, saveTestResult } from '@/lib/firestore/tests-server';
import { calculateTestResult } from '@/lib/scoring/calculator';
import { TestAttempt, Question } from '@/lib/types/test';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;
    
    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID is required' },
        { status: 400 }
      );
    }
    
    // Get authentication token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const idToken = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || '';
    const userName = decodedToken.name || 'Student';
    
    // Get request body
    const body = await req.json();
    const { attemptId } = body;
    
    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required' },
        { status: 400 }
      );
    }
    
    // Get test
    const test = await getTestByIdAdmin(testId);
    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    // Get attempt
    const attemptRef = adminDb.collection('testAttempts').doc(attemptId);
    const attemptSnap = await attemptRef.get();
    
    if (!attemptSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found' },
        { status: 404 }
      );
    }
    
    const attemptData = attemptSnap.data()!;
    
    // Verify attempt belongs to user
    if (attemptData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Verify attempt is for this test
    if (attemptData.testId !== testId) {
      return NextResponse.json(
        { success: false, error: 'Attempt does not match test' },
        { status: 400 }
      );
    }
    
    // Check if already submitted
    if (attemptData.status === 'submitted') {
      return NextResponse.json(
        { success: false, error: 'Test already submitted' },
        { status: 400 }
      );
    }
    
    // Get questions
    const questionsRef = adminDb.collection('tests').doc(testId).collection('questions');
    const questionsSnap = await questionsRef
      .orderBy('sectionNumber', 'asc')
      .orderBy('questionNumber', 'asc')
      .get();
    
    const questions: Question[] = questionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as any)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
      } as Question;
    });
    
    // Reconstruct attempt object
    const attempt: TestAttempt = {
      id: attemptSnap.id,
      ...attemptData,
      startedAt: (attemptData.startedAt as any)?.toDate() || new Date(),
      submittedAt: new Date(),
      expiresAt: (attemptData.expiresAt as any)?.toDate(),
      sections: attemptData.sections?.map((section: any) => ({
        ...section,
        startedAt: section.startedAt?.toDate(),
        completedAt: section.completedAt?.toDate(),
        answers: section.answers?.map((answer: any) => ({
          ...answer,
          answeredAt: answer.answeredAt?.toDate(),
        })) || [],
      })) || [],
      answers: attemptData.answers?.map((answer: any) => ({
        ...answer,
        answeredAt: answer.answeredAt?.toDate(),
      })) || [],
    } as TestAttempt;
    
    // Calculate results
    const resultData = await calculateTestResult(test, attempt, questions);
    resultData.userName = userName;
    resultData.userEmail = userEmail;
    
    // Save result
    const resultId = await saveTestResult(resultData);
    
    // Update attempt status
    await attemptRef.update({
      status: 'submitted',
      submittedAt: Timestamp.now(),
    });
    
    // Update user's test count
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists()) {
      const currentCount = userSnap.data()?.totalTestsCompleted || 0;
      await userRef.update({
        totalTestsCompleted: currentCount + 1,
        lastTestDate: Timestamp.now(),
      });
    }
    
    // Update gamification (streaks, badges)
    try {
      const gamificationResponse = await fetch(`${req.nextUrl.origin}/api/gamification/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testScore: resultData.percentage,
          testCompleted: true,
        }),
      });
      
      const gamificationData = await gamificationResponse.json();
      
      return NextResponse.json({
        success: true,
        result: {
          id: resultId,
          ...resultData,
        },
        gamification: gamificationData,
        message: 'Test submitted successfully',
      });
    } catch (gamificationError) {
      // Continue even if gamification fails
      console.error('Gamification update failed:', gamificationError);
      
      return NextResponse.json({
        success: true,
        result: {
          id: resultId,
          ...resultData,
        },
        message: 'Test submitted successfully',
      });
    }
  } catch (error: any) {
    console.error('Error submitting test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit test',
      },
      { status: 500 }
    );
  }
}
