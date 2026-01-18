/**
 * XP System - Duolingo-style experience points
 */

export const XP_CONFIG = {
  TEST_COMPLETED: 50,
  TEST_PERFECT_SCORE: 100,
  DAILY_LOGIN: 10,
  STREAK_BONUS: 5, // per day of streak
  SECTION_COMPLETE: 20,
  QUESTION_CORRECT: 2,
  CHALLENGE_COMPLETE: 25,
  LEVEL_UP_BONUS: 50,
};

export const LEVEL_CONFIG = {
  XP_PER_LEVEL: 100, // Base XP needed per level
  LEVEL_MULTIPLIER: 1.2, // Each level requires 20% more XP
};

/**
 * Calculate XP needed for a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    totalXP += Math.floor(LEVEL_CONFIG.XP_PER_LEVEL * Math.pow(LEVEL_CONFIG.LEVEL_MULTIPLIER, i - 2));
  }
  return totalXP;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXP) {
    level++;
    const xpForThisLevel = Math.floor(LEVEL_CONFIG.XP_PER_LEVEL * Math.pow(LEVEL_CONFIG.LEVEL_MULTIPLIER, level - 2));
    xpNeeded += xpForThisLevel;
    
    if (xpNeeded > totalXP) {
      return level - 1;
    }
  }
  
  return level;
}

/**
 * Calculate XP progress for current level
 */
export function getXPProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number; // 0-100
} {
  const level = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const nextLevelXP = xpForNextLevel - xpForCurrentLevel;
  const progress = (currentLevelXP / nextLevelXP) * 100;
  
  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

/**
 * Calculate XP for test completion
 */
export function calculateTestXP(score: number, maxScore: number, timeSpent: number): number {
  const percentage = (score / maxScore) * 100;
  let xp = XP_CONFIG.TEST_COMPLETED;
  
  // Perfect score bonus
  if (percentage >= 100) {
    xp += XP_CONFIG.TEST_PERFECT_SCORE;
  }
  
  // High score bonus
  if (percentage >= 90) {
    xp += 30;
  } else if (percentage >= 80) {
    xp += 20;
  } else if (percentage >= 70) {
    xp += 10;
  }
  
  // Time bonus (faster completion = more XP)
  const timeBonus = Math.max(0, 20 - Math.floor(timeSpent / 60)); // Up to 20 XP
  xp += timeBonus;
  
  return Math.floor(xp);
}

/**
 * Calculate streak bonus XP
 */
export function calculateStreakBonus(streak: number): number {
  return streak * XP_CONFIG.STREAK_BONUS;
}
