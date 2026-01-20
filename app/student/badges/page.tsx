'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Badge, getUserBadges } from '@/lib/gamification/badges';
import Link from 'next/link';
import Header from '@/components/layout/Header';

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
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

      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Your Achievements</h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            {earnedBadges.length} badge{earnedBadges.length !== 1 ? 's' : ''} earned
          </p>
        </div>

        {earnedBadges.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sm:p-8 lg:p-12 text-center">
            <div className="text-5xl sm:text-6xl lg:text-7xl mb-4 sm:mb-6">🏆</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No Badges Yet</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Complete tests and maintain streaks to earn badges!</p>
            <Link
              href="/student"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Start Practicing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8 border-2 border-purple-200 hover:shadow-xl hover:scale-105 transition-all text-center"
              >
                <div className="text-5xl sm:text-6xl lg:text-7xl mb-3 sm:mb-4">{badge.icon}</div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{badge.name}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{badge.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
