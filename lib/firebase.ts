import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
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

export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const progressRef = doc(db, 'progress', `${progress.userId}_${progress.testId}`);
  
  await setDoc(progressRef, {
    ...progress,
    lastUpdatedAt: Timestamp.now(),
  }, { merge: true });
}

export async function getUserProgress(userId: string, testId: string): Promise<UserProgress | null> {
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
  const resultRef = doc(db, 'results', `${result.userId}_${result.testId}_${Date.now()}`);
  
  await setDoc(resultRef, {
    ...result,
    completedAt: Timestamp.now(),
  });
}

export async function getUserResults(userId: string): Promise<TestResult[]> {
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