'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import { DailyGoal } from '@/lib/types/gamification';

export default function DailyGoalWidget() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDailyGoal();
    }
  }, [user]);

  const fetchDailyGoal = async () => {
    try {
      setLoading(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/daily-goals', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setGoal(data.goal);
      }
    } catch (error) {
      console.error('Error fetching daily goal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading || !goal) {
    return null;
  }

  const progress = (goal.currentXP / goal.targetXP) * 100;
  const isCompleted = goal.completed;

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Daily Goal</h3>
          <p className="text-sm text-gray-600">Keep your streak alive!</p>
        </div>
        {isCompleted && (
          <div className="text-3xl">🎉</div>
        )}
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            {goal.currentXP} / {goal.targetXP} XP
          </span>
          <span className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-indigo-600'}`}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          >
            {isCompleted && (
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {isCompleted ? (
        <div className="flex items-center gap-2 text-green-600 font-semibold">
          <span>✅</span>
          <span>Daily goal completed! Great job!</span>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          {goal.targetXP - goal.currentXP} XP to go!
        </div>
      )}
    </div>
  );
}
