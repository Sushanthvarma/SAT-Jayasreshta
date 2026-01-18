/**
 * Daily Challenges System
 * Encourages daily engagement with varied, achievable goals
 */

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  goal: number;
  xpReward: number;
  coinReward: number;
  gemReward: number;
  completed: boolean;
  completedAt?: Date;
}

export interface ChallengeCategory {
  id: string;
  name: string;
  challenges: DailyChallenge[];
}

/**
 * Challenge Templates
 */
const CHALLENGE_TEMPLATES = [
  {
    id: 'perfect-streak',
    title: 'Perfect Streak',
    description: 'Get all 10 questions correct today',
    icon: '💯',
    goal: 10,
    xpReward: 100,
    coinReward: 50,
    gemReward: 0,
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete today\'s test in under 10 minutes',
    icon: '⚡',
    goal: 600, // seconds
    xpReward: 75,
    coinReward: 30,
    gemReward: 0,
  },
  {
    id: 'focus-master',
    title: 'Focus Master',
    description: 'Answer 3 questions in a row without hints',
    icon: '🎯',
    goal: 3,
    xpReward: 50,
    coinReward: 20,
    gemReward: 0,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a test before 9 AM',
    icon: '🌅',
    goal: 1,
    xpReward: 25,
    coinReward: 15,
    gemReward: 0,
  },
  {
    id: 'improvement-star',
    title: 'Rising Star',
    description: 'Score 2+ points higher than your last test',
    icon: '📈',
    goal: 1,
    xpReward: 150,
    coinReward: 40,
    gemReward: 5,
  },
  {
    id: 'skill-focus',
    title: 'Skill Focus',
    description: 'Master a skill today (reach 80% accuracy)',
    icon: '⭐',
    goal: 1,
    xpReward: 200,
    coinReward: 50,
    gemReward: 10,
  },
  {
    id: 'consistency-king',
    title: 'Consistency King',
    description: 'Complete tests on 3 different days this week',
    icon: '👑',
    goal: 3,
    xpReward: 100,
    coinReward: 35,
    gemReward: 0,
  },
];

/**
 * Generate daily challenges for a user
 * Selects 3 challenges based on user's skill level and recent activity
 */
export function generateDailyChallenges(
  userData: {
    skillLevel: number;
    recentActivity: any;
    currentStreak: number;
  }
): DailyChallenge[] {
  // Filter challenges based on user's level
  const availableChallenges = CHALLENGE_TEMPLATES.filter(challenge => {
    // Early bird only available if it's before 9 AM
    if (challenge.id === 'early-bird') {
      const now = new Date();
      return now.getHours() < 9;
    }
    
    // Improvement star only if user has previous test
    if (challenge.id === 'improvement-star') {
      return userData.recentActivity?.lastTestScore !== undefined;
    }
    
    return true;
  });

  // Select 3 challenges: 1 easy, 1 medium, 1 hard
  const easy = availableChallenges.filter(c => 
    ['early-bird', 'focus-master'].includes(c.id)
  );
  const medium = availableChallenges.filter(c => 
    ['speed-demon', 'perfect-streak'].includes(c.id)
  );
  const hard = availableChallenges.filter(c => 
    ['improvement-star', 'skill-focus'].includes(c.id)
  );

  const selected: DailyChallenge[] = [];
  
  if (easy.length > 0) {
    selected.push({
      ...easy[Math.floor(Math.random() * easy.length)],
      progress: 0,
      completed: false,
    });
  }
  
  if (medium.length > 0) {
    selected.push({
      ...medium[Math.floor(Math.random() * medium.length)],
      progress: 0,
      completed: false,
    });
  }
  
  if (hard.length > 0) {
    selected.push({
      ...hard[Math.floor(Math.random() * hard.length)],
      progress: 0,
      completed: false,
    });
  }

  // Fill remaining slots with random challenges
  while (selected.length < 3 && availableChallenges.length > 0) {
    const remaining = availableChallenges.filter(c => 
      !selected.find(s => s.id === c.id)
    );
    if (remaining.length === 0) break;
    
    selected.push({
      ...remaining[Math.floor(Math.random() * remaining.length)],
      progress: 0,
      completed: false,
    });
  }

  return selected.slice(0, 3);
}

/**
 * Update challenge progress based on user activity
 */
export function updateChallengeProgress(
  challenges: DailyChallenge[],
  activity: {
    correctAnswers?: number;
    timeSpent?: number;
    hintsUsed?: number;
    testCompleted?: boolean;
    score?: number;
    previousScore?: number;
    skillMastered?: boolean;
  }
): DailyChallenge[] {
  return challenges.map(challenge => {
    if (challenge.completed) return challenge;

    let newProgress = challenge.progress;
    let completed = false;

    switch (challenge.id) {
      case 'perfect-streak':
        if (activity.correctAnswers !== undefined) {
          newProgress = Math.max(newProgress, activity.correctAnswers);
          completed = newProgress >= challenge.goal;
        }
        break;

      case 'speed-demon':
        if (activity.timeSpent !== undefined) {
          newProgress = challenge.goal - activity.timeSpent; // How much under goal
          completed = activity.timeSpent <= challenge.goal;
        }
        break;

      case 'focus-master':
        if (activity.hintsUsed !== undefined && activity.hintsUsed === 0) {
          newProgress = Math.min(challenge.goal, newProgress + 1);
          completed = newProgress >= challenge.goal;
        }
        break;

      case 'early-bird':
        if (activity.testCompleted) {
          const now = new Date();
          completed = now.getHours() < 9;
          newProgress = completed ? 1 : 0;
        }
        break;

      case 'improvement-star':
        if (activity.score !== undefined && activity.previousScore !== undefined) {
          const improvement = activity.score - activity.previousScore;
          completed = improvement >= 2;
          newProgress = completed ? 1 : 0;
        }
        break;

      case 'skill-focus':
        if (activity.skillMastered) {
          newProgress = 1;
          completed = true;
        }
        break;

      case 'consistency-king':
        // This is tracked separately (weekly challenge)
        break;
    }

    return {
      ...challenge,
      progress: Math.max(0, Math.min(challenge.goal, newProgress)),
      completed,
      completedAt: completed && !challenge.completedAt ? new Date() : challenge.completedAt,
    };
  });
}

/**
 * Calculate total rewards from completed challenges
 */
export function calculateChallengeRewards(challenges: DailyChallenge[]): {
  xp: number;
  coins: number;
  gems: number;
} {
  return challenges
    .filter(c => c.completed)
    .reduce(
      (total, challenge) => ({
        xp: total.xp + challenge.xpReward,
        coins: total.coins + challenge.coinReward,
        gems: total.gems + challenge.gemReward,
      }),
      { xp: 0, coins: 0, gems: 0 }
    );
}
