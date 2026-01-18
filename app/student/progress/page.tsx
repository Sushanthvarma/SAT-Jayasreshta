'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types/test';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading progress...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b-2 shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Progress & Analytics</h1>
              <p className="text-lg text-gray-600">Track your performance over time</p>
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
        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{totalTests}</div>
              <div className="text-sm text-gray-600 mt-2">Tests Completed</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{Math.round(averageScore)}%</div>
              <div className="text-sm text-gray-600 mt-2">Average Score</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-purple-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{Math.round(bestScore)}%</div>
              <div className="text-sm text-gray-600 mt-2">Best Score</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-200">
            <div className="text-center">
              <div className={`text-4xl font-bold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {improvement >= 0 ? '+' : ''}{Math.round(improvement)}%
              </div>
              <div className="text-sm text-gray-600 mt-2">Improvement</div>
            </div>
          </div>
        </div>

        {/* Subject Averages */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Subject Averages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reading</h3>
              <div className="text-5xl font-bold text-blue-600 mb-2">{Math.round(readingAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${readingAvg}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Writing</h3>
              <div className="text-5xl font-bold text-green-600 mb-2">{Math.round(writingAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{ width: `${writingAvg}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Math</h3>
              <div className="text-5xl font-bold text-purple-600 mb-2">{Math.round(mathAvg)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-purple-500 h-4 rounded-full"
                  style={{ width: `${mathAvg}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Performance Trend</h2>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-xl">No test results yet. Complete a test to see your progress!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, idx) => {
                  const date = new Date(result.completedAt);
                  return (
                    <div key={result.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{result.testTitle}</span>
                          <span className="text-sm text-gray-600">{date.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Score</span>
                              <span className="font-semibold">{Math.round(result.percentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${
                                  result.percentage >= 80 ? 'bg-green-500' :
                                  result.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${result.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/student/results/${result.attemptId}`}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
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
    </div>
  );
}
