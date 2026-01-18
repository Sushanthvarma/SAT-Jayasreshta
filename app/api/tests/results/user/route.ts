/**
 * API Route: GET /api/tests/results/user
 * Returns all test results for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { TestResult } from '@/lib/types/test';

export async function GET(req: NextRequest) {
  try {
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
    
    // Get user's test results
    const resultsRef = adminDb.collection('testResults');
    const resultsQuery = resultsRef
      .where('userId', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(50);
    
    const snapshot = await resultsQuery.get();
    
    const results: TestResult[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        completedAt: (data.completedAt as any)?.toDate() || new Date(),
        submittedAt: (data.submittedAt as any)?.toDate() || new Date(),
        createdAt: (data.createdAt as any)?.toDate() || new Date(),
      } as TestResult;
    });
    
    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error fetching user results:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test results',
      },
      { status: 500 }
    );
  }
}
