/**
 * API Route: POST /api/tests/[id]/start
 * Starts a new test attempt for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getTestByIdAdmin } from '@/lib/firestore/tests-server';
import { TestAttempt } from '@/lib/types/test';

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
    
    // Get test
    const test = await getTestByIdAdmin(testId);
    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    // Check if test is available
    if (test.status !== 'published' || !test.isActive) {
      return NextResponse.json(
        { success: false, error: 'Test is not available' },
        { status: 403 }
      );
    }
    
    // Check for existing in-progress attempts
    const existingAttemptsRef = adminDb.collection('testAttempts');
    const existingQuery = existingAttemptsRef
      .where('testId', '==', testId)
      .where('userId', '==', userId)
      .where('status', 'in', ['not-started', 'in-progress', 'paused']);
    
    const existingSnap = await existingQuery.get();
    
    if (!existingSnap.empty) {
      // Return existing attempt
      const existingDoc = existingSnap.docs[0];
      const existingData = existingDoc.data();
      
      const attempt: TestAttempt = {
        id: existingDoc.id,
        ...existingData,
        startedAt: (existingData.startedAt as any)?.toDate() || new Date(),
        submittedAt: (existingData.submittedAt as any)?.toDate(),
        expiresAt: (existingData.expiresAt as any)?.toDate(),
        sections: existingData.sections?.map((section: any) => ({
          ...section,
          startedAt: section.startedAt?.toDate(),
          completedAt: section.completedAt?.toDate(),
          answers: section.answers?.map((answer: any) => ({
            ...answer,
            answeredAt: answer.answeredAt?.toDate(),
          })) || [],
        })) || [],
        answers: existingData.answers?.map((answer: any) => ({
          ...answer,
          answeredAt: answer.answeredAt?.toDate(),
        })) || [],
      } as TestAttempt;
      
      return NextResponse.json({
        success: true,
        attempt,
        message: 'Resuming existing attempt',
      });
    }
    
    // Create new attempt
    const attemptsRef = adminDb.collection('testAttempts');
    const attemptRef = attemptsRef.doc();
    
    // Create initial section attempts
    const sections: TestAttempt['sections'] = test.sections.map((section) => ({
      sectionId: section.id,
      sectionNumber: section.sectionNumber,
      status: 'not-started' as const,
      timeSpent: 0,
      answers: [],
    }));
    
    // Calculate expiration time (test time limit + 5 minutes buffer)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + test.totalTimeLimit + 300);
    
    const attempt: Omit<TestAttempt, 'id'> = {
      testId,
      userId,
      status: 'not-started',
      startedAt: new Date(),
      expiresAt,
      currentSection: 1,
      sections,
      totalTimeSpent: 0,
      timeRemaining: test.totalTimeLimit,
      answers: [],
    };
    
    await attemptRef.set({
      ...attempt,
      startedAt: Timestamp.fromDate(attempt.startedAt),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    
    return NextResponse.json({
      success: true,
      attempt: {
        id: attemptRef.id,
        ...attempt,
      },
      message: 'Test attempt started',
    });
  } catch (error: any) {
    console.error('Error starting test attempt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start test attempt',
      },
      { status: 500 }
    );
  }
}
