/**
 * API Route: GET /api/tests/results/[attemptId]
 * Returns test results for a specific attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { TestResult } from '@/lib/types/test';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> | { attemptId: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let attemptId = resolvedParams.attemptId;
    
    // Decode URL-encoded attempt ID
    attemptId = decodeURIComponent(attemptId);
    
    console.log(`📊 Fetching result for attempt: ${attemptId}`);
    
    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required' },
        { status: 400 }
      );
    }
    
    // Get authentication token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Try to get from cookie or allow if public (for now)
      // In production, you might want stricter auth
    }
    
    // Get attempt to verify ownership
    const attemptRef = adminDb.collection('testAttempts').doc(attemptId);
    const attemptSnap = await attemptRef.get();
    
    if (!attemptSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found' },
        { status: 404 }
      );
    }
    
    const attemptData = attemptSnap.data()!;
    
    // Verify authentication if header provided
    if (authHeader) {
      const idToken = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (decodedToken.uid !== attemptData.userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 403 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }
    
    // Get result - try by attemptId first, then by result ID if attemptId is actually a result ID
    const resultsRef = adminDb.collection('testResults');
    let resultsSnapshot;
    
    // First try: search by attemptId
    try {
      const resultsQuery = resultsRef.where('attemptId', '==', attemptId).limit(1);
      resultsSnapshot = await resultsQuery.get();
    } catch (error: any) {
      // If index doesn't exist, try fetching by document ID
      console.warn('⚠️ Firestore index not found for attemptId query, trying by document ID:', error.message);
      try {
        const resultDoc = await resultsRef.doc(attemptId).get();
        if (resultDoc.exists) {
          resultsSnapshot = {
            docs: [resultDoc],
            empty: false,
          } as any;
        } else {
          resultsSnapshot = { docs: [], empty: true } as any;
        }
      } catch (docError) {
        resultsSnapshot = { docs: [], empty: true } as any;
      }
    }
    
    if (resultsSnapshot.empty) {
      console.error(`❌ Test result not found for attemptId: ${attemptId}`);
      // Try to find any results for this user to help debug
      const userResults = await resultsRef.where('userId', '==', attemptData.userId).limit(5).get();
      console.log(`   Found ${userResults.size} results for this user`);
      if (userResults.size > 0) {
        userResults.docs.forEach(doc => {
          const data = doc.data();
          console.log(`   Result ID: ${doc.id}, attemptId: ${data.attemptId}, testId: ${data.testId}`);
        });
      }
      
      return NextResponse.json(
        { success: false, error: `Test result not found for attempt ${attemptId}. The result may not have been saved correctly.` },
        { status: 404 }
      );
    }
    
    const resultDoc = resultsSnapshot.docs[0];
    const resultData = resultDoc.data();
    
    const result: TestResult = {
      id: resultDoc.id,
      ...resultData,
      completedAt: (resultData.completedAt as any)?.toDate() || new Date(),
      submittedAt: (resultData.submittedAt as any)?.toDate() || new Date(),
      createdAt: (resultData.createdAt as any)?.toDate() || new Date(),
    } as TestResult;
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error fetching test result:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test result',
      },
      { status: 500 }
    );
  }
}
