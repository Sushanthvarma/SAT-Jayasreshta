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

export default function StudentDashboard() {
  const { user, userData, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [testsLoading, setTestsLoading] = useState(true);

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
          const response = await fetch('/api/tests');
          const data = await response.json();
          if (data.success) {
            setTests(data.tests || []);
          }
        } catch (error) {
          console.error('Error fetching tests:', error);
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

  if (authLoading || loading) {
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

  const completedTests = attempts.filter(a => a.status === 'submitted').length;
  const inProgressTests = attempts.filter(a => a.status === 'in-progress' || a.status === 'paused').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <nav className="border-b-2 bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📚</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SAT Practice</h1>
                {userData && (
                  <p className="text-lg text-gray-600">
                    Welcome, {userData.displayName}! 
                    {userData.streak > 0 && (
                      <span className="ml-2 text-orange-600">🔥 {userData.streak} day streak!</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/student/progress"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
              >
                View Progress
              </Link>
              <button
                onClick={signOut}
                className="rounded-lg bg-gray-100 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Streak Card */}
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="mt-2 text-4xl font-bold text-orange-600">
                  {userData?.streak || 0}
                </p>
              </div>
              <div className="text-5xl">🔥</div>
            </div>
          </div>

          {/* Tests Completed Card */}
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tests Completed</p>
                <p className="mt-2 text-4xl font-bold text-blue-600">
                  {completedTests}
                </p>
              </div>
              <div className="text-5xl">📝</div>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="mt-2 text-4xl font-bold text-yellow-600">
                  {inProgressTests}
                </p>
              </div>
              <div className="text-5xl">⏱️</div>
            </div>
          </div>

          {/* Badges Card */}
          <Link href="/student/badges" className="rounded-2xl bg-white p-6 shadow-lg border-2 border-purple-200 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Badges Earned</p>
                <p className="mt-2 text-4xl font-bold text-purple-600">
                  {userData?.badges?.length || 0}
                </p>
              </div>
              <div className="text-5xl">🏆</div>
            </div>
          </Link>
        </div>

        {/* Available Tests Section */}
        <div className="mb-8">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Available Tests</h2>
          {testsLoading ? (
            <div className="flex justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            </div>
          ) : tests.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 shadow-lg border-2 border-gray-200 text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl text-gray-600">No tests available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => {
                const existingAttempt = attempts.find(a => a.testId === test.id && (a.status === 'in-progress' || a.status === 'paused'));
                const isCompleted = attempts.some(a => a.testId === test.id && a.status === 'submitted');
                
                return (
                  <div
                    key={test.id}
                    className="rounded-2xl bg-white p-6 shadow-lg border-2 border-indigo-200 hover:shadow-xl transition-shadow"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{test.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {test.totalQuestions} Questions
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {Math.floor(test.totalTimeLimit / 60)} min
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {test.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      {existingAttempt ? (
                        <Link
                          href={`/student/test/${test.id}?attempt=${existingAttempt.id}`}
                          className="flex-1 rounded-lg bg-yellow-500 px-4 py-3 text-center text-base font-semibold text-white hover:bg-yellow-600 transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          Continue Test
                        </Link>
                      ) : (
                        <Link
                          href={`/student/test/${test.id}`}
                          className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-center text-base font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          {isCompleted ? 'Retake Test' : 'Start Test'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {attempts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Recent Activity</h2>
            <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-gray-200">
              <div className="space-y-4">
                {attempts.slice(0, 5).map((attempt) => {
                  const test = tests.find(t => t.id === attempt.testId);
                  const statusColors = {
                    'submitted': 'bg-green-100 text-green-800',
                    'in-progress': 'bg-yellow-100 text-yellow-800',
                    'paused': 'bg-orange-100 text-orange-800',
                    'not-started': 'bg-gray-100 text-gray-800',
                  };
                  
                  return (
                    <div key={attempt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {test?.title || 'Test'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(attempt.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[attempt.status] || statusColors['not-started']}`}>
                          {attempt.status.replace('-', ' ')}
                        </span>
                        {attempt.status === 'in-progress' || attempt.status === 'paused' ? (
                          <Link
                            href={`/student/test/${attempt.testId}?attempt=${attempt.id}`}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                          >
                            Continue
                          </Link>
                        ) : attempt.status === 'submitted' ? (
                          <Link
                            href={`/student/results/${attempt.id}`}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
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
          </div>
        )}
      </div>
    </div>
  );
}
