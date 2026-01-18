export interface XPEntry {
  userId: string;
  xp: number;
  level: number;
  totalXP: number;
  lastActivity: Date | string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL: string | null;
  rank: number;
  xp: number;
  level: number;
  streak: number;
  testsCompleted: number;
  averageScore: number;
  isCurrentUser?: boolean;
}

export interface DailyGoal {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  targetXP: number;
  currentXP: number;
  completed: boolean;
  streakBonus: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  xpReward: number;
  badgeReward?: string;
  target: number; // e.g., complete 5 tests
  current: number;
  completed: boolean;
  expiresAt?: Date | string;
}

export interface UserStats {
  userId: string;
  displayName: string;
  photoURL: string | null;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  testsCompleted: number;
  averageScore: number;
  rank: number;
  percentile: number; // 0-100, where they stand
  badges: string[];
  totalStudyTime: number; // in minutes
  lastActive: Date | string;
}

export interface SocialComparison {
  userRank: number;
  totalUsers: number;
  percentile: number;
  betterThan: number; // percentage of users
  averageScore: number; // platform average
  userScore: number;
  rankChange: number; // +5 means moved up 5 ranks
}
