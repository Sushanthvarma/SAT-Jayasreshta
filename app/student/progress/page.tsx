'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types/test';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch('/api/tests/results/user', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setResults(data.results || []);
        } else {
          toast.error('Failed to load progress');
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Failed to load progress');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate statistics
  const totalTests = results.length;
  const averageScore = totalTests > 0
    ? results.reduce((sum, r) => sum + r.percentage, 0) / totalTests
    : 0;
  const bestScore = totalTests > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;
  const improvement = totalTests >= 2
    ? results[0].percentage - results[results.length - 1].percentage
    : 0;

  // Subject averages
  const readingResults = results.flatMap(r => 
    r.sectionScores.filter(s => s.subject === 'reading')
  );
  const writingResults = results.flatMap(r => 
    r.sectionScores.filter(s => s.subject === 'writing')
  );
  const mathResults = results.flatMap(r => 
    r.sectionScores.filter(s => s.subject.includes('math'))
  );

  const readingAvg = readingResults.length > 0
    ? readingResults.reduce((sum, r) => sum + r.percentage, 0) / readingResults.length
    : 0;
  const writingAvg = writingResults.length > 0
    ? writingResults.reduce((sum, r) => sum + r.percentage, 0) / writingResults.length
    : 0;
  const mathAvg = mathResults.length > 0
    ? mathResults.reduce((sum, r) => sum + r.percentage, 0) / mathResults.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress & Analytics</h1>
          <p className="text-lg text-gray-600">Track your performance and improvement over time</p>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">{totalTests}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tests Completed</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">{Math.round(averageScore)}%</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Average Score</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">{Math.round(bestScore)}%</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Best Score</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className={`text-5xl font-bold mb-2 ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {improvement >= 0 ? '+' : ''}{Math.round(improvement)}%
              </div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Improvement</div>
            </div>
          </div>
        </div>

        {/* Subject Averages */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Subject Averages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reading</h3>
              <div className="text-6xl font-bold text-blue-600 mb-4">{Math.round(readingAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all"
                  style={{ width: `${readingAvg}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Writing</h3>
              <div className="text-6xl font-bold text-green-600 mb-4">{Math.round(writingAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all"
                  style={{ width: `${writingAvg}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Math</h3>
              <div className="text-6xl font-bold text-purple-600 mb-4">{Math.round(mathAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
                  style={{ width: `${mathAvg}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Performance Trend</h2>
          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl font-semibold mb-2">No test results yet</p>
              <p className="text-gray-500">Complete a test to see your progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, idx) => {
                const completedAt = result.completedAt instanceof Date ? result.completedAt : (result.completedAt as any)?.toDate?.() || result.completedAt;
                const date = new Date(completedAt);
                return (
                  <div key={result.id} className="flex items-center gap-4 p-5 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 text-lg">{result.testTitle}</span>
                        <span className="text-sm text-gray-600 font-medium">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 font-medium">Score</span>
                            <span className="font-bold text-lg">{Math.round(result.percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                result.percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                result.percentage >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
                              }`}
                              style={{ width: `${result.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/student/results/${result.attemptId || result.id}`}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      View Details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
