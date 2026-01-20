/**
 * Leaderboard Table View - Full Rankings
 * Uses single source of truth data
 */

import { LeaderboardEntry } from '@/lib/types/gamification';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface LeaderboardTableProps {
  users: LeaderboardEntry[];
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
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-900">Full Rankings</h2>
        <p className="text-sm text-gray-600 mt-1">
          {users.length} {users.length === 1 ? 'student' : 'students'} on the leaderboard
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {users.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          const isTopThree = entry.rank <= 3;
          
          return (
            <div
              key={entry.userId}
              className={`
                p-4 sm:p-5 transition-all duration-200
                ${isCurrentUser 
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-600' 
                  : 'hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-12 text-center font-bold text-lg ${getRankColor(entry.rank)}`}>
                  {getRankDisplay(entry.rank)}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold truncate ${isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                      {entry.displayName}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="info" size="sm">You</Badge>
                    )}
                    {isTopThree && (
                      <Badge variant={entry.rank === 1 ? 'warning' : 'neutral'} size="sm">
                        Top {entry.rank}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                    <span>Level {entry.level}</span>
                    <span>•</span>
                    {entry.streak > 0 ? (
                      <span className="flex items-center gap-1">
                        <span>🔥</span>
                        <span>{entry.streak} day streak</span>
                      </span>
                    ) : (
                      <span>No streak</span>
                    )}
                    <span>•</span>
                    <span>{entry.testsCompleted} tests</span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-indigo-600">
                    {entry.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">XP</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
