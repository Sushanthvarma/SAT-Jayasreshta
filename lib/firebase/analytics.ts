/**
 * Analytics Initialization and Utilities
 * Ensures analytics document exists and is properly structured
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';

/**
 * Initialize analytics document if it doesn't exist
 */
export async function initializeAnalytics() {
  try {
    const db = getDbInstance();
    const analyticsRef = doc(db, 'analytics', 'summary');
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (!analyticsDoc.exists()) {
      console.log('📊 Initializing analytics document...');
      
      await setDoc(analyticsRef, {
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
      
      console.log('✅ Analytics document initialized');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to initialize analytics:', error);
    throw error;
  }
}
