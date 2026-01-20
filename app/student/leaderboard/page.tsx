'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { LeaderboardEntry, UserStats, SocialComparison } from '@/lib/types/gamification';

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
  // This ensures epic view and table view use identical data
  const { topThree, rank1, rank2, rank3 } = useMemo(() => {
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) {
      return { rank1: undefined, rank2: undefined, rank3: undefined, topThree: [] };
    }
    const r1 = sortedLeaderboard.find(e => e.rank === 1);
    const r2 = sortedLeaderboard.find(e => e.rank === 2);
    const r3 = sortedLeaderboard.find(e => e.rank === 3);
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

        {/* Top 3 Podium */}
        {topThree.length >= 3 && (
          <div className="mb-8 animate-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">Top Performers</h2>
            <div className="flex items-end justify-center gap-4 sm:gap-6 mb-8 transition-all duration-300">
              {/* 2nd Place (Left) */}
              {rank2 && (
                <div className="flex flex-col items-center transform transition-all duration-300 hover:scale-105">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-4 border-white shadow-xl mb-4 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold transition-all duration-300 hover:shadow-2xl">
                    {rank2.photoURL ? (
                      <img src={rank2.photoURL} alt={rank2.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      rank2.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center min-w-[120px] sm:min-w-[140px] border-2 border-gray-200 transition-all duration-300 hover:shadow-xl">
                    <div className="text-3xl sm:text-4xl mb-2">🥈</div>
                    <div className="font-bold text-gray-900 text-sm sm:text-base">{rank2.displayName}</div>
                    <div className="text-sm text-gray-600 font-semibold">{rank2.xp.toLocaleString()} XP</div>
                  </div>
                </div>
              )}

              {/* 1st Place (Center) */}
              {rank1 && (
                <div className="flex flex-col items-center transform transition-all duration-300 hover:scale-105">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-white shadow-2xl mb-4 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold transition-all duration-300 hover:shadow-3xl animate-pulse">
                    {rank1.photoURL ? (
                      <img src={rank1.photoURL} alt={rank1.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      rank1.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-xl p-4 sm:p-5 text-center min-w-[140px] sm:min-w-[160px] text-white border-2 border-yellow-300 transition-all duration-300 hover:shadow-2xl">
                    <div className="text-4xl sm:text-5xl mb-2">👑</div>
                    <div className="font-bold text-base sm:text-lg">{rank1.displayName}</div>
                    <div className="text-sm sm:text-base opacity-90 font-semibold">{rank1.xp.toLocaleString()} XP</div>
                  </div>
                </div>
              )}

              {/* 3rd Place (Right) */}
              {rank3 && (
                <div className="flex flex-col items-center transform transition-all duration-300 hover:scale-105">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-4 border-white shadow-xl mb-4 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold transition-all duration-300 hover:shadow-2xl">
                    {rank3.photoURL ? (
                      <img src={rank3.photoURL} alt={rank3.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      rank3.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center min-w-[120px] sm:min-w-[140px] border-2 border-gray-200 transition-all duration-300 hover:shadow-xl">
                    <div className="text-3xl sm:text-4xl mb-2">🥉</div>
                    <div className="font-bold text-gray-900 text-sm sm:text-base">{rank3.displayName}</div>
                    <div className="text-sm text-gray-600 font-semibold">{rank3.xp.toLocaleString()} XP</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Full Rankings</h2>
            {leaderboard.length === 0 && (
              <p className="text-sm text-gray-600 mt-2">No rankings yet. Complete tests to earn XP!</p>
            )}
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leaderboard Data Yet</h3>
              <p className="text-gray-600 mb-4">
                Start taking tests to earn XP and appear on the leaderboard!
              </p>
              <button
                onClick={() => router.push('/student')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors min-h-[44px]"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedLeaderboard.map((entry, index) => {
              const isTopThree = entry.rank <= 3;
              const isCurrentUser = entry.isCurrentUser;
              
              return (
                <div
                  key={entry.userId}
                  className={`p-4 sm:p-5 hover:bg-gray-50 transition-all duration-200 rounded-lg ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-600 shadow-sm' 
                      : 'hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-12 text-center font-bold text-lg ${
                      entry.rank === 1 ? 'text-yellow-600' :
                      entry.rank === 2 ? 'text-gray-500' :
                      entry.rank === 3 ? 'text-orange-600' :
                      'text-gray-400'
                    }`}>
                      {isTopThree ? (
                        entry.rank === 1 ? '👑' :
                        entry.rank === 2 ? '🥈' :
                        '🥉'
                      ) : (
                        `#${entry.rank}`
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      {entry.photoURL ? (
                        <img
                          src={entry.photoURL}
                          alt={entry.displayName}
                          className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                          {entry.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isCurrentUser && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Level {entry.level}</span>
                        <span>•</span>
                        <span>🔥 {entry.streak} day streak</span>
                        <span>•</span>
                        <span>{entry.testsCompleted} tests</span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">{entry.xp.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">XP</div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
