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
    // With Blaze plan, we can use proper indexes for better performance
    usersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'student') // Filter out admins at query level
      .orderBy('totalXP', 'desc')
      .limit(limit)
      .get();
  } catch (error: any) {
    // If index doesn't exist, fetch all students and sort in memory
    // With Blaze plan, we can fetch more users if needed
    console.warn('⚠️ Leaderboard orderBy query failed (index may be missing), fetching all and sorting in memory:', error.message);
    try {
      // Fetch all users (Blaze plan supports this)
      const allUsersSnapshot = await adminDb.collection('users').get();
      
      // Filter students and sort in memory by totalXP
      const sortedDocs = allUsersSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.role !== 'admin'; // Filter out admins
        })
        .sort((a, b) => {
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

  // PRODUCTION-GRADE: Calculate ranks correctly with ties
  // First, collect all entries and sort by XP
  const allEntries: Array<{ doc: any; data: any; xp: number }> = [];
  
  usersSnapshot.forEach((doc: any) => {
    const data = doc.data();
    if (data.role === 'admin') return; // Skip admins
    
    allEntries.push({
      doc,
      data,
      xp: data.totalXP || 0,
    });
  });
  
  // Sort by XP descending
  allEntries.sort((a, b) => b.xp - a.xp);
  
  // Calculate ranks: users with same XP get same rank
  const entries: LeaderboardEntry[] = [];
  let currentUserRank = 0;
  let rank = 1;
  let previousXP: number | null = null;
  
  for (let i = 0; i < allEntries.length; i++) {
    const { doc, data, xp } = allEntries[i];
    const isCurrentUser = !!(userId && doc.id === userId);
    
    // Update rank when XP decreases (handles ties - same XP = same rank)
    if (previousXP !== null && xp < previousXP) {
      rank = i + 1; // Rank = position in sorted list
    } else if (previousXP === null) {
      rank = 1; // First entry
    }
    // If xp === previousXP, rank stays the same (ties)
    
    previousXP = xp;
    
    if (isCurrentUser) {
      currentUserRank = rank;
    }
    
    entries.push({
      userId: doc.id,
      displayName: data.displayName || data.name || 'Student',
      photoURL: data.photoURL || null,
      rank: rank,
      xp: xp,
      level: data.level || 1,
      streak: data.currentStreak || 0,
      testsCompleted: data.totalTestsCompleted || 0,
      averageScore: data.averageScore || 0,
      isCurrentUser: isCurrentUser,
    });
  }

  // If current user is not in top results, get their rank separately
  // PRODUCTION-GRADE: Calculate rank correctly accounting for ties
  if (userId && currentUserRank === 0) {
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const userXP = userData.totalXP || 0;
        
        // Calculate rank: count users with higher XP + 1
        // This handles ties correctly (users with same XP get same rank)
        try {
          // Fetch all students to calculate rank with ties
          const allStudents = await adminDb
            .collection('users')
            .where('role', '==', 'student')
            .get();
          
          // Sort by XP descending
          const sortedStudents = allStudents.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
          
          // Calculate rank: find first user with same or lower XP
          // For new users (0 XP), they should be ranked after all users with XP > 0
          let calculatedRank = 1;
          let foundUser = false;
          
          for (let i = 0; i < sortedStudents.length; i++) {
            const studentXP = sortedStudents[i].totalXP || 0;
            if (studentXP > userXP) {
              calculatedRank++;
            } else if (studentXP === userXP) {
              // Found user or users with same XP - rank is calculatedRank
              foundUser = true;
              break;
            } else {
              // All remaining users have lower XP
              break;
            }
          }
          
          // If user not found in sorted list (shouldn't happen), they're last
          if (!foundUser && calculatedRank <= sortedStudents.length) {
            // User might be at the end - check if they're in the list
            const userInList = sortedStudents.find(s => s.id === userId);
            if (!userInList) {
              // User not in list, they're last
              calculatedRank = sortedStudents.length;
            }
          }
          
          currentUserRank = calculatedRank;
        } catch (countError: any) {
          console.error('Error calculating rank, using fallback:', countError);
          // Fallback: simple count
          const allUsers = await adminDb.collection('users').get();
          const usersAbove = allUsers.docs.filter(doc => {
            const data = doc.data();
            return data.role === 'student' && (data.totalXP || 0) > userXP;
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

  // Sort by rank, then by XP descending for same rank
  return entries.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return b.xp - a.xp; // Higher XP first for same rank
  });
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
