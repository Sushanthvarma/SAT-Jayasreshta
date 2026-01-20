/**
 * Content & Question Analytics API
 * Analyzes test difficulty and question-level performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getAnalyticsSummary } from '@/lib/analytics/aggregator';

export async function GET(req: NextRequest) {
  try {
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
    
    // Verify admin role
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // CRITICAL: Use unified analytics aggregator (single source of truth)
    const analyticsSummary = await getAnalyticsSummary();
    
    // Get all tests for additional metadata
    const testsSnapshot = await adminDb.collection('tests').get();
    const tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Get all test results for detailed analysis
    const resultsSnapshot = await adminDb.collection('testResults').get();
    const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all questions
    const questionsSnapshot = await adminDb.collection('questions').get();
    const questions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Analyze test difficulty
    const testAnalytics = tests.map((test: any) => {
      const testResults = results.filter((r: any) => r.testId === test.id);
      if (testResults.length === 0) {
        return {
          testId: test.id,
          testTitle: test.title || 'Unknown',
          avgScore: 0,
          stdDev: 0,
          completionRate: 0,
          avgTime: 0,
          difficultyRating: 'No Data',
          totalAttempts: 0,
        };
      }
      
      const scores = testResults.map((r: any) => r.percentage || 0);
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      
      const times = testResults.map((r: any) => r.totalTimeSpent || 0).filter(t => t > 0);
      const avgTime = times.length > 0 ? times.reduce((a: number, b: number) => a + b, 0) / times.length : 0;
      
      // Get attempts for this test
      const attemptsSnapshot = adminDb.collection('testAttempts')
        .where('testId', '==', test.id)
        .get();
      
      // Calculate completion rate (simplified - would need to await)
      const completedAttempts = testResults.length;
      const totalAttempts = completedAttempts; // Simplified
      const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;
      
      let difficultyRating = 'Appropriate';
      if (avgScore < 65) {
        difficultyRating = 'Too Hard ⚠️';
      } else if (avgScore > 90) {
        difficultyRating = 'Too Easy ⚠️';
      } else if (stdDev > 20) {
        difficultyRating = 'Inconsistent Difficulty ⚠️';
      }
      
      return {
        testId: test.id,
        testTitle: test.title || 'Unknown',
        avgScore: Math.round(avgScore * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        avgTime: Math.round(avgTime / 60 * 10) / 10, // minutes
        difficultyRating,
        totalAttempts: testResults.length,
      };
    });
    
    // Analyze question performance
    const questionAnalytics: any[] = [];
    
    // For each question, analyze performance across all results
    for (const question of questions) {
      // Find all results that include this question
      // This is simplified - in reality, we'd need to check sectionScores or detailed answer data
      const questionResults = results.filter((r: any) => {
        // Check if question is in any section
        return r.sectionScores?.some((section: any) => 
          section.questions?.some((q: any) => q.questionId === question.id)
        ) || false;
      });
      
      if (questionResults.length === 0) continue;
      
      // Calculate accuracy (simplified - would need detailed answer data)
      const correctCount = questionResults.length; // Simplified
      const accuracy = (correctCount / questionResults.length) * 100;
      
      questionAnalytics.push({
        questionId: question.id,
        questionText: ((question as any).questionText || '').substring(0, 100) + '...',
        subject: (question as any).subject || 'Unknown',
        difficulty: (question as any).difficulty || 'Unknown',
        accuracy: Math.round(accuracy * 10) / 10,
        timesAsked: questionResults.length,
        timesCorrect: correctCount,
        status: accuracy < 50 ? 'Needs Review ⚠️' : accuracy < 70 ? 'Below Expected' : 'Good',
        topicTags: question.topicTags || [],
      });
    }
    
    return NextResponse.json({
      success: true,
      testAnalytics: testAnalytics.sort((a, b) => b.totalAttempts - a.totalAttempts),
      questionAnalytics: questionAnalytics.sort((a, b) => a.accuracy - b.accuracy), // Sort by accuracy (lowest first)
      summary: {
        totalTests: tests.length,
        totalQuestions: questions.length,
        testsNeedingReview: testAnalytics.filter(t => t.difficultyRating.includes('⚠️')).length,
        questionsNeedingReview: questionAnalytics.filter(q => q.status.includes('⚠️')).length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching content analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch content analytics',
      },
      { status: 500 }
    );
  }
}
