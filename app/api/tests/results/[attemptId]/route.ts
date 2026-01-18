/**
 * API Route: GET /api/tests/results/[attemptId]
 * Returns test results for a specific attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { TestResult } from '@/lib/types/test';

export async function GET(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = params.attemptId;
    
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
    
    if (!attemptSnap.exists()) {
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
    
    // Get result
    const resultsRef = adminDb.collection('testResults');
    const resultsQuery = resultsRef.where('attemptId', '==', attemptId).limit(1);
    const resultsSnapshot = await resultsQuery.get();
    
    if (resultsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Test result not found' },
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
