import { LeaderboardEntry, UserStats } from '@/lib/types/gamification';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(limit: number = 100, userId?: string): Promise<LeaderboardEntry[]> {
  const usersSnapshot = await adminDb
    .collection('users')
    .orderBy('totalXP', 'desc')
    .limit(limit)
    .get();

  const entries: LeaderboardEntry[] = [];
  let rank = 1;
  let currentUserRank = 0;

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    const isCurrentUser = !!(userId && doc.id === userId);
    
    if (isCurrentUser) {
      currentUserRank = rank;
    }

    entries.push({
      userId: doc.id,
      displayName: data.displayName || 'Student',
      photoURL: data.photoURL || null,
      rank: rank++,
      xp: data.totalXP || 0,
      level: data.level || 1,
      streak: data.currentStreak || 0,
      testsCompleted: data.totalTestsCompleted || 0,
      averageScore: data.averageScore || 0,
      isCurrentUser: isCurrentUser,
    });
  });

  // If current user is not in top 100, get their rank separately
  if (userId && currentUserRank === 0) {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const usersAbove = await adminDb
        .collection('users')
        .where('totalXP', '>', userData.totalXP || 0)
        .count()
        .get();
      
      currentUserRank = usersAbove.data().count + 1;
      
      entries.push({
        userId: userId,
        displayName: userData.displayName || 'Student',
        photoURL: userData.photoURL || null,
        rank: currentUserRank,
        xp: userData.totalXP || 0,
        level: userData.level || 1,
        streak: userData.currentStreak || 0,
        testsCompleted: userData.totalTestsCompleted || 0,
        averageScore: userData.averageScore || 0,
        isCurrentUser: true,
      });
    }
  }

  return entries.sort((a, b) => a.rank - b.rank);
}

/**
 * Get user stats with ranking
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data()!;
  const totalXP = userData.totalXP || 0;
  
  // Calculate rank
  const usersAbove = await adminDb
    .collection('users')
    .where('totalXP', '>', totalXP)
    .count()
    .get();
  
  const rank = usersAbove.data().count + 1;
  
  // Calculate total users
  const totalUsersSnapshot = await adminDb.collection('users').count().get();
  const totalUsers = totalUsersSnapshot.data().count;
  
  // Calculate percentile
  const percentile = totalUsers > 0 ? ((totalUsers - rank) / totalUsers) * 100 : 0;
  
  return {
    userId: userId,
    displayName: userData.displayName || 'Student',
    photoURL: userData.photoURL || null,
    totalXP: totalXP,
    level: userData.level || 1,
    currentStreak: userData.currentStreak || 0,
    longestStreak: userData.longestStreak || 0,
    testsCompleted: userData.totalTestsCompleted || 0,
    averageScore: userData.averageScore || 0,
    rank: rank,
    percentile: Math.round(percentile),
    badges: userData.badges || [],
    totalStudyTime: userData.totalStudyTime || 0,
    lastActive: userData.lastLoginAt?.toDate() || new Date(),
  };
}

/**
 * Update user XP and level
 */
export async function updateUserXP(
  userId: string,
  xpGained: number,
  reason: string
): Promise<{ newTotalXP: number; newLevel: number; leveledUp: boolean }> {
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data()!;
  const currentXP = userData.totalXP || 0;
  const currentLevel = userData.level || 1;
  const newTotalXP = currentXP + xpGained;
  
  // Calculate new level
  const { getLevelFromXP } = await import('./xp');
  const newLevel = getLevelFromXP(newTotalXP);
  const leveledUp = newLevel > currentLevel;
  
  // Update user
  await userRef.update({
    totalXP: newTotalXP,
    level: newLevel,
    lastActivity: FieldValue.serverTimestamp(),
  });
  
  // Log XP gain
  await adminDb.collection('xpLogs').add({
    userId,
    xpGained,
    reason,
    totalXP: newTotalXP,
    level: newLevel,
    timestamp: FieldValue.serverTimestamp(),
  });
  
  return {
    newTotalXP,
    newLevel,
    leveledUp,
  };
}

/**
 * Get social comparison data
 */
export async function getSocialComparison(userId: string): Promise<{
  userRank: number;
  totalUsers: number;
  percentile: number;
  betterThan: number;
  averageScore: number;
  userScore: number;
  rankChange: number;
}> {
  const userStats = await getUserStats(userId);
  if (!userStats) {
    throw new Error('User not found');
  }

  // Get platform averages
  const allUsersSnapshot = await adminDb.collection('users').get();
  let totalScore = 0;
  let usersWithScores = 0;
  
  allUsersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.averageScore && data.averageScore > 0) {
      totalScore += data.averageScore;
      usersWithScores++;
    }
  });
  
  const averageScore = usersWithScores > 0 ? totalScore / usersWithScores : 0;
  
  return {
    userRank: userStats.rank,
    totalUsers: allUsersSnapshot.size,
    percentile: userStats.percentile,
    betterThan: userStats.percentile,
    averageScore: Math.round(averageScore),
    userScore: Math.round(userStats.averageScore),
    rankChange: 0, // TODO: Track rank changes over time
  };
}
