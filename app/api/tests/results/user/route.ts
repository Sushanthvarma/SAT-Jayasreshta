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
    // Fetch all and sort in memory to avoid index requirement
    const resultsRef = adminDb.collection('testResults');
    let snapshot;
    
    try {
      // Try with orderBy first (if index exists)
      // With Blaze plan, we can fetch all results without limits
      const resultsQuery = resultsRef
        .where('userId', '==', userId)
        .orderBy('completedAt', 'desc');
      snapshot = await resultsQuery.get();
    } catch (error: any) {
      // If index doesn't exist, fetch all and sort in memory
      console.warn('⚠️ Firestore index not found, fetching all and sorting in memory:', error.message);
      const allResults = await resultsRef.where('userId', '==', userId).get();
      const sortedDocs = allResults.docs.sort((a, b) => {
        const aTime = (a.data().completedAt as any)?.toDate()?.getTime() || 0;
        const bTime = (b.data().completedAt as any)?.toDate()?.getTime() || 0;
        return bTime - aTime; // Descending
      });
      snapshot = {
        docs: sortedDocs,
        empty: sortedDocs.length === 0,
      } as any;
    }
    
    const results: TestResult[] = snapshot.docs.map((doc: any) => {
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
