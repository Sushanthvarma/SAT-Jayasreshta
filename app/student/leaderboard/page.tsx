'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/leaderboard?limit=100&stats=true&comparison=true', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setStats(data.stats || null);
        setComparison(data.comparison || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

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

  const currentUserEntry = leaderboard.find(entry => entry.isCurrentUser);
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-lg text-gray-600">See how you rank among all students</p>
        </div>

        {/* Social Comparison Card */}
        {comparison && stats && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">#{stats.rank}</div>
                <div className="text-sm opacity-90">Your Rank</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.percentile}%</div>
                <div className="text-sm opacity-90">Better Than</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.averageScore}%</div>
                <div className="text-sm opacity-90">Your Average</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{comparison.averageScore}%</div>
                <div className="text-sm opacity-90">Platform Average</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {topThree.length >= 3 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Top Performers</h2>
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-4 border-white shadow-xl mb-4 flex items-center justify-center text-white text-2xl font-bold">
                  {topThree[1].photoURL ? (
                    <img src={topThree[1].photoURL} alt={topThree[1].displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    topThree[1].displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 text-center min-w-[120px]">
                  <div className="text-3xl mb-2">🥈</div>
                  <div className="font-bold text-gray-900">{topThree[1].displayName}</div>
                  <div className="text-sm text-gray-600">{topThree[1].xp} XP</div>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-white shadow-2xl mb-4 flex items-center justify-center text-white text-3xl font-bold">
                  {topThree[0].photoURL ? (
                    <img src={topThree[0].photoURL} alt={topThree[0].displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    topThree[0].displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-xl p-4 text-center min-w-[140px] text-white">
                  <div className="text-4xl mb-2">👑</div>
                  <div className="font-bold">{topThree[0].displayName}</div>
                  <div className="text-sm opacity-90">{topThree[0].xp} XP</div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-4 border-white shadow-xl mb-4 flex items-center justify-center text-white text-2xl font-bold">
                  {topThree[2].photoURL ? (
                    <img src={topThree[2].photoURL} alt={topThree[2].displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    topThree[2].displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 text-center min-w-[120px]">
                  <div className="text-3xl mb-2">🥉</div>
                  <div className="font-bold text-gray-900">{topThree[2].displayName}</div>
                  <div className="text-sm text-gray-600">{topThree[2].xp} XP</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Full Rankings</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry, index) => {
              const isTopThree = entry.rank <= 3;
              const isCurrentUser = entry.isCurrentUser;
              
              return (
                <div
                  key={entry.userId}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    isCurrentUser ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
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
        </div>
      </div>
    </div>
  );
}
