/**
 * API Route: GET /api/tests/[id]
 * Returns detailed information about a specific test
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Test, Question } from '@/lib/types/test';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let testId = resolvedParams.id;
    
    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID is required' },
        { status: 400 }
      );
    }
    
    // Decode URL-encoded test ID
    testId = decodeURIComponent(testId);
    
    console.log(`🔍 Fetching test: ${testId}`);
    console.log(`   Test ID type: ${typeof testId}, length: ${testId.length}`);
    console.log(`   Raw test ID: "${resolvedParams.id}"`);
    console.log(`   Decoded test ID: "${testId}"`);
    
    // Get test document using Firestore v8 API (consistent with other routes)
    const testRef = adminDb.collection('tests').doc(testId);
    const testSnap = await testRef.get();
    
    if (!testSnap.exists) {
      console.error(`❌ Test not found: ${testId}`);
      
      // Try to find tests with similar IDs for debugging
      try {
        const allTestsSnap = await adminDb.collection('tests').limit(5).get();
        const testIds = allTestsSnap.docs.map(doc => doc.id);
        console.error(`   Available test IDs (first 5):`, testIds);
        console.error(`   Looking for: "${testId}"`);
        
        // Check if there's a partial match
        const partialMatch = testIds.find(id => id.includes(testId) || testId.includes(id));
        if (partialMatch) {
          console.error(`   ⚠️  Found partial match: "${partialMatch}"`);
        }
      } catch (debugError) {
        console.error(`   Could not fetch test list for debugging:`, debugError);
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Test not found: ${testId}`,
          debug: process.env.NODE_ENV === 'development' ? {
            requestedId: testId,
            idType: typeof testId,
            idLength: testId.length,
          } : undefined,
        },
        { status: 404 }
      );
    }
    
    const testData = testSnap.data()!;
    console.log(`✅ Test found: ${testData?.title || 'Untitled'}`);
    console.log(`   Status: ${testData?.status}, Active: ${testData?.isActive}`);
    
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
      console.error(`❌ Test not available: status=${test.status}, isActive=${test.isActive}`);
      return NextResponse.json(
        { success: false, error: 'Test is not available. It may not be published or activated yet.' },
        { status: 403 }
      );
    }
    
    let questions: Question[] = [];
    
    // Optionally include questions (for test-taking interface)
    if (includeQuestions) {
      console.log(`📝 Fetching questions for test: ${testId}`);
      try {
        // Try subcollection structure first
        // Fetch all questions without orderBy to avoid index requirement, then sort in memory
        const questionsRef = adminDb.collection('tests').doc(testId).collection('questions');
        const questionsSnap = await questionsRef.get();
        
        console.log(`📊 Raw query result: ${questionsSnap.size} documents found`);
        
        if (questionsSnap.size > 0) {
          questions = questionsSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as any)?.toDate() || new Date(),
              updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
            } as Question;
          });
          
          // Sort in memory: first by sectionNumber, then by questionNumber
          questions.sort((a, b) => {
            const sectionDiff = (a.sectionNumber || 0) - (b.sectionNumber || 0);
            if (sectionDiff !== 0) return sectionDiff;
            return (a.questionNumber || 0) - (b.questionNumber || 0);
          });
          
          console.log(`✅ Found ${questions.length} questions in subcollection (sorted in memory)`);
        } else {
          console.warn(`⚠️ No questions found in subcollection, trying alternative structure...`);
          
          // Alternative: Check if questions are stored in a questions collection with testId field
          try {
            const altQuestionsRef = adminDb.collection('questions');
            const altQuestionsSnap = await altQuestionsRef
              .where('testId', '==', testId)
              .get();
            
            if (altQuestionsSnap.size > 0) {
              questions = altQuestionsSnap.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: (data.createdAt as any)?.toDate() || new Date(),
                  updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
                } as Question;
              });
              
              // Sort in memory
              questions.sort((a, b) => {
                const sectionDiff = (a.sectionNumber || 0) - (b.sectionNumber || 0);
                if (sectionDiff !== 0) return sectionDiff;
                return (a.questionNumber || 0) - (b.questionNumber || 0);
              });
              
              console.log(`✅ Found ${questions.length} questions in alternative structure`);
            } else {
              console.error(`❌ No questions found in either structure for test: ${testId}`);
              console.error(`   This test may not have been imported with questions, or questions failed to save.`);
            }
          } catch (altError: any) {
            console.error(`❌ Error checking alternative structure:`, altError);
          }
        }
      } catch (questionsError: any) {
        console.error(`❌ Error fetching questions:`, questionsError);
        console.error(`   Error code: ${questionsError.code}, message: ${questionsError.message}`);
        console.error(`   Stack:`, questionsError.stack);
        // Continue without questions - test can still load
        // The error might be due to permission issues
      }
      
      if (questions.length === 0) {
        console.error(`⚠️ WARNING: Test "${test.title}" has no questions!`);
        console.error(`   Test ID: ${testId}`);
        console.error(`   This test cannot be taken without questions.`);
      }
    }
    
    return NextResponse.json({
      success: true,
      test,
      questions: includeQuestions ? questions : undefined,
    });
  } catch (error: any) {
    console.error('❌ Error fetching test:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
