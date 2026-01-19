/**
 * API Route: POST /api/tests/[id]/submit
 * Submits a test attempt and calculates results
 * 
 * PRODUCTION-GRADE: Uses Firestore transactions for atomic operations
 * Prevents race conditions, ensures data consistency, handles rollbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
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
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { attemptId, answers: clientAnswers, totalTimeSpent: clientTotalTimeSpent } = body;
    
    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required' },
        { status: 400 }
      );
    }
    
    // Get test
    const test = await getTestByIdAdmin(testId);
    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }
    
    // Get attempt
    const attemptRef = adminDb.collection('testAttempts').doc(attemptId);
    const attemptSnap = await attemptRef.get();
    
    if (!attemptSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found' },
        { status: 404 }
      );
    }
    
    const attemptData = attemptSnap.data()!;
    
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
    
    // Check if already submitted - use transaction for atomic check
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
    let calculatedTotalTimeSpent = clientTotalTimeSpent;
    if (!calculatedTotalTimeSpent || calculatedTotalTimeSpent === 0) {
      const initialTimeLimit = test.totalTimeLimit || 0;
      const currentTimeRemaining = attemptData.timeRemaining || 0;
      calculatedTotalTimeSpent = Math.max(0, initialTimeLimit - currentTimeRemaining);
      
      if (attemptData.startedAt) {
        const startedAt = (attemptData.startedAt as any)?.toDate() || new Date();
        const elapsedTime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        if (elapsedTime > 0 && elapsedTime <= initialTimeLimit + 300) {
          calculatedTotalTimeSpent = elapsedTime;
          console.log(`⏱️ Calculated totalTimeSpent from elapsed time: ${elapsedTime} seconds`);
        } else {
          console.log(`⏱️ Calculated totalTimeSpent from time remaining: ${initialTimeLimit} - ${currentTimeRemaining} = ${calculatedTotalTimeSpent} seconds`);
        }
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
      totalTimeSpent: calculatedTotalTimeSpent,
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
    const resultData = await calculateTestResult(test, attempt, questions);
    resultData.userName = userName;
    resultData.userEmail = userEmail;
    
    console.log(`✅ Results calculated: ${resultData.totalScore}/${resultData.maxScore} (${resultData.percentage}%)`);
    
    // PRODUCTION-GRADE: Use Firestore transaction for atomic operations
    // This ensures: result saved, attempt updated, user stats updated - all or nothing
    const result = await adminDb.runTransaction(async (transaction) => {
      // Check if result already exists (prevent duplicates)
      const existingResultQuery = adminDb
        .collection('testResults')
        .where('attemptId', '==', attemptId)
        .limit(1);
      const existingResultSnap = await transaction.get(existingResultQuery);
      
      if (!existingResultSnap.empty) {
        throw new Error('DUPLICATE_SUBMISSION');
      }
      
      // Re-check attempt status within transaction (prevent race condition)
      const attemptDoc = await transaction.get(attemptRef);
      const currentAttemptData = attemptDoc.data();
      
      if (!currentAttemptData) {
        throw new Error('Attempt not found');
      }
      
      if (currentAttemptData.status === 'submitted') {
        throw new Error('ALREADY_SUBMITTED');
      }
      
      // Get user document for atomic updates
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data()!;
      
      // Create result document
      const resultRef = adminDb.collection('testResults').doc();
      transaction.set(resultRef, {
        ...resultData,
        createdAt: Timestamp.now(),
        completedAt: Timestamp.fromDate(
          resultData.completedAt instanceof Date ? resultData.completedAt : new Date(resultData.completedAt as any)
        ),
        submittedAt: Timestamp.fromDate(
          resultData.submittedAt instanceof Date ? resultData.submittedAt : new Date(resultData.submittedAt as any)
        ),
      });
      
      // Update attempt status atomically
      transaction.update(attemptRef, {
        status: 'submitted',
        submittedAt: Timestamp.now(),
        totalTimeSpent: calculatedTotalTimeSpent,
        answers: finalAnswers,
      });
      
      // Calculate gamification updates
      const { checkBadges } = await import('@/lib/gamification/badges');
      const { updateStreakAfterTest } = await import('@/lib/gamification/streaks');
      const { calculateTestXP, calculateStreakBonus, getLevelFromXP } = await import('@/lib/gamification/xp');
      
      const currentStreak = userData.currentStreak || 0;
      const longestStreak = userData.longestStreak || 0;
      const totalTestsCompleted = userData.totalTestsCompleted || 0;
      const badges = userData.badges || [];
      const lastTestDate = userData.lastTestDate;
      const currentXP = userData.totalXP || 0;
      const currentLevel = userData.level || 1;
      const totalScore = userData.totalScore || 0;
      
      // Update streak
      const streakResult = updateStreakAfterTest(
        lastTestDate ? (lastTestDate as any).toDate() : null,
        currentStreak,
        longestStreak
      );
      
      // Calculate XP
      let xpGained = calculateTestXP(resultData.totalScore, resultData.maxScore, calculatedTotalTimeSpent);
      const streakBonus = calculateStreakBonus(streakResult.currentStreak);
      xpGained += streakBonus;
      const newTotalXP = currentXP + xpGained;
      const newLevel = getLevelFromXP(newTotalXP);
      const leveledUp = newLevel > currentLevel;
      
      // Check for new badges
      const earnedBadges = checkBadges(
        totalTestsCompleted + 1,
        streakResult.currentStreak,
        resultData.totalScore,
        badges
      );
      
      // Calculate average score
      const newTotalScore = totalScore + resultData.totalScore;
      const newAverageScore = Math.round(newTotalScore / (totalTestsCompleted + 1));
      
      // Update user document atomically using FieldValue.increment for counters
      const userUpdates: any = {
        totalTestsCompleted: FieldValue.increment(1), // Atomic increment
        lastTestDate: Timestamp.now(),
        currentStreak: streakResult.currentStreak,
        longestStreak: Math.max(longestStreak, streakResult.currentStreak),
        totalXP: newTotalXP,
        level: newLevel,
        totalScore: newTotalScore,
        averageScore: newAverageScore,
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      if (earnedBadges.length > 0) {
        userUpdates.badges = FieldValue.arrayUnion(...earnedBadges);
      }
      
      transaction.update(userRef, userUpdates);
      
      // Update daily goal (separate collection, but log for tracking)
      const today = new Date().toISOString().split('T')[0];
      const dailyGoalRef = adminDb.collection('dailyGoals').doc(`${userId}_${today}`);
      const dailyGoalDoc = await transaction.get(dailyGoalRef);
      
      if (dailyGoalDoc.exists) {
        const goalData = dailyGoalDoc.data()!;
        const newCurrentXP = (goalData.currentXP || 0) + xpGained;
        transaction.update(dailyGoalRef, {
          currentXP: newCurrentXP,
          completed: newCurrentXP >= (goalData.targetXP || 100),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create daily goal if doesn't exist
        transaction.set(dailyGoalRef, {
          userId,
          date: today,
          targetXP: 100,
          currentXP: xpGained,
          completed: xpGained >= 100,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      
      // Log XP gain (non-critical, can fail without affecting submission)
      try {
        await adminDb.collection('xpLogs').add({
          userId,
          xpGained,
          reason: 'test_completed',
          totalXP: newTotalXP,
          level: newLevel,
          timestamp: FieldValue.serverTimestamp(),
        });
      } catch (logError) {
        console.warn('⚠️ Failed to log XP gain (non-critical):', logError);
      }
      
      return {
        resultId: resultRef.id,
        xpGained,
        leveledUp,
        newBadges: earnedBadges,
        newTotalXP,
        newLevel,
      };
    });
    
    console.log(`✅ Transaction completed successfully`);
    console.log(`   Result ID: ${result.resultId}`);
    console.log(`   XP Gained: ${result.xpGained}`);
    console.log(`   Leveled Up: ${result.leveledUp}`);
    console.log(`   New Badges: ${result.newBadges.length}`);
    
    return NextResponse.json({
      success: true,
      result: {
        id: result.resultId,
        ...resultData,
      },
      gamification: {
        xpGained: result.xpGained,
        leveledUp: result.leveledUp,
        newBadges: result.newBadges,
        newTotalXP: result.newTotalXP,
        newLevel: result.newLevel,
      },
      message: result.leveledUp 
        ? `Congratulations! You leveled up to level ${result.newLevel}!`
        : result.newBadges.length > 0
        ? `Great job! You earned ${result.newBadges.length} new badge(s)!`
        : 'Test submitted successfully!',
    });
  } catch (error: any) {
    console.error('❌ Error submitting test:', error);
    
    // Handle specific transaction errors
    if (error.message === 'DUPLICATE_SUBMISSION') {
      return NextResponse.json(
        { success: false, error: 'This test has already been submitted.' },
        { status: 409 }
      );
    }
    
    if (error.message === 'ALREADY_SUBMITTED') {
      // Attempt was submitted between check and transaction
      const resultRef = adminDb.collection('testResults').where('attemptId', '==', body?.attemptId).limit(1);
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
    }
    
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
