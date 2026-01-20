/**
 * Leaderboard Table View - Full Rankings
 * Uses GLOBAL leaderboard data - IDENTICAL for ALL users
 */

import { LeaderboardUser } from '@/lib/firebase/leaderboard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  currentUserId?: string;
}

export function LeaderboardTable({ users, currentUserId }: LeaderboardTableProps) {
  const getRankDisplay = (rank: number) => {
    const icons: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉' };
    return icons[rank] || `#${rank}`;
  };
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-400';
  };
  
  if (users.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leaderboard Data Yet</h3>
        <p className="text-gray-600 mb-4">
          Start taking tests to earn XP and appear on the leaderboard!
        </p>
      </Card>
    );
  }
  
  return (
    <Card variant="bordered" padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Full Rankings</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {users.length} {users.length === 1 ? 'student' : 'students'} on the leaderboard
        </p>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Streak</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tests</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, index) => {
              const rank = index + 1;
              const isCurrentUser = user.uid === currentUserId;
              const isTopThree = rank <= 3;
              const rankDisplay = getRankDisplay(rank);
              
              return (
                <tr
                  key={user.uid}
                  className={`
                    transition-colors duration-150
                    ${isCurrentUser 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-600' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <td className={`px-4 py-4 text-center font-bold text-lg ${getRankColor(rank)}`}>
                    {rankDisplay}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md text-sm">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isCurrentUser && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold truncate ${isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {user.displayName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="info" size="sm">You</Badge>
                          )}
                          {isTopThree && (
                            <Badge variant={rank === 1 ? 'warning' : 'neutral'} size="sm">
                              Top {rank}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="info" size="sm">
                      Level {user.stats.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {user.stats.currentStreak > 0 ? (
                      <span className="flex items-center gap-1 text-orange-600">
                        <span>🔥</span>
                        <span>{user.stats.currentStreak}d</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {user.stats.testsCompleted}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-xl font-bold text-indigo-600">
                      {user.stats.totalXP.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">XP</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-gray-100">
        {users.map((user, index) => {
          const rank = index + 1;
          const isCurrentUser = user.uid === currentUserId;
          const isTopThree = rank <= 3;
          const rankDisplay = getRankDisplay(rank);
          
          return (
            <div
              key={user.uid}
              className={`
                p-4 transition-all duration-200
                ${isCurrentUser 
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-600' 
                  : 'hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-10 text-center font-bold text-base ${getRankColor(rank)} flex-shrink-0`}>
                  {rankDisplay}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`font-bold truncate text-sm ${isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                      {user.displayName}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="info" size="sm">You</Badge>
                    )}
                    {isTopThree && (
                      <Badge variant={rank === 1 ? 'warning' : 'neutral'} size="sm">
                        Top {rank}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                    <span>Level {user.stats.level}</span>
                    {user.stats.currentStreak > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span>🔥</span>
                          <span>{user.stats.currentStreak}d streak</span>
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>{user.stats.testsCompleted} tests</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-bold text-indigo-600">
                      {user.stats.totalXP.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">XP</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
