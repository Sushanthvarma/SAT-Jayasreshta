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

export default function ResultsPage({ params }: { params: Promise<{ attemptId: string }> | { attemptId: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Handle both Promise and direct params (Next.js 15 compatibility)
  useEffect(() => {
    if (params instanceof Promise) {
      params.then(resolved => setAttemptId(resolved.attemptId));
    } else {
      setAttemptId(params.attemptId);
    }
  }, [params]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !attemptId) return;

    const fetchResult = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        console.log(`📊 Fetching result for attempt: ${attemptId}`);
        const response = await fetch(`/api/tests/results/${encodeURIComponent(attemptId)}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          console.error('❌ API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
          });
          toast.error(errorData.error || 'Failed to load results');
          return;
        }
        
        const data = await response.json();
        console.log('📊 Result data:', data);
        
        if (data.success) {
          setResult(data.result);
        } else {
          console.error('❌ API returned success=false:', data.error);
          toast.error(data.error || 'Failed to load results');
        }
      } catch (error: any) {
        console.error('❌ Error fetching results:', error);
        toast.error(error.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [user, attemptId, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!user || !result) {
    return null;
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300';
    if (percentage >= 60) return 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300';
    return 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Overall Score Card */}
        <div className={`mb-8 rounded-2xl p-10 shadow-xl border-4 ${getScoreBgColor(result.percentage)}`}>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Test Results</h2>
            <div className="mb-6">
              <div className={`text-8xl font-bold mb-4 ${getScoreColor(result.percentage)}`}>
                {Math.round(result.percentage)}%
              </div>
              <div className="text-2xl text-gray-700 font-semibold mb-2">
                {result.totalScore} / {result.maxScore} points
              </div>
              {result.scaledScore && (
                <div className="text-xl text-gray-600 font-medium">
                  Scaled Score: <span className="font-bold">{result.scaledScore}</span>
                </div>
              )}
            </div>
            <p className="text-lg text-gray-600">{result.testTitle}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">{result.questionsCorrect}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Correct</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-red-600 mb-2">{result.questionsIncorrect}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Incorrect</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-yellow-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-600 mb-2">{result.questionsSkipped}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Skipped</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {Math.floor(result.totalTimeSpent / 60)}
              </div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Minutes</div>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Section Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.sectionScores.map((section) => (
              <div key={section.sectionId} className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{section.sectionName}</h3>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">{section.subject}</p>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 font-medium">Score</span>
                    <span className={`text-3xl font-bold ${getScoreColor(section.percentage)}`}>
                      {Math.round(section.percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        section.percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        section.percentage >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${section.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="font-bold text-gray-900 text-lg">{section.questionsCorrect}</div>
                    <div className="text-xs text-gray-600">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900 text-lg">{section.questionsIncorrect}</div>
                    <div className="text-xs text-gray-600">Incorrect</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900 text-lg">{section.questionsSkipped}</div>
                    <div className="text-xs text-gray-600">Skipped</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">💪</span> Strengths
            </h3>
            {result.strengths.length > 0 ? (
              <ul className="space-y-3">
                {result.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-center text-gray-700 p-3 bg-green-50 rounded-lg">
                    <span className="mr-3 text-green-600 text-xl">✓</span>
                    <span className="font-medium">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">Keep practicing to identify your strengths!</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">📚</span> Areas to Improve
            </h3>
            {result.weaknesses.length > 0 ? (
              <ul className="space-y-3">
                {result.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-center text-gray-700 p-3 bg-red-50 rounded-lg">
                    <span className="mr-3 text-red-600 text-xl">→</span>
                    <span className="font-medium">{weakness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">Great job! Keep up the excellent work!</p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-md p-6 border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">💡</span> Recommendations
            </h3>
            <ul className="space-y-3">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start text-gray-700 p-3 bg-white rounded-lg">
                  <span className="mr-3 text-indigo-600 text-xl mt-1">•</span>
                  <span className="font-medium">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href={`/student/test/${result.testId}`}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all min-h-[44px] flex items-center"
          >
            Retake Test
          </Link>
          <Link
            href="/student"
            className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 border-2 border-gray-200 transition-all min-h-[44px] flex items-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
