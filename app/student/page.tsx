'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Test } from '@/lib/types/test';
import { getPublishedTests } from '@/lib/firestore/tests-client';
import { getUserTestAttempts } from '@/lib/firestore/tests-client';
import { TestAttempt } from '@/lib/types/test';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import TestCard from '@/components/ui/TestCard';
import XPProgressBar from '@/components/gamification/XPProgressBar';
import DailyGoalWidget from '@/components/gamification/DailyGoalWidget';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

export default function StudentDashboard() {
  const { user, userData, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [testsLoading, setTestsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch available tests
  useEffect(() => {
    if (user) {
      const fetchTests = async () => {
        try {
          setTestsLoading(true);
          console.log('🔍 Fetching tests from /api/tests...');
          const response = await fetch('/api/tests');
          console.log('📡 Response status:', response.status, response.statusText);
          
          const data = await response.json();
          console.log('📊 Response data:', {
            success: data.success,
            count: data.count,
            testsLength: data.tests?.length || 0,
            firstTest: data.tests?.[0] ? {
              id: data.tests[0].id,
              title: data.tests[0].title,
              status: data.tests[0].status,
              isActive: data.tests[0].isActive,
            } : null,
          });
          
          if (data.success) {
            const publishedTests = data.tests || [];
            console.log(`✅ Loaded ${publishedTests.length} published tests`);
            setTests(publishedTests);
            
            if (publishedTests.length === 0) {
              console.warn('⚠️ No tests found. Checking if tests are published and active...');
              toast.info('No tests available. Check if tests are published and active.');
            }
          } else {
            console.error('❌ API returned success=false:', data.error);
            toast.error(data.error || 'Failed to load tests');
          }
        } catch (error) {
          console.error('❌ Error fetching tests:', error);
          toast.error('Failed to load tests');
        } finally {
          setTestsLoading(false);
          setLoading(false);
        }
      };

      fetchTests();
    }
  }, [user]);

  // Fetch user's test attempts
  useEffect(() => {
    if (user) {
      const fetchAttempts = async () => {
        try {
          const userAttempts = await getUserTestAttempts(user.uid, 5);
          setAttempts(userAttempts);
        } catch (error) {
          console.error('Error fetching attempts:', error);
        }
      };

      fetchAttempts();
    }
  }, [user]);

  // Fetch user stats for XP and leaderboard
  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        try {
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const response = await fetch('/api/leaderboard?limit=1&stats=true&comparison=true', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });

          const data = await response.json();
          if (data.success) {
            setUserStats({
              stats: data.stats,
              comparison: data.comparison,
            });
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };

      fetchStats();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const completedTests = attempts.filter(a => a.status === 'submitted').length;
  const inProgressTests = attempts.filter(a => a.status === 'in-progress' || a.status === 'paused').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-4">
            {/* Profile Picture - Larger and Clearer */}
            <div className="relative flex-shrink-0">
              {(userData?.photoURL || user?.photoURL) && !imageError ? (
                <div className="relative">
                  <img
                    src={userData?.photoURL || user?.photoURL || ''}
                    alt={userData?.displayName || user?.displayName || 'Student'}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-indigo-200"
                    onError={() => setImageError(true)}
                  />
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-4 ring-indigo-200">
                  {(userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'S')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </div>
            
            {/* Welcome Text */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">
                Welcome back, {userData?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'}! 👋
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Continue your SAT preparation journey with personalized practice tests.
              </p>
            </div>
          </div>
          
          {/* Streak Banner */}
          {(userData?.streak || 0) > 0 && (
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 shadow-md">
              <span className="text-3xl">🔥</span>
              <span className="font-bold text-orange-700 text-lg">
                {userData?.streak} day streak! Keep it going!
              </span>
            </div>
          )}
        </div>

        {/* XP Progress and Daily Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* XP Progress */}
          {userStats?.stats && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Progress</h3>
              <XPProgressBar totalXP={userStats.stats.totalXP || 0} showLevel={true} size="lg" />
              {userStats.comparison && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Your Rank</span>
                    <span className="font-bold text-indigo-600">#{userStats.stats.rank}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Better Than</span>
                    <span className="font-bold text-green-600">{userStats.stats.percentile}% of students</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Goal */}
          <DailyGoalWidget />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            icon="🔥"
            value={userData?.streak || 0}
            label="Day Streak"
            description="Keep practicing daily!"
            gradientFrom="from-orange-400"
            gradientTo="to-red-500"
            borderColor="border-orange-200"
          />
          <StatCard
            icon="📝"
            value={completedTests}
            label="Completed"
            description="Tests finished"
            gradientFrom="from-blue-400"
            gradientTo="to-indigo-500"
            borderColor="border-blue-200"
          />
          <StatCard
            icon="⏱️"
            value={inProgressTests}
            label="In Progress"
            description="Continue your tests"
            gradientFrom="from-yellow-400"
            gradientTo="to-orange-500"
            borderColor="border-yellow-200"
          />
          <Link href="/student/badges" className="block">
            <StatCard
              icon="🏆"
              value={userData?.badges?.length || 0}
              label="Badges"
              description="View achievements →"
              gradientFrom="from-purple-400"
              gradientTo="to-pink-500"
              borderColor="border-purple-200"
            />
          </Link>
        </div>

        {/* Available Tests Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Available Practice Tests</h2>
              <p className="text-gray-600 mt-1">Select a test to begin your practice session</p>
            </div>
            <Link
              href="/student/progress"
              className="px-4 py-2 text-indigo-600 font-medium hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              View Progress →
            </Link>
          </div>

          {testsLoading ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
                <p className="text-gray-600">Loading tests...</p>
              </div>
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tests Available</h3>
              <p className="text-gray-600">Check back soon for new practice tests!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => {
                const existingAttempt = attempts.find(a => a.testId === test.id && (a.status === 'in-progress' || a.status === 'paused'));
                const isCompleted = attempts.some(a => a.testId === test.id && a.status === 'submitted');
                
                return (
                  <TestCard
                    key={test.id}
                    test={test}
                    existingAttempt={existingAttempt ? { id: existingAttempt.id, status: existingAttempt.status } : undefined}
                    isCompleted={isCompleted}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {attempts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-3">
              {attempts.slice(0, 5).map((attempt) => {
                const test = tests.find(t => t.id === attempt.testId);
                const statusConfig = {
                  'submitted': { color: 'bg-green-100 text-green-800', label: 'Completed' },
                  'in-progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
                  'paused': { color: 'bg-orange-100 text-orange-800', label: 'Paused' },
                  'not-started': { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
                };
                const status = statusConfig[attempt.status] || statusConfig['not-started'];
                
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{test?.title || 'Test'}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.startedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                      {attempt.status === 'in-progress' || attempt.status === 'paused' ? (
                        <Link
                          href={`/student/test/${attempt.testId}?attempt=${attempt.id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          Continue
                        </Link>
                      ) : attempt.status === 'submitted' ? (
                        <Link
                          href={`/student/results/${attempt.id}`}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          View Results
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
