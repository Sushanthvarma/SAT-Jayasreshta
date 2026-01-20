import { LeaderboardEntry, UserStats } from '@/lib/types/gamification';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getLeaderboardData } from '@/lib/leaderboard';

/**
 * Get leaderboard entries
 * PRODUCTION-GRADE: Uses single source of truth function
 * @deprecated Use getLeaderboardData from '@/lib/leaderboard' directly
 * This function is kept for backward compatibility
 */
export async function getLeaderboard(limit: number = 100, userId?: string): Promise<LeaderboardEntry[]> {
  // Use single source of truth
  return getLeaderboardData(limit, userId);
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
  
  // PRODUCTION-GRADE: Calculate rank correctly accounting for ties
  // Rank = number of users with higher XP + 1
  // Users with same XP get the same rank
  let rank = 1;
  try {
    // Fetch all students to calculate rank with ties
    const allStudents = await adminDb
      .collection('users')
      .where('role', '==', 'student')
      .get();
    
    // Sort by XP descending
    const sortedStudents = allStudents.docs
      .map(doc => ({ id: doc.id, totalXP: doc.data().totalXP || 0 }))
      .sort((a, b) => b.totalXP - a.totalXP);
    
    // Calculate rank: find position in sorted list
    // Rank = number of users with strictly higher XP + 1
    // For new users (0 XP), they rank after all users with XP > 0
    let usersWithHigherXP = 0;
    let foundUser = false;
    
    for (const student of sortedStudents) {
      if (student.totalXP > totalXP) {
        usersWithHigherXP++;
      } else if (student.totalXP === totalXP) {
        // Found user or users with same XP
        foundUser = true;
        break;
      } else {
        // All remaining users have lower XP
        break;
      }
    }
    
    // Rank = users with higher XP + 1
    // If user has 0 XP and there are users with XP > 0, they rank after all of them
    rank = usersWithHigherXP + 1;
    
    // Ensure rank is at least 1 and not greater than total students
    if (rank < 1) rank = 1;
    if (rank > sortedStudents.length) rank = sortedStudents.length;
  } catch (error: any) {
    // Fallback: fetch all and count in memory
    const allUsers = await adminDb.collection('users').get();
    const studentsAbove = allUsers.docs.filter(doc => {
      const data = doc.data();
      return data.role === 'student' && (data.totalXP || 0) > totalXP;
    });
    rank = studentsAbove.length + 1;
  }
  
  // Calculate total students (not admins)
  let totalUsers = 0;
  try {
    const totalUsersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'student')
      .count()
      .get();
    totalUsers = totalUsersSnapshot.data().count;
  } catch (error: any) {
    // Fallback: count in memory
    const allUsers = await adminDb.collection('users').get();
    totalUsers = allUsers.docs.filter(doc => doc.data().role === 'student').length;
  }
  
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

  // Get platform averages (Blaze plan allows fetching all users)
  let totalScore = 0;
  let usersWithScores = 0;
  let totalUsers = 0;
  
  try {
    // Fetch all students for accurate platform averages
    const allUsersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'student')
      .get();
    
    totalUsers = allUsersSnapshot.size;
    
    allUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.averageScore && data.averageScore > 0) {
        totalScore += data.averageScore;
        usersWithScores++;
      }
    });
  } catch (error: any) {
    console.warn('⚠️ Could not fetch all users for comparison:', error.message);
    // Fallback: fetch all and filter
    try {
      const allUsers = await adminDb.collection('users').get();
      totalUsers = allUsers.docs.filter(doc => doc.data().role === 'student').length;
      allUsers.docs.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'student' && data.averageScore && data.averageScore > 0) {
          totalScore += data.averageScore;
          usersWithScores++;
        }
      });
    } catch (fallbackError: any) {
      console.error('❌ Failed to fetch users for comparison:', fallbackError);
      totalUsers = userStats.rank; // Approximate fallback
    }
  }
  
  const averageScore = usersWithScores > 0 ? totalScore / usersWithScores : 0;
  
  // Calculate rank change: compare current rank with previous rank
  let rankChange = 0;
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const previousRank = userData.previousRank || userStats.rank; // Default to current if no previous
      const currentRank = userStats.rank;
      
      // Rank change: positive = moved up (better), negative = moved down (worse)
      // If previousRank is higher (worse), and currentRank is lower (better), rankChange is positive
      rankChange = previousRank - currentRank;
      
      // Update previous rank for next time (only if rank actually changed)
      if (previousRank !== currentRank) {
        await adminDb.collection('users').doc(userId).update({
          previousRank: currentRank,
          lastRankUpdate: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error: any) {
    console.error('Error calculating rank change:', error);
    // Continue with rankChange = 0 if error occurs
  }
  
  return {
    userRank: userStats.rank,
    totalUsers: totalUsers || userStats.rank,
    percentile: userStats.percentile,
    betterThan: userStats.percentile,
    averageScore: Math.round(averageScore),
    userScore: Math.round(userStats.averageScore),
    rankChange: rankChange, // Positive = moved up, negative = moved down, 0 = no change
  };
}
