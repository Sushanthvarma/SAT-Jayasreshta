/**
 * GLOBAL LEADERBOARD - SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL: This uses Firebase client SDK with real-time listeners
 * ALL users see IDENTICAL global rankings
 * Updates automatically when ANY user's score changes
 */

import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';

export interface LeaderboardUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  stats: {
    totalXP: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    testsCompleted: number;
  };
  lastActive: any;
}

/**
 * CRITICAL: This is the ONLY function that should fetch leaderboard data
 * ALL components must use this function - no exceptions
 * This ensures every user sees IDENTICAL global rankings
 * 
 * @param callback - Function called with leaderboard data whenever it updates
 * @param maxUsers - Maximum number of users to fetch (default: 100)
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToGlobalLeaderboard(
  callback: (users: LeaderboardUser[]) => void,
  maxUsers: number = 100
): Unsubscribe {
  const db = getDbInstance();
  
  // GLOBAL query - NO user-specific filters
  // CRITICAL: This query is IDENTICAL for ALL users
  // Note: We filter by role='student' in memory after fetching
  // because Firestore requires composite index for where + orderBy
  const leaderboardQuery = query(
    collection(db, 'users'),
    orderBy('totalXP', 'desc'), // totalXP is at root level, not under stats
    limit(maxUsers * 2) // Fetch more to account for non-students
  );
  
  // Real-time listener - updates automatically when ANY user's score changes
  const unsubscribe = onSnapshot(
    leaderboardQuery,
    (snapshot: QuerySnapshot<DocumentData>) => {
      // Filter students and map to LeaderboardUser format
      const users: LeaderboardUser[] = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          // Only include students (role === 'student' or role is undefined for legacy users)
          return data.role === 'student' || data.role === undefined;
        })
        .slice(0, maxUsers) // Limit to maxUsers after filtering
        .map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email || '',
            displayName: data.displayName || data.name || 'Student',
            photoURL: data.photoURL || null,
            stats: {
              totalXP: data.totalXP || 0,
              level: data.level || 1,
              currentStreak: data.currentStreak || 0,
              longestStreak: data.longestStreak || 0,
              testsCompleted: data.totalTestsCompleted || 0,
            },
            lastActive: data.lastActive || data.lastLoginAt || null,
          };
        });
      
      console.log('🌍 [GLOBAL LEADERBOARD] Updated:', {
        totalUsers: users.length,
        top3: users.slice(0, 3).map(u => ({ 
          name: u.displayName, 
          xp: u.stats.totalXP 
        }))
      });
      
      // Callback with GLOBAL leaderboard data
      callback(users);
    },
    (error) => {
      console.error('❌ Leaderboard subscription error:', error);
      // Return empty array on error
      callback([]);
    }
  );
  
  return unsubscribe;
}

/**
 * Calculate user's rank from GLOBAL leaderboard data
 * Never calculate rank in isolation - always from global context
 */
export function calculateUserRank(
  globalLeaderboard: LeaderboardUser[],
  currentUserId: string
): number {
  const index = globalLeaderboard.findIndex(user => user.uid === currentUserId);
  return index !== -1 ? index + 1 : -1; // Return -1 if user not in top N
}

/**
 * Get top N users from GLOBAL leaderboard
 */
export function getTopUsers(
  globalLeaderboard: LeaderboardUser[],
  count: number
): LeaderboardUser[] {
  return globalLeaderboard.slice(0, count);
}

/**
 * Validate leaderboard data sync
 * Run this from multiple browsers - all should return IDENTICAL results
 */
export async function validateLeaderboardSync(): Promise<LeaderboardUser[]> {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeToGlobalLeaderboard((users) => {
      console.log('🔍 [VALIDATION] Fetched global leaderboard:');
      console.table(users.slice(0, 10).map((u, i) => ({
        rank: i + 1,
        name: u.displayName,
        xp: u.stats.totalXP,
        uid: u.uid.substring(0, 8) + '...'
      })));
      
      console.log('\n✅ If ALL browsers show IDENTICAL table above, sync is working');
      console.log('❌ If browsers show DIFFERENT tables, sync is BROKEN');
      
      unsubscribe();
      resolve(users);
    }, 10);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Validation timeout'));
    }, 10000);
  });
}
