/**
 * CLIENT-SIDE TEST SUBMISSION - ATOMIC TRANSACTIONS
 * 
 * CRITICAL: This function MUST complete ALL updates atomically
 * If ANY step fails, ALL steps rollback
 */

import { 
  doc, 
  updateDoc, 
  setDoc,
  collection, 
  arrayUnion, 
  increment,
  serverTimestamp,
  runTransaction,
  Timestamp,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';

export interface SubmitTestParams {
  userId: string;
  testId: string;
  userGrade: string;
  answers: Record<string, string>;
  questions: Record<string, any>;
  testMetadata: {
    title: string;
    category: string;
    difficulty: string;
  };
  startedAt: Timestamp;
  timeSpent: number; // in seconds
}

/**
 * CRITICAL: This function MUST complete ALL updates atomically
 * If ANY step fails, ALL steps rollback
 */
export async function submitTestCompletion(params: SubmitTestParams) {
  const {
    userId,
    testId,
    userGrade,
    answers,
    questions,
    testMetadata,
    startedAt,
    timeSpent
  } = params;
  
  console.log('🎯 Starting atomic test submission transaction...');
  
  try {
    const db = getDbInstance();
    
    // Calculate results
    const detailedAnswers: Record<string, any> = {};
    let correctCount = 0;
    const totalQuestions = Object.keys(questions).length;
    
    for (const [qId, qData] of Object.entries(questions)) {
      const userAnswer = answers[qId] || '';
      const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(qData.correctAnswer);
      
      if (isCorrect) correctCount++;
      
      detailedAnswers[qId] = {
        selectedAnswer: userAnswer,
        correctAnswer: qData.correctAnswer,
        isCorrect,
        timeSpent: 0
      };
    }
    
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const xpEarned = correctCount * 10;
    const now = Timestamp.now();
    const calculatedTimeSpent = timeSpent || Math.round((now.toMillis() - startedAt.toMillis()) / 1000);
    
    // Get current attempt number
    const attemptsQuery = query(
      collection(db, 'testAttempts'),
      where('userId', '==', userId),
      where('testId', '==', testId),
      orderBy('attemptNumber', 'desc')
    );
    const existingAttempts = await getDocs(attemptsQuery);
    const attemptNumber = existingAttempts.empty ? 1 : (existingAttempts.docs[0].data().attemptNumber + 1);
    
    // Get next test in sequence
    const nextTestId = await getNextTestInSequence(db, testId);
    
    // Today's date string for time series
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // ATOMIC TRANSACTION - ALL OR NOTHING
    let attemptId: string = '';
    
    await runTransaction(db, async (transaction) => {
      
      // 1. Create test attempt record
      const attemptRef = doc(collection(db, 'testAttempts'));
      attemptId = attemptRef.id;
      
      transaction.set(attemptRef, {
        userId,
        testId,
        attemptNumber,
        status: 'completed',
        startedAt,
        completedAt: serverTimestamp(),
        score: correctCount,
        maxScore: totalQuestions,
        percentage,
        xpEarned,
        timeSpent: calculatedTimeSpent,
        answers: detailedAnswers,
        testMetadata: {
          ...testMetadata,
          grade: userGrade
        }
      });
      
      console.log('✅ Step 1: Test attempt created');
      
      // 2. Update user stats ATOMICALLY
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Initialize progress if it doesn't exist
      const progress = userData.progress || {
        completedTestIds: [],
        currentTestId: null,
        unlockedTestIds: []
      };
      
      // Check if test already completed (prevent duplicates)
      if (progress.completedTestIds && progress.completedTestIds.includes(testId)) {
        console.warn('⚠️ Test already completed, skipping duplicate submission');
        throw new Error('ALREADY_COMPLETED');
      }
      
      transaction.update(userRef, {
        'stats.totalXP': increment(xpEarned),
        'stats.testsCompleted': increment(1),
        'stats.testsAttempted': increment(1),
        'stats.totalTimeSpent': increment(Math.round(calculatedTimeSpent / 60)),
        'stats.lastTestDate': serverTimestamp(),
        'progress.completedTestIds': arrayUnion(testId),
        'progress.currentTestId': null,
        'lastActive': serverTimestamp()
      });
      
      console.log('✅ Step 2: User stats updated');
      
      // 3. Unlock next test if exists
      if (nextTestId) {
        const unlockedTestIds = progress.unlockedTestIds || [];
        if (!unlockedTestIds.includes(nextTestId)) {
          transaction.update(userRef, {
            'progress.unlockedTestIds': arrayUnion(nextTestId)
          });
          console.log('✅ Step 3: Next test unlocked:', nextTestId);
        }
      }
      
      // 4. Update analytics aggregation
      const analyticsRef = doc(db, 'analytics', 'summary');
      const analyticsDoc = await transaction.get(analyticsRef);
      
      if (!analyticsDoc.exists()) {
        // Initialize analytics document
        transaction.set(analyticsRef, {
          lastUpdated: serverTimestamp(),
          totalUsers: 0,
          activeUsers: 0,
          totalTestsTaken: 0,
          gradeStats: {
            '8th Grade': { userCount: 0, attemptCount: 0, totalTimeSpent: 0, avgTimePerAttempt: 0 },
            '10th Grade': { userCount: 0, attemptCount: 0, totalTimeSpent: 0, avgTimePerAttempt: 0 },
            '12th Grade': { userCount: 0, attemptCount: 0, totalTimeSpent: 0, avgTimePerAttempt: 0 }
          },
          contentStats: {
            'Math': { attemptCount: 0, totalScore: 0, avgScore: 0, totalXPAwarded: 0 },
            'Reading': { attemptCount: 0, totalScore: 0, avgScore: 0, totalXPAwarded: 0 },
            'Writing': { attemptCount: 0, totalScore: 0, avgScore: 0, totalXPAwarded: 0 },
            'Full Practice': { attemptCount: 0, totalScore: 0, avgScore: 0, totalXPAwarded: 0 }
          },
          timeSeriesData: {}
        });
      }
      
      const timeMinutes = Math.round(calculatedTimeSpent / 60);
      
      transaction.update(analyticsRef, {
        totalTestsTaken: increment(1),
        lastUpdated: serverTimestamp(),
        
        // Grade stats
        [`gradeStats.${userGrade}.attemptCount`]: increment(1),
        [`gradeStats.${userGrade}.totalTimeSpent`]: increment(timeMinutes),
        
        // Content stats
        [`contentStats.${testMetadata.category}.attemptCount`]: increment(1),
        [`contentStats.${testMetadata.category}.totalScore`]: increment(percentage),
        [`contentStats.${testMetadata.category}.totalXPAwarded`]: increment(xpEarned),
        
        // Time series data
        [`timeSeriesData.${today}.testAttempts`]: increment(1),
        [`timeSeriesData.${today}.totalTimeSpent`]: increment(timeMinutes),
      });
      
      console.log('✅ Step 4: Analytics updated');
    });
    
    console.log('🎉 Transaction completed successfully');
    
    // Recalculate averages (must be done outside transaction)
    await recalculateAnalyticsAverages(db, userGrade, testMetadata.category);
    
    return {
      success: true,
      attemptId,
      score: correctCount,
      maxScore: totalQuestions,
      percentage,
      xpEarned,
      nextTestId
    };
    
  } catch (error: any) {
    console.error('❌ Test submission failed:', error);
    if (error.message === 'ALREADY_COMPLETED') {
      throw new Error('This test has already been completed.');
    }
    throw new Error(`Failed to submit test: ${error.message}`);
  }
}

/**
 * Recalculate analytics averages
 * Must run AFTER transaction completes
 */
async function recalculateAnalyticsAverages(db: any, grade: string, category: string) {
  try {
    const analyticsRef = doc(db, 'analytics', 'summary');
    const analyticsSnap = await getDoc(analyticsRef);
    
    if (!analyticsSnap.exists()) return;
    
    const data = analyticsSnap.data();
    
    // Calculate grade average
    const gradeData = data.gradeStats?.[grade];
    if (gradeData && gradeData.attemptCount > 0) {
      const avgTime = Math.round(gradeData.totalTimeSpent / gradeData.attemptCount);
      await updateDoc(analyticsRef, {
        [`gradeStats.${grade}.avgTimePerAttempt`]: avgTime
      });
    }
    
    // Calculate content average
    const contentData = data.contentStats?.[category];
    if (contentData && contentData.attemptCount > 0) {
      const avgScore = Math.round(contentData.totalScore / contentData.attemptCount);
      await updateDoc(analyticsRef, {
        [`contentStats.${category}.avgScore`]: avgScore
      });
    }
    
    console.log('✅ Analytics averages recalculated');
    
  } catch (error) {
    console.error('⚠️ Failed to recalculate averages:', error);
  }
}

function normalizeAnswer(answer: any): string {
  if (answer === null || answer === undefined) return '';
  if (Array.isArray(answer)) answer = answer[0];
  return String(answer).trim().toLowerCase();
}

async function getNextTestInSequence(db: any, currentTestId: string): Promise<string | null> {
  try {
    const currentTestDoc = await getDoc(doc(db, 'tests', currentTestId));
    if (!currentTestDoc.exists()) return null;
    
    const currentTestData = currentTestDoc.data();
    const currentSequence = currentTestData.sequence;
    
    if (currentSequence === undefined) {
      // If no sequence field, try to get next by ID (alphabetical)
      const allTestsQuery = query(
        collection(db, 'tests'),
        where('isActive', '==', true),
        where('grade', '==', currentTestData.grade)
      );
      const allTests = await getDocs(allTestsQuery);
      const sortedTests = allTests.docs
        .map(d => ({ id: d.id, data: d.data() }))
        .sort((a, b) => a.id.localeCompare(b.id));
      
      const currentIndex = sortedTests.findIndex(t => t.id === currentTestId);
      if (currentIndex === -1 || currentIndex === sortedTests.length - 1) {
        return null;
      }
      return sortedTests[currentIndex + 1].id;
    }
    
    const nextTestQuery = query(
      collection(db, 'tests'),
      where('isActive', '==', true),
      where('sequence', '==', currentSequence + 1),
      where('grade', '==', currentTestData.grade)
    );
    
    const nextTestSnap = await getDocs(nextTestQuery);
    
    return nextTestSnap.empty ? null : nextTestSnap.docs[0].id;
    
  } catch (error) {
    console.error('Failed to get next test:', error);
    return null;
  }
}
