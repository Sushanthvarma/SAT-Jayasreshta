/**
 * API Route: POST /api/tests/[id]/submit
 * Submits a test attempt and calculates results
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getTestByIdAdmin, saveTestResult } from '@/lib/firestore/tests-server';
import { calculateTestResult } from '@/lib/scoring/calculator';
import { TestAttempt, Question } from '@/lib/types/test';

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
    
    console.log(`📤 Submitting test: ${testId}`);
    
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
    const userEmail = decodedToken.email || '';
    const userName = decodedToken.name || 'Student';
    
    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { attemptId, answers: clientAnswers, totalTimeSpent: clientTotalTimeSpent } = body;
    
    if (!attemptId) {
      console.error('❌ Attempt ID missing in request body');
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Attempt ID: ${attemptId}`);
    console.log(`📋 Client provided ${clientAnswers?.length || 0} answers`);
    
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
    
    console.log(`✅ Test found: ${test.title}`);
    
    // Get attempt
    const attemptRef = adminDb.collection('testAttempts').doc(attemptId);
    const attemptSnap = await attemptRef.get();
    
    if (!attemptSnap.exists) {
      console.error(`❌ Attempt not found: ${attemptId}`);
      return NextResponse.json(
        { success: false, error: 'Test attempt not found' },
        { status: 404 }
      );
    }
    
    const attemptData = attemptSnap.data()!;
    console.log(`✅ Attempt found: ${attemptId}, status: ${attemptData.status}`);
    
    // Verify attempt belongs to user
    if (attemptData.userId !== userId) {
      console.error(`❌ User mismatch: attempt userId=${attemptData.userId}, current userId=${userId}`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized: This attempt does not belong to you' },
        { status: 403 }
      );
    }
    
    // Verify attempt is for this test
    if (attemptData.testId !== testId) {
      console.error(`❌ Test mismatch: attempt testId=${attemptData.testId}, current testId=${testId}`);
      return NextResponse.json(
        { success: false, error: 'Attempt does not match test' },
        { status: 400 }
      );
    }
    
    // Check if already submitted
    if (attemptData.status === 'submitted') {
      console.warn(`⚠️ Attempt already submitted: ${attemptId}`);
      // If already submitted, return the existing result instead of error
      const resultRef = adminDb.collection('testResults').where('attemptId', '==', attemptId).limit(1);
      const resultSnap = await resultRef.get();
      
      if (!resultSnap.empty) {
        const existingResult = resultSnap.docs[0].data();
        return NextResponse.json({
          success: true,
          result: {
            id: resultSnap.docs[0].id,
            ...existingResult,
          },
          message: 'Test was already submitted. Returning existing result.',
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Test already submitted but no result found. Please contact support.' },
        { status: 400 }
      );
    }
    
    console.log(`✅ Attempt validated: userId matches, testId matches, status=${attemptData.status}`);
    
    // Get questions (fetch all and sort in memory to avoid index requirement)
    console.log(`📝 Fetching questions for scoring...`);
    const questionsRef = adminDb.collection('tests').doc(testId).collection('questions');
    const questionsSnap = await questionsRef.get();
    
    console.log(`📊 Found ${questionsSnap.size} questions`);
    
    const questions: Question[] = questionsSnap.docs.map((doc) => {
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
    
    if (questions.length === 0) {
      console.error(`❌ No questions found for test: ${testId}`);
      return NextResponse.json(
        { success: false, error: 'Test has no questions. Cannot submit.' },
        { status: 400 }
      );
    }
    
    console.log(`✅ Loaded ${questions.length} questions for scoring`);
    
    // Merge client answers with attempt data (client answers take precedence)
    const finalAnswers = clientAnswers && clientAnswers.length > 0 
      ? clientAnswers 
      : (attemptData.answers?.map((answer: any) => ({
          ...answer,
          answeredAt: answer.answeredAt?.toDate(),
        })) || []);
    
    console.log(`📊 Using ${finalAnswers.length} answers for scoring`);
    
    // Calculate totalTimeSpent if not provided by client
    // Use client value if provided, otherwise calculate from time remaining or elapsed time
    let calculatedTotalTimeSpent = clientTotalTimeSpent;
    if (!calculatedTotalTimeSpent || calculatedTotalTimeSpent === 0) {
      // Try method 1: Calculate from time remaining
      const initialTimeLimit = test.totalTimeLimit || 0;
      const currentTimeRemaining = attemptData.timeRemaining || 0;
      calculatedTotalTimeSpent = Math.max(0, initialTimeLimit - currentTimeRemaining);
      
      // Method 2: Calculate from actual elapsed time (more accurate)
      if (attemptData.startedAt) {
        const startedAt = (attemptData.startedAt as any)?.toDate() || new Date();
        const elapsedTime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        // Use elapsed time if it's more reasonable (not negative and not too large)
        if (elapsedTime > 0 && elapsedTime <= initialTimeLimit + 300) { // Allow 5 min buffer
          calculatedTotalTimeSpent = elapsedTime;
          console.log(`⏱️ Calculated totalTimeSpent from elapsed time: ${elapsedTime} seconds`);
        } else {
          console.log(`⏱️ Calculated totalTimeSpent from time remaining: ${initialTimeLimit} - ${currentTimeRemaining} = ${calculatedTotalTimeSpent} seconds`);
        }
      } else {
        console.log(`⏱️ Calculated totalTimeSpent from time remaining: ${initialTimeLimit} - ${currentTimeRemaining} = ${calculatedTotalTimeSpent} seconds`);
      }
    } else {
      console.log(`⏱️ Using client-provided totalTimeSpent: ${calculatedTotalTimeSpent} seconds`);
    }
    
    // Reconstruct attempt object
    const attempt: TestAttempt = {
      id: attemptSnap.id,
      ...attemptData,
      startedAt: (attemptData.startedAt as any)?.toDate() || new Date(),
      submittedAt: new Date(),
      expiresAt: (attemptData.expiresAt as any)?.toDate(),
      totalTimeSpent: calculatedTotalTimeSpent, // Ensure totalTimeSpent is set
      sections: attemptData.sections?.map((section: any) => ({
        ...section,
        startedAt: section.startedAt?.toDate(),
        completedAt: section.completedAt?.toDate(),
        answers: section.answers?.map((answer: any) => ({
          ...answer,
          answeredAt: answer.answeredAt?.toDate(),
        })) || [],
      })) || [],
      answers: finalAnswers,
    } as TestAttempt;
    
    // Calculate results
    console.log(`🧮 Calculating test results...`);
    console.log(`   Attempt answers: ${attempt.answers?.length || 0}`);
    console.log(`   Questions: ${questions.length}`);
    
    const resultData = await calculateTestResult(test, attempt, questions);
    resultData.userName = userName;
    resultData.userEmail = userEmail;
    
    console.log(`✅ Results calculated: ${resultData.totalScore}/${resultData.maxScore} (${resultData.percentage}%)`);
    
    // Save result
    console.log(`💾 Saving test result...`);
    const resultId = await saveTestResult(resultData);
    console.log(`✅ Result saved: ${resultId}`);
    
    // Update attempt status and ensure totalTimeSpent is saved
    await attemptRef.update({
      status: 'submitted',
      submittedAt: Timestamp.now(),
      totalTimeSpent: calculatedTotalTimeSpent, // Use calculated time spent
    });
    console.log(`💾 Saved totalTimeSpent to attempt: ${calculatedTotalTimeSpent} seconds`);
    
    // Update user's test count
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const currentCount = userSnap.data()?.totalTestsCompleted || 0;
      await userRef.update({
        totalTestsCompleted: currentCount + 1,
        lastTestDate: Timestamp.now(),
      });
    }
    
    // Update gamification (streaks, badges, XP) - call directly instead of fetch
    let gamificationData = null;
    try {
      console.log(`🎮 Updating gamification for user: ${userId}`);
      
      // Import gamification functions
      const { checkBadges } = await import('@/lib/gamification/badges');
      const { updateStreakAfterTest } = await import('@/lib/gamification/streaks');
      const { calculateTestXP, calculateStreakBonus } = await import('@/lib/gamification/xp');
      const { updateUserXP } = await import('@/lib/gamification/leaderboard');
      const { updateDailyGoalXP } = await import('@/lib/gamification/daily-goals');
      const { FieldValue } = await import('firebase-admin/firestore');
      
      const userData = userSnap.data()!;
      const currentStreak = userData.currentStreak || 0;
      const longestStreak = userData.longestStreak || 0;
      const totalTestsCompleted = userData.totalTestsCompleted || 0;
      const badges = userData.badges || [];
      const lastTestDate = userData.lastTestDate;
      
      const updates: any = {};
      const newBadges: string[] = [];
      let xpGained = 0;
      let leveledUp = false;
      
      // Update streak
      const streakResult = updateStreakAfterTest(
        lastTestDate ? (lastTestDate as any).toDate() : null,
        currentStreak,
        longestStreak
      );
      
      updates.currentStreak = streakResult.currentStreak;
      updates.longestStreak = streakResult.longestStreak;
      updates.lastTestDate = Timestamp.now();
      
      // Calculate XP
      xpGained = calculateTestXP(resultData.totalScore, resultData.maxScore, resultData.totalTimeSpent || 0);
      const streakBonus = calculateStreakBonus(streakResult.currentStreak);
      xpGained += streakBonus;
      
      // Update XP and level
      const xpResult = await updateUserXP(userId, xpGained, 'test_completed');
      leveledUp = xpResult.leveledUp;
      updates.totalXP = xpResult.newTotalXP;
      updates.level = xpResult.newLevel;
      
      // Update daily goal
      const today = new Date().toISOString().split('T')[0];
      await updateDailyGoalXP(userId, today, xpGained);
      
      // Check for new badges
      const earnedBadges = checkBadges(
        totalTestsCompleted + 1,
        streakResult.currentStreak,
        resultData.totalScore,
        badges
      );
      
      if (earnedBadges.length > 0) {
        newBadges.push(...earnedBadges);
        updates.badges = [...badges, ...earnedBadges];
      }
      
      // Update average score
      const totalScore = userData.totalScore || 0;
      const newTotalScore = totalScore + resultData.totalScore;
      const newAverageScore = newTotalScore / (totalTestsCompleted + 1);
      updates.averageScore = Math.round(newAverageScore);
      updates.totalScore = newTotalScore;
      
      // Apply all updates
      if (Object.keys(updates).length > 0) {
        await userRef.update({
          ...updates,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`✅ Gamification updated: ${xpGained} XP, ${newBadges.length} badges, level ${updates.level}`);
      }
      
      gamificationData = {
        xpGained,
        leveledUp,
        newBadges,
        newLevel: updates.level,
        newTotalXP: updates.totalXP,
      };
    } catch (gamificationError: any) {
      // Continue even if gamification fails
      console.error('❌ Gamification update failed:', gamificationError);
      console.error('   Error details:', gamificationError.message);
    }
    
    return NextResponse.json({
      success: true,
      result: {
        id: resultId,
        ...resultData,
      },
      gamification: gamificationData,
      message: gamificationData?.newBadges?.length 
        ? `Test submitted! You earned ${gamificationData.xpGained} XP and ${gamificationData.newBadges.length} badge(s)!`
        : gamificationData?.leveledUp
        ? `Test submitted! Level up! You're now level ${gamificationData.newLevel}!`
        : `Test submitted! You earned ${gamificationData?.xpGained || 0} XP!`,
    });
  } catch (error: any) {
    console.error('❌ Error submitting test:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit test',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
