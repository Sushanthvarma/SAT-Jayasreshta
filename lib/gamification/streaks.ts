/**
 * Gamification System: Streak Management
 */

import { Timestamp } from 'firebase/firestore';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTestDate: Timestamp | Date | null;
}

/**
 * Calculate and update streak based on last test date
 */
export function calculateStreak(
  lastTestDate: Timestamp | Date | null,
  currentStreak: number,
  longestStreak: number
): { currentStreak: number; longestStreak: number; streakMaintained: boolean } {
  if (!lastTestDate) {
    return {
      currentStreak: 0,
      longestStreak,
      streakMaintained: false,
    };
  }
  
  const lastDate = lastTestDate instanceof Date 
    ? lastTestDate 
    : (lastTestDate as any).toDate();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastTestDay = new Date(lastDate);
  lastTestDay.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - lastTestDay.getTime()) / (1000 * 60 * 60 * 24));
  
  let newStreak = currentStreak;
  let streakMaintained = false;
  
  if (daysDiff === 0) {
    // Test was today - maintain streak
    newStreak = currentStreak;
    streakMaintained = true;
  } else if (daysDiff === 1) {
    // Test was yesterday - continue streak
    newStreak = currentStreak + 1;
    streakMaintained = true;
  } else {
    // Streak broken
    newStreak = 1;
    streakMaintained = false;
  }
  
  const newLongestStreak = Math.max(newStreak, longestStreak);
  
  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    streakMaintained,
  };
}

/**
 * Update streak after test completion
 */
export function updateStreakAfterTest(
  lastTestDate: Timestamp | Date | null,
  currentStreak: number,
  longestStreak: number
): { currentStreak: number; longestStreak: number } {
  const result = calculateStreak(lastTestDate, currentStreak, longestStreak);
  
  // If test was completed today and streak was maintained, increment
  if (result.streakMaintained) {
    return {
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
    };
  }
  
  // New streak starts
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
  };
}
