import { adminDb } from './firebase-admin';
import { getDbInstance } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

export interface UserProgress {
  userId: string;
  testId: string;
  responses: Record<number, string>;
  score?: number;
  completedAt?: Date;
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface TestResult {
  userId: string;
  testId: string;
  score: number;
  totalQuestions: number;
  responses: Record<number, string>;
  completedAt: Date;
}

// Client-side functions
export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const db = getDbInstance();
  const progressRef = doc(db, 'progress', `${progress.userId}_${progress.testId}`);
  
  await setDoc(progressRef, {
    ...progress,
    lastUpdatedAt: Timestamp.now(),
  }, { merge: true });
}

export async function getUserProgress(userId: string, testId: string): Promise<UserProgress | null> {
  const db = getDbInstance();
  const progressRef = doc(db, 'progress', `${userId}_${testId}`);
  const progressSnap = await getDoc(progressRef);
  
  if (!progressSnap.exists()) {
    return null;
  }
  
  const data = progressSnap.data();
  return {
    ...data,
    startedAt: data.startedAt?.toDate(),
    lastUpdatedAt: data.lastUpdatedAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
  } as UserProgress;
}

export async function saveTestResult(result: TestResult): Promise<void> {
  const db = getDbInstance();
  const resultRef = doc(db, 'results', `${result.userId}_${result.testId}_${Date.now()}`);
  
  await setDoc(resultRef, {
    ...result,
    completedAt: Timestamp.now(),
  });
}

export async function getUserResults(userId: string): Promise<TestResult[]> {
  const db = getDbInstance();
  const resultsRef = collection(db, 'results');
  const q = query(resultsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      completedAt: data.completedAt?.toDate(),
    } as TestResult;
  });
}

// Server-side admin functions (for API routes)
export async function createUserProfile(userId: string, email: string, displayName?: string) {
  const userRef = adminDb.collection('users').doc(userId);
  
  await userRef.set({
    email,
    displayName: displayName || email.split('@')[0],
    createdAt: Timestamp.now(),
    role: 'student',
  }, { merge: true });
}

export async function getUserProfile(userId: string) {
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  
  if (!userSnap.exists) {
    return null;
  }
  
  return userSnap.data();
}