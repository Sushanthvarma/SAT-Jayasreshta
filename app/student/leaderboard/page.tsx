'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { UserStats, SocialComparison } from '@/lib/types/gamification';
import { LeaderboardEpic } from '@/components/leaderboard/LeaderboardEpic';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { 
  subscribeToGlobalLeaderboard, 
  calculateUserRank, 
  getTopUsers,
  type LeaderboardUser 
} from '@/lib/firebase/leaderboard';

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [comparison, setComparison] = useState<SocialComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // CRITICAL: Subscribe to GLOBAL leaderboard - same for ALL users
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    console.log('🌍 [LEADERBOARD] Subscribing to global leaderboard...');
    
    // Subscribe to real-time global leaderboard
    const unsubscribe = subscribeToGlobalLeaderboard((users) => {
      console.log('🌍 [LEADERBOARD] Global data received:', {
        totalUsers: users.length,
        top3: users.slice(0, 3).map(u => ({ 
          name: u.displayName, 
          xp: u.stats.totalXP 
        }))
      });
      
      setGlobalLeaderboard(users);
      setLoading(false);
      
      if (users.length === 0) {
        toast('No leaderboard data yet. Complete tests to earn XP and appear on the leaderboard!', { 
          icon: 'ℹ️',
          duration: 5000 
        });
      }
    }, 100);
    
    // Fetch user stats and comparison (still via API for now)
    const fetchUserStats = async () => {
      try {
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch('/api/leaderboard?limit=1&stats=true&comparison=true', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats || null);
            setComparison(data.comparison || null);
          }
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };
    
    fetchUserStats();
    
    return () => {
      console.log('🌍 [LEADERBOARD] Unsubscribing from global leaderboard');
      unsubscribe();
    };
  }, [user]);

  // CRITICAL: Calculate user's rank from GLOBAL leaderboard data
  // This ensures all users see the same rankings
  const userRank = useMemo(() => {
    if (!user || !globalLeaderboard.length) return -1;
    return calculateUserRank(globalLeaderboard, user.uid);
  }, [globalLeaderboard, user]);
  
  // Get top 3 for podium - SAME for ALL users
  const topThree = useMemo(() => {
    return getTopUsers(globalLeaderboard, 3);
  }, [globalLeaderboard]);
  
  // Get current user's data from global leaderboard
  const currentUserData = useMemo(() => {
    if (!user) return null;
    return globalLeaderboard.find(u => u.uid === user.uid) || null;
  }, [globalLeaderboard, user]);
  
  // Convert LeaderboardUser[] to LeaderboardEntry[] format for components
  const leaderboardEntries = useMemo(() => {
    return globalLeaderboard.map((user, index) => ({
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      rank: index + 1, // Rank = position in sorted list
      xp: user.stats.totalXP,
      level: user.stats.level,
      streak: user.stats.currentStreak,
      testsCompleted: user.stats.testsCompleted,
      averageScore: 0, // Not available in real-time data
      isCurrentUser: user.uid === user?.uid,
    }));
  }, [globalLeaderboard, user]);

  // Conditional returns AFTER all hooks
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
            <p className="text-base sm:text-lg text-gray-600">See how you rank among all students</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Updates
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-800 font-semibold">Error loading leaderboard</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <p className="text-red-500 text-xs mt-2">Real-time updates will retry automatically</p>
              </div>
            </div>
          </div>
        )}

        {/* Social Comparison Card - Shows user's PERSONAL rank in GLOBAL leaderboard */}
        {currentUserData && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-bold mb-2">
                  {userRank > 0 ? `#${userRank}` : '—'}
                </div>
                <div className="text-xs sm:text-sm opacity-90">Your Rank</div>
                {comparison && comparison.rankChange !== 0 && (
                  <div className={`text-xs mt-1 font-semibold ${
                    comparison.rankChange > 0 ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {comparison.rankChange > 0 ? '↑' : '↓'} {Math.abs(comparison.rankChange)} {Math.abs(comparison.rankChange) === 1 ? 'rank' : 'ranks'}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-bold mb-2">
                  {globalLeaderboard.length > 0 && userRank > 0 
                    ? `${Math.round((1 - userRank / globalLeaderboard.length) * 100)}%` 
                    : '—'}
                </div>
                <div className="text-xs sm:text-sm opacity-90">Better Than</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-bold mb-2">
                  {stats?.averageScore !== undefined && stats.averageScore !== null ? `${stats.averageScore}%` : '—'}
                </div>
                <div className="text-xs sm:text-sm opacity-90">Your Average</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-bold mb-2">
                  {comparison?.averageScore !== undefined && comparison.averageScore !== null ? `${comparison.averageScore}%` : '—'}
                </div>
                <div className="text-xs sm:text-sm opacity-90">Platform Average</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium - IDENTICAL for ALL users */}
        {topThree.length >= 3 && (
          <div className="mb-12 sm:mb-16 lg:mb-20 relative z-0">
            <LeaderboardEpic topUsers={topThree} currentUserId={user?.uid} />
          </div>
        )}

        {/* Full Leaderboard Table - IDENTICAL for ALL users */}
        <div className="mt-8 sm:mt-12 lg:mt-16 relative z-10">
          <LeaderboardTable 
            users={globalLeaderboard} 
            currentUserId={user?.uid}
          />
        </div>
      </div>
    </div>
  );
}
