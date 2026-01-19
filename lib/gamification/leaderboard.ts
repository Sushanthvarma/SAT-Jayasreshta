import { LeaderboardEntry, UserStats } from '@/lib/types/gamification';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(limit: number = 100, userId?: string): Promise<LeaderboardEntry[]> {
  let usersSnapshot;
  
  try {
    // Try to query with orderBy first (requires index)
    usersSnapshot = await adminDb
      .collection('users')
      .orderBy('totalXP', 'desc')
      .limit(limit)
      .get();
  } catch (error: any) {
    // If index doesn't exist or query fails, fetch all and sort in memory
    console.warn('⚠️ Leaderboard orderBy query failed, fetching all and sorting in memory:', error.message);
    try {
      const allUsersSnapshot = await adminDb.collection('users').limit(500).get();
      
      // Sort in memory by totalXP
      const sortedDocs = allUsersSnapshot.docs.sort((a, b) => {
        const aXP = a.data().totalXP || 0;
        const bXP = b.data().totalXP || 0;
        return bXP - aXP; // Descending
      });
      
      // Create a mock snapshot with sorted docs
      usersSnapshot = {
        docs: sortedDocs.slice(0, limit),
        empty: sortedDocs.length === 0,
        forEach: (callback: any) => {
          sortedDocs.slice(0, limit).forEach(callback);
        },
      } as any;
    } catch (fallbackError: any) {
      console.error('❌ Failed to fetch users for leaderboard:', fallbackError);
      return []; // Return empty array if everything fails
    }
  }

  const entries: LeaderboardEntry[] = [];
  let rank = 1;
  let currentUserRank = 0;

  usersSnapshot.forEach((doc: any) => {
    const data = doc.data();
    const isCurrentUser = !!(userId && doc.id === userId);
    
    // Only include students (not admins) and users with some activity
    if (data.role === 'admin') return;
    
    if (isCurrentUser) {
      currentUserRank = rank;
    }

    entries.push({
      userId: doc.id,
      displayName: data.displayName || data.name || 'Student',
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

  // If current user is not in top results, get their rank separately
  if (userId && currentUserRank === 0) {
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const userXP = userData.totalXP || 0;
        
        // Try to count users above, with fallback
        try {
          const usersAbove = await adminDb
            .collection('users')
            .where('totalXP', '>', userXP)
            .count()
            .get();
          
          currentUserRank = usersAbove.data().count + 1;
        } catch (countError: any) {
          // Fallback: fetch all and count in memory
          const allUsers = await adminDb.collection('users').limit(500).get();
          const usersAbove = allUsers.docs.filter(doc => {
            const data = doc.data();
            return data.role !== 'admin' && (data.totalXP || 0) > userXP;
          });
          currentUserRank = usersAbove.length + 1;
        }
        
        entries.push({
          userId: userId,
          displayName: userData.displayName || userData.name || 'Student',
          photoURL: userData.photoURL || null,
          rank: currentUserRank,
          xp: userXP,
          level: userData.level || 1,
          streak: userData.currentStreak || 0,
          testsCompleted: userData.totalTestsCompleted || 0,
          averageScore: userData.averageScore || 0,
          isCurrentUser: true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching current user rank:', error);
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

  // Get platform averages - limit to avoid quota issues
  let totalScore = 0;
  let usersWithScores = 0;
  let totalUsers = 0;
  
  try {
    const allUsersSnapshot = await adminDb.collection('users').limit(500).get();
    totalUsers = allUsersSnapshot.size;
    
    allUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      // Only count students, not admins
      if (data.role !== 'admin' && data.averageScore && data.averageScore > 0) {
        totalScore += data.averageScore;
        usersWithScores++;
      }
    });
  } catch (error: any) {
    console.warn('⚠️ Could not fetch all users for comparison:', error.message);
    // Use userStats data as fallback
    totalUsers = userStats.rank; // Approximate
  }
  
  const averageScore = usersWithScores > 0 ? totalScore / usersWithScores : 0;
  
  return {
    userRank: userStats.rank,
    totalUsers: totalUsers || userStats.rank,
    percentile: userStats.percentile,
    betterThan: userStats.percentile,
    averageScore: Math.round(averageScore),
    userScore: Math.round(userStats.averageScore),
    rankChange: 0, // TODO: Track rank changes over time
  };
}
