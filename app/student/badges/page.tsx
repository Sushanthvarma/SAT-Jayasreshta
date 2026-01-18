'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Badge, getUserBadges } from '@/lib/gamification/badges';
import Link from 'next/link';

export default function BadgesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userData?.badges) {
      const badges = getUserBadges(userData.badges);
      setEarnedBadges(badges);
    }
  }, [userData]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b-2 shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Badges</h1>
              <p className="text-lg text-gray-600">
                {earnedBadges.length} badge{earnedBadges.length !== 1 ? 's' : ''} earned
              </p>
            </div>
            <Link
              href="/student"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {earnedBadges.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-gray-200">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-xl text-gray-600">No badges earned yet. Complete tests to earn badges!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-purple-200 hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{badge.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{badge.name}</h3>
                  <p className="text-gray-600">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
