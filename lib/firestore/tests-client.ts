/**
 * CLIENT-SIDE Firestore operations for Tests
 * This file does NOT import firebase-admin to avoid build errors
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import {
  Test,
  Question,
  TestAttempt,
  StudentAnswer,
} from '@/lib/types/test';

/**
 * Get all published tests (client-side)
 * Note: Fetches all tests and filters in memory to avoid index requirement
 */
export async function getPublishedTests(): Promise<Test[]> {
  const db = getDbInstance();
  const testsRef = collection(db, 'tests');
  
  // Fetch all tests and filter/sort in memory to avoid index requirement
  const snapshot = await getDocs(testsRef);
  
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate(),
    }))
    .filter((test) => test.status === 'published' && test.isActive === true)
    .sort((a, b) => {
      // Sort by createdAt descending
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    }) as Test[];
}

/**
 * Get a single test by ID (client-side)
 */
export async function getTestById(testId: string): Promise<Test | null> {
  const db = getDbInstance();
  const testRef = doc(db, 'tests', testId);
  const testSnap = await getDoc(testRef);
  
  if (!testSnap.exists()) {
    return null;
  }
  
  const data = testSnap.data();
  return {
    id: testSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    publishedAt: data.publishedAt?.toDate(),
  } as Test;
}

/**
 * Get questions for a test (client-side)
 */
export async function getTestQuestions(testId: string): Promise<Question[]> {
  const db = getDbInstance();
  const questionsRef = collection(db, 'tests', testId, 'questions');
  
  const q = query(questionsRef, orderBy('sectionNumber', 'asc'), orderBy('questionNumber', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Question[];
}

/**
 * Get questions by section (client-side)
 */
export async function getQuestionsBySection(testId: string, sectionNumber: number): Promise<Question[]> {
  const db = getDbInstance();
  const questionsRef = collection(db, 'tests', testId, 'questions');
  
  const q = query(
    questionsRef,
    where('sectionNumber', '==', sectionNumber),
    orderBy('questionNumber', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Question;
  });
}

/**
 * Start a test attempt (client-side)
 */
export async function startTestAttempt(
  testId: string,
  userId: string,
  test: Test
): Promise<TestAttempt> {
  const db = getDbInstance();
  const attemptsRef = collection(db, 'testAttempts');
  
  // Create initial section attempts
  const sections: TestAttempt['sections'] = test.sections.map((section) => ({
    sectionId: section.id,
    sectionNumber: section.sectionNumber,
    status: 'not-started' as const,
    timeSpent: 0,
    answers: [],
  }));
  
  // Calculate expiration time (test time limit + 5 minutes buffer)
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + test.totalTimeLimit + 300);
  
  const attempt: Omit<TestAttempt, 'id'> = {
    testId,
    userId,
    status: 'not-started',
    startedAt: new Date(),
    expiresAt,
    currentSection: 1,
    sections,
    totalTimeSpent: 0,
    timeRemaining: test.totalTimeLimit,
    answers: [],
    deviceInfo: typeof window !== 'undefined' ? {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    } : undefined,
  };
  
  const attemptRef = doc(attemptsRef);
  await setDoc(attemptRef, {
    ...attempt,
    startedAt: Timestamp.fromDate(attempt.startedAt),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  
  return {
    id: attemptRef.id,
    ...attempt,
  };
}

/**
 * Update test attempt (client-side)
 */
export async function updateTestAttempt(
  attemptId: string,
  updates: Partial<Omit<TestAttempt, 'id' | 'testId' | 'userId' | 'startedAt'>>
): Promise<void> {
  const db = getDbInstance();
  const attemptRef = doc(db, 'testAttempts', attemptId);
  
  const updateData: any = { ...updates };
  
  // Convert Date objects to Timestamps
  if (updates.submittedAt) {
    updateData.submittedAt = Timestamp.fromDate(
      updates.submittedAt instanceof Date ? updates.submittedAt : new Date(updates.submittedAt)
    );
  }
  
  if (updates.expiresAt) {
    updateData.expiresAt = Timestamp.fromDate(
      updates.expiresAt instanceof Date ? updates.expiresAt : new Date(updates.expiresAt)
    );
  }
  
  // Convert section dates
  if (updates.sections) {
    updateData.sections = updates.sections.map((section) => ({
      ...section,
      startedAt: section.startedAt 
        ? Timestamp.fromDate(section.startedAt instanceof Date ? section.startedAt : new Date(section.startedAt))
        : undefined,
      completedAt: section.completedAt
        ? Timestamp.fromDate(section.completedAt instanceof Date ? section.completedAt : new Date(section.completedAt))
        : undefined,
      answers: section.answers.map((answer) => ({
        ...answer,
        answeredAt: answer.answeredAt
          ? Timestamp.fromDate(answer.answeredAt instanceof Date ? answer.answeredAt : new Date(answer.answeredAt))
          : undefined,
      })),
    }));
  }
  
  await updateDoc(attemptRef, updateData);
}

/**
 * Get test attempt by ID (client-side)
 */
export async function getTestAttempt(attemptId: string): Promise<TestAttempt | null> {
  const db = getDbInstance();
  const attemptRef = doc(db, 'testAttempts', attemptId);
  const attemptSnap = await getDoc(attemptRef);
  
  if (!attemptSnap.exists()) {
    return null;
  }
  
  const data = attemptSnap.data();
  return {
    id: attemptSnap.id,
    ...data,
    startedAt: data.startedAt?.toDate() || new Date(),
    submittedAt: data.submittedAt?.toDate(),
    expiresAt: data.expiresAt?.toDate(),
    sections: data.sections?.map((section: any) => ({
      ...section,
      startedAt: section.startedAt?.toDate(),
      completedAt: section.completedAt?.toDate(),
      answers: section.answers?.map((answer: any) => ({
        ...answer,
        answeredAt: answer.answeredAt?.toDate(),
      })) || [],
    })) || [],
    answers: data.answers?.map((answer: any) => ({
      ...answer,
      answeredAt: answer.answeredAt?.toDate(),
    })) || [],
  } as TestAttempt;
}

/**
 * Get user's test attempts (client-side)
 */
export async function getUserTestAttempts(userId: string, limitCount: number = 10): Promise<TestAttempt[]> {
  const db = getDbInstance();
  const attemptsRef = collection(db, 'testAttempts');
  
  const q = query(
    attemptsRef,
    where('userId', '==', userId),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startedAt: data.startedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      sections: data.sections?.map((section: any) => ({
        ...section,
        startedAt: section.startedAt?.toDate(),
        completedAt: section.completedAt?.toDate(),
        answers: section.answers?.map((answer: any) => ({
          ...answer,
          answeredAt: answer.answeredAt?.toDate(),
        })) || [],
      })) || [],
      answers: data.answers?.map((answer: any) => ({
        ...answer,
        answeredAt: answer.answeredAt?.toDate(),
      })) || [],
    } as TestAttempt;
  });
}
