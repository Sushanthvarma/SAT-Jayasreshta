/**
 * Gamification System: Badges and Achievements
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'test' | 'streak' | 'score' | 'milestone';
  requirement: number; // Threshold to earn badge
}

export const BADGES: Badge[] = [
  // Test completion badges
  {
    id: 'first-test',
    name: 'First Steps',
    description: 'Complete your first test',
    icon: '🎯',
    category: 'test',
    requirement: 1,
  },
  {
    id: 'test-master-5',
    name: 'Test Taker',
    description: 'Complete 5 tests',
    icon: '📚',
    category: 'test',
    requirement: 5,
  },
  {
    id: 'test-master-10',
    name: 'Dedicated Learner',
    description: 'Complete 10 tests',
    icon: '📖',
    category: 'test',
    requirement: 10,
  },
  {
    id: 'test-master-25',
    name: 'Test Champion',
    description: 'Complete 25 tests',
    icon: '🏆',
    category: 'test',
    requirement: 25,
  },
  {
    id: 'test-master-50',
    name: 'Test Legend',
    description: 'Complete 50 tests',
    icon: '👑',
    category: 'test',
    requirement: 50,
  },
  
  // Streak badges
  {
    id: 'streak-3',
    name: 'On Fire',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    category: 'streak',
    requirement: 3,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '💪',
    category: 'streak',
    requirement: 7,
  },
  {
    id: 'streak-14',
    name: 'Two Week Titan',
    description: 'Maintain a 14-day streak',
    icon: '⚡',
    category: 'streak',
    requirement: 14,
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🌟',
    category: 'streak',
    requirement: 30,
  },
  
  // Score badges
  {
    id: 'score-80',
    name: 'Excellent',
    description: 'Score 80% or higher on a test',
    icon: '⭐',
    category: 'score',
    requirement: 80,
  },
  {
    id: 'score-90',
    name: 'Outstanding',
    description: 'Score 90% or higher on a test',
    icon: '✨',
    category: 'score',
    requirement: 90,
  },
  {
    id: 'score-95',
    name: 'Perfect Score',
    description: 'Score 95% or higher on a test',
    icon: '💎',
    category: 'score',
    requirement: 95,
  },
  {
    id: 'score-100',
    name: 'Perfect Master',
    description: 'Score 100% on a test',
    icon: '🎖️',
    category: 'score',
    requirement: 100,
  },
  
  // Milestone badges
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a test in under 30 minutes',
    icon: '⚡',
    category: 'milestone',
    requirement: 1,
  },
  {
    id: 'accuracy-king',
    name: 'Accuracy King',
    description: 'Answer 20 questions correctly in a row',
    icon: '🎯',
    category: 'milestone',
    requirement: 20,
  },
];

/**
 * Check and award badges based on user progress
 */
export function checkBadges(
  totalTestsCompleted: number,
  currentStreak: number,
  latestScore: number,
  badges: string[]
): string[] {
  const newBadges: string[] = [];
  
  // Check test completion badges
  BADGES.filter(b => b.category === 'test').forEach(badge => {
    if (!badges.includes(badge.id) && totalTestsCompleted >= badge.requirement) {
      newBadges.push(badge.id);
    }
  });
  
  // Check streak badges
  BADGES.filter(b => b.category === 'streak').forEach(badge => {
    if (!badges.includes(badge.id) && currentStreak >= badge.requirement) {
      newBadges.push(badge.id);
    }
  });
  
  // Check score badges
  BADGES.filter(b => b.category === 'score').forEach(badge => {
    if (!badges.includes(badge.id) && latestScore >= badge.requirement) {
      newBadges.push(badge.id);
    }
  });
  
  return newBadges;
}

/**
 * Get badge by ID
 */
export function getBadge(badgeId: string): Badge | undefined {
  return BADGES.find(b => b.id === badgeId);
}

/**
 * Get all badges for a user
 */
export function getUserBadges(badgeIds: string[]): Badge[] {
  return BADGES.filter(b => badgeIds.includes(b.id));
}
