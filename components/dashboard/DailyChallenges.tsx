/**
 * Daily Challenges Widget
 * Displays today's challenges with progress tracking
 */

'use client';

import { DailyChallenge } from '@/lib/gamification/daily-challenges';

interface DailyChallengesProps {
  challenges: DailyChallenge[];
  onChallengeClick?: (challengeId: string) => void;
}

export default function DailyChallenges({ challenges, onChallengeClick }: DailyChallengesProps) {
  if (challenges.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Daily Challenges</h3>
        <p className="text-gray-600">No challenges available today. Check back tomorrow!</p>
      </div>
    );
  }

  const completedCount = challenges.filter(c => c.completed).length;
  const totalRewards = challenges
    .filter(c => c.completed)
    .reduce(
      (total, c) => ({
        xp: total.xp + c.xpReward,
        coins: total.coins + c.coinReward,
        gems: total.gems + c.gemReward,
      }),
      { xp: 0, coins: 0, gems: 0 }
    );

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Daily Challenges</h3>
        <div className="text-sm text-gray-600">
          {completedCount} / {challenges.length} completed
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ width: `${(completedCount / challenges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            onClick={() => onChallengeClick && onChallengeClick(challenge.id)}
            className={`
              p-4 rounded-lg border-2 transition-all
              ${challenge.completed
                ? 'bg-green-50 border-green-300 cursor-pointer hover:shadow-md'
                : 'bg-gray-50 border-gray-200 cursor-pointer hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-3xl">{challenge.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{challenge.title}</h4>
                    {challenge.completed && (
                      <span className="text-green-600 text-sm font-bold">✓ Completed!</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
                  
                  {/* Progress */}
                  {!challenge.completed && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (challenge.progress / challenge.goal) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">
                        {challenge.progress} / {challenge.goal}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rewards */}
              <div className="text-right ml-4">
                <div className="flex items-center gap-2 text-sm">
                  {challenge.xpReward > 0 && (
                    <span className="text-blue-600 font-semibold">+{challenge.xpReward} XP</span>
                  )}
                  {challenge.coinReward > 0 && (
                    <span className="text-yellow-600 font-semibold">+{challenge.coinReward} 🪙</span>
                  )}
                  {challenge.gemReward > 0 && (
                    <span className="text-purple-600 font-semibold">+{challenge.gemReward} 💎</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Rewards Summary */}
      {completedCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total Rewards Earned:</span>
            <div className="flex items-center gap-4">
              {totalRewards.xp > 0 && (
                <span className="text-blue-600 font-bold">+{totalRewards.xp} XP</span>
              )}
              {totalRewards.coins > 0 && (
                <span className="text-yellow-600 font-bold">+{totalRewards.coins} 🪙</span>
              )}
              {totalRewards.gems > 0 && (
                <span className="text-purple-600 font-bold">+{totalRewards.gems} 💎</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
