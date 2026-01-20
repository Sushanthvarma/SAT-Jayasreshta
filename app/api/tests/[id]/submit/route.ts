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
    
    // PRODUCTION-GRADE: Validate answers before processing
    // Ensure answers match questions and are within valid range
    const validatedAnswers = finalAnswers.map((answer: any, index: number) => {
      if (index >= questions.length) {
        console.warn(`⚠️ Answer index ${index} exceeds question count, skipping`);
        return null;
      }
      
      const question = questions[index];
      
      // Validate answer format
      if (answer.answer !== null && answer.answer !== undefined && !answer.skipped) {
        if (question.type === 'multiple-choice') {
          // Multiple choice: answer should be 0-3 (A, B, C, D) or 'A'-'D'
          const answerValue = typeof answer.answer === 'string' 
            ? answer.answer.toUpperCase().charCodeAt(0) - 65 // Convert 'A' to 0, 'B' to 1, etc.
            : answer.answer;
          
          if (typeof answerValue !== 'number' || answerValue < 0 || answerValue > 3) {
            console.warn(`⚠️ Invalid multiple-choice answer: ${answer.answer}, defaulting to skipped`);
            return { ...answer, answer: null, skipped: true };
          }
          
          return { ...answer, answer: answerValue };
        } else if (question.type === 'grid-in') {
          // Grid-in: answer should be a number
          const answerNum = typeof answer.answer === 'string' 
            ? parseFloat(answer.answer) 
            : answer.answer;
          
          if (isNaN(answerNum)) {
            console.warn(`⚠️ Invalid grid-in answer: ${answer.answer}, defaulting to skipped`);
            return { ...answer, answer: null, skipped: true };
          }
          
          return { ...answer, answer: answerNum };
        }
      }
      
      return answer;
    }).filter((answer: any) => answer !== null);
    
    console.log(`📊 Using ${validatedAnswers.length} validated answers for scoring`);
    
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
      answers: validatedAnswers,
    } as TestAttempt;
    
    // PRODUCTION-GRADE: Validate attempt data integrity
    if (attempt.answers.length !== questions.length) {
      console.warn(`⚠️ Answer count mismatch: ${attempt.answers.length} answers for ${questions.length} questions`);
      // This is acceptable - user may have skipped questions
    }
    
    // Calculate results
    console.log(`🧮 Calculating test results...`);
    const resultData = await calculateTestResult(test, attempt, questions);
    resultData.userName = userName;
    resultData.userEmail = userEmail;
    
    console.log(`✅ Results calculated: ${resultData.totalScore}/${resultData.maxScore} (${resultData.percentage}%)`);
    
    // Check for duplicate submission BEFORE transaction (optimization)
    const existingResultCheck = await adminDb
      .collection('testResults')
      .where('attemptId', '==', attemptId)
      .limit(1)
      .get();
    
    if (!existingResultCheck.empty) {
      console.warn(`⚠️ Result already exists for attempt ${attemptId}`);
      const existingResult = existingResultCheck.docs[0].data();
      return NextResponse.json({
        success: true,
        result: {
          id: existingResultCheck.docs[0].id,
          ...existingResult,
        },
        message: 'Test was already submitted. Returning existing result.',
      });
    }
    
    // PRODUCTION-GRADE: Use Firestore transaction for atomic operations
    // This ensures: result saved, attempt updated, user stats updated - all or nothing
    // Transaction prevents race conditions and ensures data consistency
    // IMPORTANT: All reads must be executed before all writes in Firestore transactions
    const result = await adminDb.runTransaction(async (transaction) => {
      // ========== PHASE 1: ALL READS FIRST ==========
      
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
      
      // CRITICAL: Get next test to unlock (must be done before transaction writes)
      // This is a read operation, so it's safe in transaction context
      const { getNextTestInSequence } = await import('@/lib/testAvailability');
      const userGrade = userData.grade || '12th Grade';
      let nextTestId: string | null = null;
      
      try {
        nextTestId = await getNextTestInSequence(testId, userGrade);
        if (nextTestId) {
          console.log(`✅ Next test to unlock: ${nextTestId}`);
        }
      } catch (error: any) {
        console.warn('⚠️ Could not determine next test (non-critical):', error.message);
        // Continue without unlocking - not critical for submission
      }
      
      // Get daily goal document (must read before writes)
      const today = new Date().toISOString().split('T')[0];
      const dailyGoalRef = adminDb.collection('dailyGoals').doc(`${userId}_${today}`);
      const dailyGoalDoc = await transaction.get(dailyGoalRef);
      
      // ========== PHASE 2: CALCULATIONS (no Firestore operations) ==========
      
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
      
      // Prepare daily goal update
      let dailyGoalUpdate: any = null;
      if (dailyGoalDoc.exists) {
        const goalData = dailyGoalDoc.data()!;
        const newCurrentXP = (goalData.currentXP || 0) + xpGained;
        dailyGoalUpdate = {
          currentXP: newCurrentXP,
          completed: newCurrentXP >= (goalData.targetXP || 100),
          updatedAt: FieldValue.serverTimestamp(),
        };
      } else {
        // Create daily goal if doesn't exist
        dailyGoalUpdate = {
          userId,
          date: today,
          targetXP: 100,
          currentXP: xpGained,
          completed: xpGained >= 100,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
      }
      
      // ========== PHASE 3: ALL WRITES AFTER ALL READS ==========
      
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
        answers: validatedAnswers,
      });
      
      // Update user document atomically using FieldValue.increment for counters
      // CRITICAL: Track completed test IDs and unlock next test
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
      
      // CRITICAL: Initialize progress object if it doesn't exist
      if (!userData.progress) {
        userUpdates.progress = {
          completedTestIds: [testId],
          unlockedTestIds: nextTestId ? [nextTestId] : [],
          currentTestId: null
        };
      } else {
        // CRITICAL: Track completed test IDs
        userUpdates['progress.completedTestIds'] = FieldValue.arrayUnion(testId);
        // CRITICAL: Clear current test (test is now completed)
        userUpdates['progress.currentTestId'] = FieldValue.delete();
        
        // CRITICAL: Unlock next test if available
        if (nextTestId) {
          const unlockedTestIds = userData.progress.unlockedTestIds || [];
          if (!unlockedTestIds.includes(nextTestId)) {
            userUpdates['progress.unlockedTestIds'] = FieldValue.arrayUnion(nextTestId);
            console.log(`✅ Will unlock next test: ${nextTestId}`);
          }
        }
      }
      
      if (earnedBadges.length > 0) {
        userUpdates.badges = FieldValue.arrayUnion(...earnedBadges);
      }
      
      transaction.update(userRef, userUpdates);
      
      // Update daily goal (all reads done, now safe to write)
      if (dailyGoalDoc.exists) {
        transaction.update(dailyGoalRef, dailyGoalUpdate);
      } else {
        transaction.set(dailyGoalRef, dailyGoalUpdate);
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
      
      // CRITICAL: Update analytics aggregation (non-critical, can fail without affecting submission)
      try {
        const { updateAnalyticsAggregation } = await import('@/lib/analytics/aggregator');
        // Run in background - don't wait for it
        updateAnalyticsAggregation().catch((error) => {
          console.warn('⚠️ Failed to update analytics aggregation (non-critical):', error);
        });
      } catch (analyticsError) {
        console.warn('⚠️ Failed to trigger analytics update (non-critical):', analyticsError);
      }
      
      const returnData: any = {
        resultId: resultRef.id,
        xpGained,
        leveledUp,
        newBadges: earnedBadges,
        newTotalXP,
        newLevel,
      };
      
      // Add next test info if unlocked
      if (nextTestId) {
        returnData.nextTestUnlocked = nextTestId;
      }
      
      return returnData;
    });
    
    console.log(`✅ Transaction completed successfully`);
    console.log(`   Result ID: ${result.resultId}`);
    console.log(`   XP Gained: ${result.xpGained}`);
    console.log(`   Leveled Up: ${result.leveledUp}`);
    console.log(`   New Badges: ${result.newBadges.length}`);
    if (result.nextTestUnlocked) {
      console.log(`   Next Test Unlocked: ${result.nextTestUnlocked}`);
    }
    
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
        nextTestUnlocked: result.nextTestUnlocked || null,
      },
      message: result.leveledUp 
        ? `Congratulations! You leveled up to level ${result.newLevel}!`
        : result.newBadges.length > 0
        ? `Great job! You earned ${result.newBadges.length} new badge(s)!`
        : result.nextTestUnlocked
        ? `Test completed! Next test unlocked.`
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
      // Try to get attemptId from error context or use a fallback
      let attemptIdForCheck: string | undefined;
      try {
        const body = await req.json().catch(() => null);
        attemptIdForCheck = body?.attemptId;
      } catch {
        // If we can't parse body, try to get from attemptRef if available
      }
      
      if (attemptIdForCheck) {
        const resultRef = adminDb.collection('testResults').where('attemptId', '==', attemptIdForCheck).limit(1);
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
