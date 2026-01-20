/**
 * Test Availability & Unlocking System
 * Single source of truth for test availability logic
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface TestAvailability {
  testId: string;
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  sequence?: number;
  score?: number;
  completedAt?: Date;
  attemptId?: string;
}

/**
 * Get all tests with their availability status for a user
 * CRITICAL: This is the ONLY function that determines test availability
 */
export async function getUserTestAvailability(
  userId: string,
  grade?: string
): Promise<TestAvailability[]> {
  try {
    // 1. Get user progress
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data()!;
    const completedTestIds = userData.progress?.completedTestIds || [];
    const unlockedTestIds = userData.progress?.unlockedTestIds || [];
    const currentTestId = userData.progress?.currentTestId;
    const userGrade = grade || userData.grade || '12th Grade';
    
    // 2. Get all tests for user's grade, ordered by ID (which includes sequence)
    let testsQuery = adminDb
      .collection('tests')
      .where('isActive', '==', true)
      .where('grade', '==', userGrade);
    
    const testsSnapshot = await testsQuery.get();
    
    // 3. Get user's test attempts for scores and in-progress status
    const attemptsQuery = adminDb
      .collection('testAttempts')
      .where('userId', '==', userId);
    
    const attemptsSnapshot = await attemptsQuery.get();
    const attemptsByTestId = new Map();
    
    attemptsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const testId = data.testId;
      
      if (data.status === 'submitted' || data.status === 'completed') {
        // Completed attempt
        const existing = attemptsByTestId.get(testId);
        if (!existing || (data.percentage || 0) > (existing.score || 0)) {
          attemptsByTestId.set(testId, {
            score: data.percentage || 0,
            completedAt: data.completedAt?.toDate() || data.submittedAt?.toDate(),
            attemptId: doc.id,
            status: 'completed'
          });
        }
      } else if (data.status === 'in-progress' || data.status === 'paused') {
        // In-progress attempt
        attemptsByTestId.set(testId, {
          attemptId: doc.id,
          status: 'in_progress'
        });
      }
    });
    
    // 4. Sort tests by ID (which should reflect sequence)
    const sortedTests = testsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        data: doc.data()
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    
    // 5. Determine status for each test
    const availability: TestAvailability[] = [];
    
    sortedTests.forEach((test, index) => {
      const testId = test.id;
      const testData = test.data;
      const attempt = attemptsByTestId.get(testId);
      
      let status: TestAvailability['status'];
      
      if (attempt?.status === 'completed' || completedTestIds.includes(testId)) {
        status = 'completed';
      } else if (currentTestId === testId || attempt?.status === 'in_progress') {
        status = 'in_progress';
      } else if (index === 0 || unlockedTestIds.includes(testId)) {
        // First test is always available, or explicitly unlocked
        status = 'available';
      } else {
        // Check if previous test is completed
        const previousTest = sortedTests[index - 1];
        const previousCompleted = completedTestIds.includes(previousTest.id) || 
                                  attemptsByTestId.get(previousTest.id)?.status === 'completed';
        
        status = previousCompleted ? 'available' : 'locked';
      }
      
      availability.push({
        testId,
        title: testData.title || testData.name || 'Untitled Test',
        status,
        sequence: index + 1,
        score: attempt?.score,
        completedAt: attempt?.completedAt,
        attemptId: attempt?.attemptId
      });
    });
    
    return availability;
    
  } catch (error: any) {
    console.error('Failed to get test availability:', error);
    throw error;
  }
}

/**
 * Get next test in sequence after completing a test
 */
export async function getNextTestInSequence(
  currentTestId: string,
  userGrade: string
): Promise<string | null> {
  try {
    // Get all tests for grade, sorted by ID
    const testsQuery = adminDb
      .collection('tests')
      .where('isActive', '==', true)
      .where('grade', '==', userGrade);
    
    const testsSnapshot = await testsQuery.get();
    
    // Sort by ID
    const sortedTests = testsSnapshot.docs
      .map(doc => doc.id)
      .sort((a, b) => a.localeCompare(b));
    
    // Find current test index
    const currentIndex = sortedTests.indexOf(currentTestId);
    
    if (currentIndex === -1 || currentIndex === sortedTests.length - 1) {
      // Current test not found or is last test
      return null;
    }
    
    // Return next test
    return sortedTests[currentIndex + 1];
    
  } catch (error: any) {
    console.error('Failed to get next test:', error);
    return null;
  }
}

/**
 * Unlock next test for user after completing current test
 */
export async function unlockNextTest(
  userId: string,
  completedTestId: string,
  userGrade: string
): Promise<string | null> {
  try {
    const nextTestId = await getNextTestInSequence(completedTestId, userGrade);
    
    if (!nextTestId) {
      return null; // No next test to unlock
    }
    
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data()!;
    const unlockedTestIds = userData.progress?.unlockedTestIds || [];
    
    // Only unlock if not already unlocked
    if (!unlockedTestIds.includes(nextTestId)) {
      await userRef.update({
        'progress.unlockedTestIds': FieldValue.arrayUnion(nextTestId)
      });
      
      console.log(`✅ Unlocked next test for user ${userId}: ${nextTestId}`);
    }
    
    return nextTestId;
    
  } catch (error: any) {
    console.error('Failed to unlock next test:', error);
    return null;
  }
}
