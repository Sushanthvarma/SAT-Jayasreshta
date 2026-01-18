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
    
    // Fetch all tests and filter/sort in memory to avoid index requirement
    // This works immediately but is less efficient for large datasets
    // For better performance, create a composite index:
    // Collection: tests
    // Fields: isActive (Ascending), status (Ascending), createdAt (Descending)
    const snapshot = await testsRef.get();
    
    const tests: Test[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const test = {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as any)?.toDate() || new Date(),
          updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
          publishedAt: (data.publishedAt as any)?.toDate(),
        } as Test;
        
        // Log test ID for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`   Test ID: ${test.id}, Title: ${test.title}, Status: ${test.status}, Active: ${test.isActive}`);
        }
        
        return test;
      })
      .filter((test) => test.status === 'published' && test.isActive === true)
      .sort((a, b) => {
        // Sort by createdAt descending
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
    
    console.log(`✅ Found ${tests.length} published and active tests`);
    
    return NextResponse.json({
      success: true,
      tests,
      count: tests.length,
    });
  } catch (error: any) {
    console.error('Error fetching tests:', error);
    
    // If error mentions index, provide helpful message
    if (error.message?.includes('index')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firestore index required. Please create a composite index for tests collection with fields: isActive, status, createdAt',
          indexUrl: error.details || 'https://console.firebase.google.com/project/sat-mock-test-platform/firestore/indexes',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tests',
      },
      { status: 500 }
    );
  }
}
