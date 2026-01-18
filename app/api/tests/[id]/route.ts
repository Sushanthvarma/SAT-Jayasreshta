/**
 * API Route: GET /api/tests/[id]
 * Returns detailed information about a specific test
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Test, Question } from '@/lib/types/test';

export async function GET(
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
    
    // Get test document
    const testRef = adminDb.collection('tests').doc(testId);
    const testSnap = await testRef.get();
    
    if (!testSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    const testData = testSnap.data()!;
    const test: Test = {
      id: testSnap.id,
      ...testData,
      createdAt: (testData.createdAt as any)?.toDate() || new Date(),
      updatedAt: (testData.updatedAt as any)?.toDate() || new Date(),
      publishedAt: (testData.publishedAt as any)?.toDate(),
    } as Test;
    
    // Check if test is published and active (for students)
    const searchParams = req.nextUrl.searchParams;
    const includeQuestions = searchParams.get('includeQuestions') === 'true';
    
    // Only return test if it's published and active (unless admin)
    if (test.status !== 'published' || !test.isActive) {
      return NextResponse.json(
        { success: false, error: 'Test is not available' },
        { status: 403 }
      );
    }
    
    let questions: Question[] = [];
    
    // Optionally include questions (for test-taking interface)
    if (includeQuestions) {
      const questionsRef = adminDb.collection('tests').doc(testId).collection('questions');
      const questionsSnap = await questionsRef
        .orderBy('sectionNumber', 'asc')
        .orderBy('questionNumber', 'asc')
        .get();
      
      questions = questionsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as any)?.toDate() || new Date(),
          updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
        } as Question;
      });
    }
    
    return NextResponse.json({
      success: true,
      test,
      questions: includeQuestions ? questions : undefined,
    });
  } catch (error: any) {
    console.error('Error fetching test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test',
      },
      { status: 500 }
    );
  }
}
