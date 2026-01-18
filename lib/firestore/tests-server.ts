/**
 * SERVER-SIDE Firestore operations for Tests
 * This file uses Firebase Admin SDK and should ONLY be imported in API routes
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  Test,
  TestResult,
} from '@/lib/types/test';
import { validateTest } from '@/lib/validators/test';

/**
 * Create a new test (server-side, admin only)
 */
export async function createTestAdmin(test: Omit<Test, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // Validate test
  const validation = validateTest(test);
  if (!validation.isValid) {
    throw new Error(`Test validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  const testRef = adminDb.collection('tests').doc();
  
  await testRef.set({
    ...test,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    publishedAt: test.status === 'published' ? Timestamp.now() : null,
  });
  
  return testRef.id;
}

/**
 * Update a test (server-side, admin only)
 */
export async function updateTestAdmin(
  testId: string,
  updates: Partial<Omit<Test, 'id' | 'createdAt'>>,
  modifiedBy: string
): Promise<void> {
  const testRef = adminDb.collection('tests').doc(testId);
  
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
    lastModifiedBy: modifiedBy,
  };
  
  if (updates.status === 'published' && updates.publishedAt === undefined) {
    // Check if test was already published
    const testSnap = await testRef.get();
    if (!testSnap.exists) {
      throw new Error('Test not found');
    }
    const existingTest = testSnap.data();
    if (existingTest?.status !== 'published') {
      updateData.publishedAt = Timestamp.now();
    }
  }
  
  await testRef.update(updateData);
}

/**
 * Get test by ID (server-side)
 */
export async function getTestByIdAdmin(testId: string): Promise<Test | null> {
  const testRef = adminDb.collection('tests').doc(testId);
  const testSnap = await testRef.get();
  
    if (!testSnap.exists) {
    return null;
  }
  
  const data = testSnap.data()!;
  return {
    id: testSnap.id,
    ...data,
    createdAt: (data.createdAt as any)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
    publishedAt: (data.publishedAt as any)?.toDate(),
  } as Test;
}

/**
 * Save test result (server-side)
 */
export async function saveTestResult(result: Omit<TestResult, 'id' | 'createdAt'>): Promise<string> {
  const resultRef = adminDb.collection('testResults').doc();
  
  await resultRef.set({
    ...result,
    createdAt: Timestamp.now(),
    completedAt: Timestamp.fromDate(
      result.completedAt instanceof Date ? result.completedAt : ((result.completedAt as any)?.toDate?.() || new Date(result.completedAt as any))
    ),
    submittedAt: Timestamp.fromDate(
      result.submittedAt instanceof Date ? result.submittedAt : ((result.submittedAt as any)?.toDate?.() || new Date(result.submittedAt as any))
    ),
  });
  
  return resultRef.id;
}

/**
 * Get test results for a user (server-side)
 */
export async function getUserTestResultsAdmin(
  userId: string,
  limitCount: number = 20
): Promise<TestResult[]> {
  const resultsRef = adminDb.collection('testResults');
  const q = resultsRef
    .where('userId', '==', userId)
    .orderBy('completedAt', 'desc')
    .limit(limitCount);
  
  const snapshot = await q.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      completedAt: (data.completedAt as any)?.toDate() || new Date(),
      submittedAt: (data.submittedAt as any)?.toDate() || new Date(),
      createdAt: (data.createdAt as any)?.toDate() || new Date(),
    } as TestResult;
  });
}
