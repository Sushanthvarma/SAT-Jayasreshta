'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types/test';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ResultsPage({ params }: { params: { attemptId: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchResult = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch(`/api/tests/results/${params.attemptId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setResult(data.result);
        } else {
          toast.error('Failed to load results');
          router.push('/student');
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Failed to load results');
        router.push('/student');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [user, params.attemptId, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading results...</p>
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
    if (percentage >= 80) return 'bg-green-100 border-green-500';
    if (percentage >= 60) return 'bg-yellow-100 border-yellow-500';
    return 'bg-red-100 border-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b-2 shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
              <p className="text-lg text-gray-600">{result.testTitle}</p>
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
        {/* Overall Score Card */}
        <div className={`mb-8 rounded-2xl p-8 shadow-lg border-4 ${getScoreBgColor(result.percentage)}`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Score</h2>
            <div className="mb-4">
              <div className={`text-7xl font-bold ${getScoreColor(result.percentage)}`}>
                {Math.round(result.percentage)}%
              </div>
              <div className="text-xl text-gray-700 mt-2">
                {result.totalScore} / {result.maxScore} points
              </div>
              {result.scaledScore && (
                <div className="text-lg text-gray-600 mt-2">
                  Scaled Score: {result.scaledScore}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{result.questionsCorrect}</div>
              <div className="text-sm text-gray-600 mt-2">Correct</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-red-600">{result.questionsIncorrect}</div>
              <div className="text-sm text-gray-600 mt-2">Incorrect</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-yellow-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600">{result.questionsSkipped}</div>
              <div className="text-sm text-gray-600 mt-2">Skipped</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {Math.floor(result.totalTimeSpent / 60)}
              </div>
              <div className="text-sm text-gray-600 mt-2">Minutes</div>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Section Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.sectionScores.map((section) => (
              <div key={section.sectionId} className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{section.sectionName}</h3>
                  <p className="text-sm text-gray-600">{section.subject}</p>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(section.percentage)}`}>
                      {Math.round(section.percentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        section.percentage >= 80 ? 'bg-green-500' :
                        section.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${section.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-gray-900">{section.questionsCorrect}</div>
                    <div className="text-gray-600">Correct</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{section.questionsIncorrect}</div>
                    <div className="text-gray-600">Incorrect</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{section.questionsSkipped}</div>
                    <div className="text-gray-600">Skipped</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance by Difficulty */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Performance by Difficulty</h2>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.sectionScores.map((section) => (
                <div key={section.sectionId} className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-4">{section.sectionName}</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Easy</span>
                        <span className="font-semibold">
                          {section.easyCorrect}/{section.easyTotal}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${section.easyTotal > 0 ? (section.easyCorrect / section.easyTotal) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Medium</span>
                        <span className="font-semibold">
                          {section.mediumCorrect}/{section.mediumTotal}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${section.mediumTotal > 0 ? (section.mediumCorrect / section.mediumTotal) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Hard</span>
                        <span className="font-semibold">
                          {section.hardCorrect}/{section.hardTotal}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${section.hardTotal > 0 ? (section.hardCorrect / section.hardTotal) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">💪 Strengths</h3>
            {result.strengths.length > 0 ? (
              <ul className="space-y-2">
                {result.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-600">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Keep practicing to identify your strengths!</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">📚 Areas to Improve</h3>
            {result.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {result.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-center text-gray-700">
                    <span className="mr-2 text-red-600">→</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Great job! Keep up the excellent work!</p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="mb-8 bg-indigo-50 rounded-lg shadow-md p-6 border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">💡 Recommendations</h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start text-gray-700">
                  <span className="mr-2 text-indigo-600 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href={`/student/test/${result.testId}`}
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
          >
            Retake Test
          </Link>
          <Link
            href="/student"
            className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors min-h-[44px] flex items-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
