/**
 * Mastery Tracker
 * Tracks test unlock status and mastery progress for progressive assessment system
 */

import { adminDb } from '@/lib/firebase-admin';
import { getMasteryGate } from './schema';

export interface TestMasteryStatus {
  testId: string;
  grade: number;
  testNumber: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestScore?: number;
  attempts: number;
  masteryThreshold: number;
  canRetry: boolean;
  retriesRemaining?: number;
}

export interface UserMasteryProgress {
  grade: number;
  totalTests: number;
  unlockedTests: number;
  completedTests: number;
  masteredTests: number; // Tests where score >= threshold
  nextUnlockedTest: number | null;
  progressPercentage: number;
}

/**
 * Get mastery status for all tests in a grade
 */
export async function getUserTestMastery(
  userId: string,
  grade: number
): Promise<TestMasteryStatus[]> {
  const statuses: TestMasteryStatus[] = [];
  
  // Get all test results for this user and grade
  const resultsSnapshot = await adminDb
    .collection('testResults')
    .where('userId', '==', userId)
    .get();
  
  const resultsByTest: Record<string, { score: number; attempts: number }> = {};
  resultsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const testId = data.testId || '';
    if (testId.startsWith(`grade-${grade === 0 ? 'K' : grade}-test-`)) {
      if (!resultsByTest[testId]) {
        resultsByTest[testId] = { score: 0, attempts: 0 };
      }
      resultsByTest[testId].attempts++;
      if (data.percentage > resultsByTest[testId].score) {
        resultsByTest[testId].score = data.percentage;
      }
    }
  });
  
  // Get all test attempts
  const attemptsSnapshot = await adminDb
    .collection('testAttempts')
    .where('userId', '==', userId)
    .get();
  
  const attemptsByTest: Record<string, number> = {};
  attemptsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const testId = data.testId || '';
    if (testId.startsWith(`grade-${grade === 0 ? 'K' : grade}-test-`)) {
      attemptsByTest[testId] = (attemptsByTest[testId] || 0) + 1;
    }
  });
  
  // Build status for each test (1-50)
  for (let testNum = 1; testNum <= 50; testNum++) {
    const testId = `grade-${grade === 0 ? 'K' : grade}-test-${testNum.toString().padStart(3, '0')}`;
    const gate = getMasteryGate(grade, testNum);
    const result = resultsByTest[testId];
    const attempts = attemptsByTest[testId] || 0;
    
    // Determine if unlocked
    let isUnlocked = testNum === 1; // First test is always unlocked
    if (testNum > 1) {
      const previousTestId = `grade-${grade === 0 ? 'K' : grade}-test-${(testNum - 1).toString().padStart(3, '0')}`;
      const previousResult = resultsByTest[previousTestId];
      if (previousResult && previousResult.score >= gate.threshold_percentage) {
        isUnlocked = true;
      }
    }
    
    const isCompleted = !!result;
    const bestScore = result?.score;
    const mastered = bestScore !== undefined && bestScore >= gate.threshold_percentage;
    
    // Calculate retries
    const maxRetries = gate.max_retries || 3;
    const retriesRemaining = gate.allows_retry 
      ? Math.max(0, maxRetries - attempts)
      : 0;
    const canRetry = gate.allows_retry && retriesRemaining > 0 && (!mastered || !isCompleted);
    
    statuses.push({
      testId,
      grade,
      testNumber: testNum,
      isUnlocked,
      isCompleted,
      bestScore,
      attempts,
      masteryThreshold: gate.threshold_percentage,
      canRetry,
      retriesRemaining,
    });
  }
  
  return statuses;
}

/**
 * Get user's mastery progress for a grade
 */
export async function getUserMasteryProgress(
  userId: string,
  grade: number
): Promise<UserMasteryProgress> {
  const statuses = await getUserTestMastery(userId, grade);
  
  const totalTests = 50;
  const unlockedTests = statuses.filter(s => s.isUnlocked).length;
  const completedTests = statuses.filter(s => s.isCompleted).length;
  const masteredTests = statuses.filter(s => 
    s.isCompleted && s.bestScore !== undefined && s.bestScore >= s.masteryThreshold
  ).length;
  
  // Find next unlocked test
  const nextUnlocked = statuses.find(s => !s.isUnlocked && s.testNumber > 1);
  const nextUnlockedTest = nextUnlocked ? nextUnlocked.testNumber - 1 : null;
  
  return {
    grade,
    totalTests,
    unlockedTests,
    completedTests,
    masteredTests,
    nextUnlockedTest,
    progressPercentage: (unlockedTests / totalTests) * 100,
  };
}

/**
 * Get adaptive recommendation based on Tests 1-5 performance
 */
export async function getAdaptiveRecommendation(
  userId: string,
  grade: number
): Promise<{
  recommendedStartingTest: number;
  reasoning: string;
  averageScore: number;
  performanceLevel: 'beginner' | 'intermediate' | 'advanced';
}> {
  const statuses = await getUserTestMastery(userId, grade);
  const firstFiveTests = statuses.slice(0, 5);
  
  const completedTests = firstFiveTests.filter(s => s.isCompleted);
  const averageScore = completedTests.length > 0
    ? completedTests.reduce((sum, s) => sum + (s.bestScore || 0), 0) / completedTests.length
    : 0;
  
  let recommendedStartingTest = 1;
  let reasoning = 'Start from Test 1 to build foundational skills.';
  let performanceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  
  if (completedTests.length >= 3) {
    if (averageScore >= 0.85) {
      recommendedStartingTest = 15;
      reasoning = 'Excellent performance! You can start from Test 15 to challenge yourself.';
      performanceLevel = 'advanced';
    } else if (averageScore >= 0.75) {
      recommendedStartingTest = 10;
      reasoning = 'Strong performance! Start from Test 10 to continue at an appropriate level.';
      performanceLevel = 'intermediate';
    } else if (averageScore >= 0.65) {
      recommendedStartingTest = 5;
      reasoning = 'Good progress! Start from Test 5 to build on your foundation.';
      performanceLevel = 'intermediate';
    } else {
      recommendedStartingTest = 1;
      reasoning = 'Continue from Test 1 to strengthen your foundational skills.';
      performanceLevel = 'beginner';
    }
  }
  
  return {
    recommendedStartingTest,
    reasoning,
    averageScore,
    performanceLevel,
  };
}
