'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { LeaderboardEntry, UserStats, SocialComparison } from '@/lib/types/gamification';
import { LeaderboardEpic } from '@/components/leaderboard/LeaderboardEpic';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [comparison, setComparison] = useState<SocialComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
      
      // PRODUCTION-GRADE: Set up periodic refresh to keep leaderboard in sync
      // Refresh every 30 seconds to catch real-time updates
      const refreshInterval = setInterval(() => {
        fetchLeaderboard();
      }, 30000); // 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/leaderboard?limit=100&stats=true&comparison=true', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setStats(data.stats || null);
        setComparison(data.comparison || null);
        
        if (!data.leaderboard || data.leaderboard.length === 0) {
          toast('No leaderboard data yet. Complete tests to earn XP and appear on the leaderboard!', { 
            icon: 'ℹ️',
            duration: 5000 
          });
        }
      } else {
        const errorMsg = data.error || 'Failed to load leaderboard';
        console.error('Leaderboard API error:', errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      const errorMsg = error.message || 'Failed to load leaderboard. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // PRODUCTION-GRADE: Use single source of truth for leaderboard data
  // API already returns sorted data, but ensure consistency with defensive sorting
  // Sort by rank first, then by XP descending for same rank (consistent with server)
  // IMPORTANT: All hooks must be called before any conditional returns (Rules of Hooks)
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [];
    return [...leaderboard].sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank; // Lower rank number = better
      }
      return b.xp - a.xp; // Higher XP first for same rank
    });
  }, [leaderboard]);
  
  // PRODUCTION-GRADE: Extract top 3 from the same sorted data source
  // CRITICAL FIX: Get top 3 by XP (not by rank) to ensure consistency
  // This ensures epic view and table view use IDENTICAL data
  const { topThree, rank1, rank2, rank3 } = useMemo(() => {
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) {
      return { rank1: undefined, rank2: undefined, rank3: undefined, topThree: [] };
    }
    
    // Get top 3 entries by XP (already sorted by rank, then XP)
    // This ensures we get the actual top 3 users, not just first user of each rank
    const top3ByXP = sortedLeaderboard.slice(0, 3);
    
    // Extract by position (0=1st, 1=2nd, 2=3rd)
    const r1 = top3ByXP[0];
    const r2 = top3ByXP[1];
    const r3 = top3ByXP[2];
    
    return {
      rank1: r1,
      rank2: r2,
      rank3: r3,
      topThree: [r1, r2, r3].filter(Boolean) as LeaderboardEntry[]
    };
  }, [sortedLeaderboard]);
  
  const currentUserEntry = useMemo(() => {
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) return undefined;
    return sortedLeaderboard.find(entry => entry.isCurrentUser);
  }, [sortedLeaderboard]);

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
            <p className="text-lg text-gray-600">See how you rank among all students</p>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-800 font-semibold">Error loading leaderboard</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors min-h-[36px]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Social Comparison Card */}
        {comparison && stats && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {stats.rank && stats.rank > 0 ? `#${stats.rank}` : '—'}
                </div>
                <div className="text-sm opacity-90">Your Rank</div>
                {comparison.rankChange !== 0 && (
                  <div className={`text-xs mt-1 font-semibold ${
                    comparison.rankChange > 0 ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {comparison.rankChange > 0 ? '↑' : '↓'} {Math.abs(comparison.rankChange)} {Math.abs(comparison.rankChange) === 1 ? 'rank' : 'ranks'}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {stats.percentile !== undefined && stats.percentile !== null ? `${Math.round(stats.percentile)}%` : '—'}
                </div>
                <div className="text-sm opacity-90">Better Than</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {stats.averageScore !== undefined && stats.averageScore !== null ? `${stats.averageScore}%` : '—'}
                </div>
                <div className="text-sm opacity-90">Your Average</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {comparison.averageScore !== undefined && comparison.averageScore !== null ? `${comparison.averageScore}%` : '—'}
                </div>
                <div className="text-sm opacity-90">Platform Average</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium - Uses single source of truth */}
        {topThree.length >= 3 && (
          <LeaderboardEpic topUsers={topThree} />
        )}

        {/* Full Leaderboard Table - Uses single source of truth */}
        <LeaderboardTable 
          users={sortedLeaderboard} 
          currentUserId={user?.uid}
        />
      </div>
    </div>
  );
}
