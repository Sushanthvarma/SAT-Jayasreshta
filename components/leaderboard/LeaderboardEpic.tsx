/**
 * Leaderboard Epic View - Top 3 Podium Display
 * Uses single source of truth data
 */

import { LeaderboardEntry } from '@/lib/types/gamification';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface LeaderboardEpicProps {
  topUsers: LeaderboardEntry[]; // Top 3 users from single source
}

export function LeaderboardEpic({ topUsers }: LeaderboardEpicProps) {
  if (topUsers.length < 3) {
    return null; // Don't show if we don't have top 3
  }
  
  const [first, second, third] = topUsers;
  
  // Podium visual ordering: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [second, first, third];
  const rankEmojis = ['🥈', '👑', '🥉'];
  const heights = ['h-48', 'h-56', 'h-40']; // Podium heights
  const rankLabels = ['2nd', '1st', '3rd'];
  
  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
        Top Performers
      </h2>
      <div className="flex items-end justify-center gap-4 sm:gap-6 transition-all duration-300">
        {podiumOrder.map((user, idx) => {
          if (!user) return null;
          
          const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const isFirst = actualRank === 1;
          
          return (
            <Card
              key={user.userId}
              variant={isFirst ? 'elevated' : 'default'}
              padding="lg"
              className={`
                ${heights[idx]} 
                flex flex-col items-center justify-between
                ${isFirst ? 'border-4 border-yellow-400' : 'border-2 border-gray-200'}
                flex-1 max-w-xs
                transition-transform duration-300 hover:scale-105
              `}
            >
              {/* Rank Badge */}
              <div className="text-4xl sm:text-5xl mb-2">
                {rankEmojis[idx]}
              </div>
              
              {/* Avatar */}
              <div className={`
                ${isFirst ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-24 sm:h-24'}
                rounded-full border-4 border-white shadow-xl mb-4
                flex items-center justify-center text-white
                ${isFirst 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-3xl sm:text-4xl animate-pulse' 
                  : actualRank === 2
                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-2xl sm:text-3xl'
                  : 'bg-gradient-to-br from-orange-300 to-orange-400 text-2xl sm:text-3xl'
                }
                font-bold transition-all duration-300 hover:shadow-2xl
              `}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.displayName.charAt(0).toUpperCase()
                )}
              </div>
              
              {/* User Info */}
              <div className="text-center mb-2">
                <div className={`font-bold ${isFirst ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} text-gray-900 mb-1`}>
                  {user.displayName}
                </div>
                <Badge variant="info" size="sm">
                  Level {user.level}
                </Badge>
              </div>
              
              {/* Stats */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">
                  {user.xp.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">XP</div>
              </div>
              
              {/* Streak */}
              {user.streak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-orange-600">
                  <span className="text-lg">🔥</span>
                  <span className="text-xs sm:text-sm font-semibold">
                    {user.streak} day streak
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
