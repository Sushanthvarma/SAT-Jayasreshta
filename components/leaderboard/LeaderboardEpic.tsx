/**
 * Leaderboard Epic View - Top 3 Podium Display
 * Uses GLOBAL leaderboard data - IDENTICAL for ALL users
 */

import { LeaderboardUser } from '@/lib/firebase/leaderboard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface LeaderboardEpicProps {
  topUsers: LeaderboardUser[]; // Top 3 users from GLOBAL leaderboard
  currentUserId?: string;
}

export function LeaderboardEpic({ topUsers, currentUserId }: LeaderboardEpicProps) {
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
      
      {/* Mobile: Vertical Stack */}
      <div className="block md:hidden space-y-4">
        {[first, second, third].map((user, idx) => {
          if (!user) return null;
          const rank = idx + 1;
          const isCurrentUser = user.uid === currentUserId;
          const mobileEmojis = ['👑', '🥈', '🥉'];
          
          return (
            <Card
              key={user.uid}
              variant={rank === 1 ? 'elevated' : 'default'}
              padding="md"
              className={`
                ${rank === 1 ? 'border-4 border-yellow-400' : 'border-2 border-gray-200'}
                ${isCurrentUser ? 'ring-4 ring-blue-500' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{mobileEmojis[rank - 1]}</div>
                <div className={`
                  w-16 h-16 rounded-full border-4 border-white shadow-xl
                  flex items-center justify-center text-white text-2xl font-bold
                  ${rank === 1 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                    : rank === 2
                    ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                    : 'bg-gradient-to-br from-orange-300 to-orange-400'
                  }
                `}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{user.displayName}</div>
                  <div className="text-sm text-gray-600">
                    Level {user.stats.level}
                    {user.stats.currentStreak > 0 && (
                      <> • 🔥 {user.stats.currentStreak}d</>
                    )}
                  </div>
                  <div className="text-xl font-bold text-indigo-600 mt-1">
                    {user.stats.totalXP.toLocaleString()} XP
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Desktop: Podium Layout */}
      <div className="hidden md:flex items-end justify-center gap-4 lg:gap-6 transition-all duration-300">
        {podiumOrder.map((user, idx) => {
          if (!user) return null;
          
          const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const isFirst = actualRank === 1;
          const isCurrentUser = user.uid === currentUserId;
          
          return (
            <Card
              key={user.uid}
              variant={isFirst ? 'elevated' : 'default'}
              padding="lg"
              className={`
                ${heights[idx]} 
                flex flex-col items-center justify-between
                ${isFirst ? 'border-4 border-yellow-400' : 'border-2 border-gray-200'}
                ${isCurrentUser ? 'ring-4 ring-blue-500' : ''}
                flex-1 max-w-xs
                transition-transform duration-300 hover:scale-105
              `}
            >
              {/* Rank Badge */}
              <div className="text-3xl sm:text-4xl mb-2">
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
                {isCurrentUser && (
                  <Badge variant="info" size="sm" className="mb-1">You</Badge>
                )}
                <Badge variant="info" size="sm">
                  Level {user.stats.level}
                </Badge>
              </div>
              
              {/* Stats */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">
                  {user.stats.totalXP.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">XP</div>
              </div>
              
              {/* Streak */}
              {user.stats.currentStreak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-orange-600">
                  <span className="text-lg">🔥</span>
                  <span className="text-xs sm:text-sm font-semibold">
                    {user.stats.currentStreak} day streak
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
