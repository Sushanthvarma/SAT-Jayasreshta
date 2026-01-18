/**
 * API Route: GET /api/tests
 * Returns list of published tests available to students
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Test } from '@/lib/types/test';

export async function GET(req: NextRequest) {
  try {
    const testsRef = adminDb.collection('tests');
    
    // Query for published and active tests
    const q = testsRef
      .where('status', '==', 'published')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc');
    
    const snapshot = await q.get();
    
    const tests: Test[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as any)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
        publishedAt: (data.publishedAt as any)?.toDate(),
      } as Test;
    });
    
    return NextResponse.json({
      success: true,
      tests,
      count: tests.length,
    });
  } catch (error: any) {
    console.error('Error fetching tests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tests',
      },
      { status: 500 }
    );
  }
}
