/**
 * API Route: POST /api/tests/[id]/start
 * Starts a new test attempt for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getTestByIdAdmin } from '@/lib/firestore/tests-server';
import { TestAttempt } from '@/lib/types/test';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let testId = resolvedParams.id;
    
    // Decode URL-encoded test ID
    testId = decodeURIComponent(testId);
    
    console.log(`🚀 Starting test attempt for test: ${testId}`);
    
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
    
    // Get test directly from Firestore (more reliable)
    const testRef = adminDb.collection('tests').doc(testId);
    const testSnap = await testRef.get();
    
    if (!testSnap.exists) {
      console.error(`❌ Test not found: ${testId}`);
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    const testData = testSnap.data()!;
    const test = {
      id: testSnap.id,
      ...testData,
      createdAt: (testData.createdAt as any)?.toDate() || new Date(),
      updatedAt: (testData.updatedAt as any)?.toDate() || new Date(),
      publishedAt: (testData.publishedAt as any)?.toDate(),
    } as any;
    
    console.log(`✅ Test found: ${test.title}, Status: ${test.status}, Active: ${test.isActive}`);
    
    // Check if test is available
    if (test.status !== 'published' || !test.isActive) {
      return NextResponse.json(
        { success: false, error: 'Test is not available' },
        { status: 403 }
      );
    }
    
    // Check for existing in-progress attempts
    // Note: Using separate queries to avoid index requirement
    console.log(`🔍 Checking for existing attempts...`);
    const existingAttemptsRef = adminDb.collection('testAttempts');
    
    // Try query with status filter first
    let existingSnap: any;
    try {
      const existingQuery = existingAttemptsRef
        .where('testId', '==', testId)
        .where('userId', '==', userId)
        .where('status', 'in', ['not-started', 'in-progress', 'paused']);
      existingSnap = await existingQuery.get();
    } catch (indexError: any) {
      // If index error, fetch all attempts and filter in memory
      console.log(`⚠️  Index not available, fetching all attempts and filtering...`);
      const allAttempts = await existingAttemptsRef
        .where('testId', '==', testId)
        .where('userId', '==', userId)
        .get();
      
      existingSnap = {
        empty: true,
        docs: [],
      } as any;
      
      // Filter in memory
      allAttempts.docs.forEach(doc => {
        const data = doc.data();
        if (['not-started', 'in-progress', 'paused'].includes(data.status)) {
          if (!existingSnap.docs) {
            existingSnap.docs = [];
          }
          existingSnap.docs.push(doc);
          existingSnap.empty = false;
        }
      });
    }
    
    if (!existingSnap.empty && existingSnap.docs && existingSnap.docs.length > 0) {
      // Return existing attempt
      const existingDoc = existingSnap.docs[0];
      console.log(`✅ Found existing attempt: ${existingDoc.id}`);
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
    console.log(`📝 Creating new test attempt...`);
    const attemptsRef = adminDb.collection('testAttempts');
    const attemptRef = attemptsRef.doc();
    
    // Create initial section attempts
    const sections: TestAttempt['sections'] = (test.sections || []).map((section: any) => ({
      sectionId: section.id,
      sectionNumber: section.sectionNumber || 1,
      status: 'not-started' as const,
      timeSpent: 0,
      answers: [],
    }));
    
    // Calculate expiration time (test time limit + 5 minutes buffer)
    const totalTimeLimit = test.totalTimeLimit || 3600; // Default 1 hour if not set
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + totalTimeLimit + 300);
    
    const attempt: Omit<TestAttempt, 'id'> = {
      testId,
      userId,
      status: 'not-started',
      startedAt: new Date(),
      expiresAt,
      currentSection: 1,
      sections,
      totalTimeSpent: 0,
      timeRemaining: totalTimeLimit,
      answers: [],
    };
    
    console.log(`💾 Saving attempt to Firestore...`);
    await attemptRef.set({
      ...attempt,
      startedAt: Timestamp.fromDate(attempt.startedAt as Date),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    
    console.log(`✅ Test attempt created: ${attemptRef.id}`);
    
    // CRITICAL: Update user progress to track current test
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const progress = userData?.progress || {};
        
        // Update currentTestId atomically
        await userRef.update({
          'progress.currentTestId': testId,
          'lastActive': FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ User progress updated: currentTestId = ${testId}`);
      }
    } catch (progressError: any) {
      // Non-critical - log but don't fail test start
      console.warn('⚠️ Failed to update user progress (non-critical):', progressError.message);
    }
    
    return NextResponse.json({
      success: true,
      attempt: {
        id: attemptRef.id,
        ...attempt,
      },
      message: 'Test attempt started',
    });
  } catch (error: any) {
    console.error('❌ Error starting test attempt:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start test attempt',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
