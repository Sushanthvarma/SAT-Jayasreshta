/**
 * SINGLE SOURCE OF TRUTH: Leaderboard Data Query
 * 
 * This is the ONLY function that should be used to fetch leaderboard data.
 * All components (epic view, table view, etc.) must use this function.
 * 
 * CRITICAL RULES:
 * 1. Always fetch ALL users, then sort/rank in memory
 * 2. Use consistent ranking algorithm (handles ties correctly)
 * 3. Return data in consistent format
 * 4. No client-side filtering that could cause inconsistencies
 */

import { adminDb } from '@/lib/firebase-admin';
import { LeaderboardEntry } from '@/lib/types/gamification';

/**
 * Get leaderboard data - SINGLE SOURCE OF TRUTH
 * 
 * @param limit - Maximum number of entries to return (default: all)
 * @param userId - Optional current user ID to mark in results
 * @returns Array of leaderboard entries sorted by rank
 */
export async function getLeaderboardData(
  limit: number = 10000,
  userId?: string
): Promise<LeaderboardEntry[]> {
  let allStudents: Array<{ doc: any; data: any; xp: number }> = [];
  
  try {
    // PRODUCTION-GRADE: Always fetch ALL students for consistent leaderboard
    const allUsersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'student')
      .get();
    
    // Convert to array and sort by XP descending
    allStudents = allUsersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          doc,
          data,
          xp: data.totalXP || 0,
        };
      })
      .sort((a, b) => b.xp - a.xp); // Sort by XP descending
    
    console.log(`✅ [SINGLE SOURCE] Fetched ${allStudents.length} students for leaderboard`);
  } catch (error: any) {
    // Fallback: try without role filter
    console.warn('⚠️ Leaderboard query with role filter failed, trying fallback:', error.message);
    try {
      const allUsersSnapshot = await adminDb.collection('users').get();
      
      // Filter students and sort in memory by totalXP
      allStudents = allUsersSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.role === 'student' || data.role === undefined;
        })
        .map(doc => {
          const data = doc.data();
          return {
            doc,
            data,
            xp: data.totalXP || 0,
          };
        })
        .sort((a, b) => b.xp - a.xp);
      
      console.log(`✅ [SINGLE SOURCE] Fetched ${allStudents.length} students (fallback method)`);
    } catch (fallbackError: any) {
      console.error('❌ Failed to fetch users for leaderboard:', fallbackError);
      return []; // Return empty array if everything fails
    }
  }

  // PRODUCTION-GRADE: Calculate ranks correctly with ties
  // Rank = position in sorted list, but same XP = same rank
  const entries: LeaderboardEntry[] = [];
  
  // Calculate ranks for ALL students (consistent across all users)
  for (let i = 0; i < allStudents.length; i++) {
    const { doc, data, xp } = allStudents[i];
    const isCurrentUser = !!(userId && doc.id === userId);
    
    // Calculate rank: position in sorted list (1-based)
    // Users with same XP get the same rank (ties)
    let rank = i + 1;
    
    // If this user has the same XP as previous user, use previous rank
    if (i > 0 && xp === allStudents[i - 1].xp) {
      // Find the first user with this XP value to get their rank
      for (let j = i - 1; j >= 0; j--) {
        if (allStudents[j].xp === xp) {
          rank = j + 1; // Use the rank of the first user with this XP
        } else {
          break; // Stop when we find a different XP value
        }
      }
    }
    
    // Add entry
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

  // PRODUCTION-GRADE: Always include current user if they're not in the list
  if (userId) {
    const currentUserInList = entries.find(e => e.userId === userId);
    if (!currentUserInList) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const userXP = userData.totalXP || 0;
          
          // Calculate rank: count users with higher XP + 1
          let calculatedRank = 1;
          for (const student of allStudents) {
            if (student.xp > userXP) {
              calculatedRank++;
            } else if (student.xp === userXP) {
              // Found users with same XP - rank is calculatedRank
              break;
            } else {
              // All remaining users have lower XP
              break;
            }
          }
          
          entries.push({
            userId: userId,
            displayName: userData.displayName || userData.name || 'Student',
            photoURL: userData.photoURL || null,
            rank: calculatedRank,
            xp: userXP,
            level: userData.level || 1,
            streak: userData.currentStreak || 0,
            testsCompleted: userData.totalTestsCompleted || 0,
            averageScore: userData.averageScore || 0,
            isCurrentUser: true,
          });
        }
      } catch (error: any) {
        console.error('Error fetching current user for leaderboard:', error);
      }
    }
  }

  // Sort by rank, then by XP descending for same rank
  // Return ALL entries (consistent leaderboard for all users)
  const sorted = entries.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return b.xp - a.xp; // Higher XP first for same rank
  });

  // Apply limit if specified
  return limit > 0 && limit < sorted.length ? sorted.slice(0, limit) : sorted;
}
