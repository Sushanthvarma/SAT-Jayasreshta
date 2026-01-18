import { DailyGoal } from '@/lib/types/gamification';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const DEFAULT_DAILY_GOAL_XP = 50;

/**
 * Get or create daily goal for a user
 */
export async function getDailyGoal(userId: string, date: string): Promise<DailyGoal> {
  const goalId = `${userId}_${date}`;
  const goalRef = adminDb.collection('dailyGoals').doc(goalId);
  const goalDoc = await goalRef.get();
  
  if (goalDoc.exists) {
    const data = goalDoc.data()!;
    return {
      id: goalId,
      userId,
      date,
      targetXP: data.targetXP || DEFAULT_DAILY_GOAL_XP,
      currentXP: data.currentXP || 0,
      completed: data.completed || false,
      streakBonus: data.streakBonus || 0,
    };
  }
  
  // Create new daily goal
  const newGoal: DailyGoal = {
    id: goalId,
    userId,
    date,
    targetXP: DEFAULT_DAILY_GOAL_XP,
    currentXP: 0,
    completed: false,
    streakBonus: 0,
  };
  
  await goalRef.set({
    ...newGoal,
    createdAt: FieldValue.serverTimestamp(),
  });
  
  return newGoal;
}

/**
 * Update daily goal XP
 */
export async function updateDailyGoalXP(
  userId: string,
  date: string,
  xpGained: number
): Promise<DailyGoal> {
  const goal = await getDailyGoal(userId, date);
  const newCurrentXP = goal.currentXP + xpGained;
  const completed = newCurrentXP >= goal.targetXP;
  
  const goalRef = adminDb.collection('dailyGoals').doc(goal.id);
  await goalRef.update({
    currentXP: newCurrentXP,
    completed: completed,
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return {
    ...goal,
    currentXP: newCurrentXP,
    completed: completed,
  };
}

/**
 * Get user's daily goal progress for today
 */
export async function getTodayGoal(userId: string): Promise<DailyGoal> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return getDailyGoal(userId, today);
}
