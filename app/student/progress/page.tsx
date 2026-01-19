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

interface Insights {
  overall: {
    totalTests: number;
    totalAttempts: number;
    completionRate: number;
    averageScore: number;
    bestScore: number;
    improvement: number;
  };
  subjects: {
    reading: { average: number; best: number; testsCount: number; trend: number };
    writing: { average: number; best: number; testsCount: number; trend: number };
    math: { average: number; best: number; testsCount: number; trend: number };
  };
  timeAnalysis: {
    totalTimeSpent: number;
    averageTimePerTest: number;
    averageTimePerQuestion: number;
    timeEfficiency: number;
  };
  trends: {
    recentPerformance: { direction: string; change: number };
    weeklyProgress: Array<{ week: string; testsCount: number; averageScore: number }>;
    monthlyProgress: Array<{ month: string; testsCount: number; averageScore: number }>;
    scoreDistribution: { excellent: number; good: number; average: number; needsImprovement: number };
  };
  performance: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  engagement: {
    activeDays: number;
    averageTestsPerWeek: number;
    longestStreak: number;
    currentStreak: number;
    lastActiveDate: string | null;
  };
  goals: {
    targetScore: number | null;
    currentAverage: number;
    progressToGoal: number | null;
  };
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'insights' | 'recommendations'>('overview');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        // Fetch both results and insights in parallel
        const [resultsRes, insightsRes] = await Promise.all([
          fetch('/api/tests/results/user', {
            headers: { 'Authorization': `Bearer ${idToken}` },
          }),
          fetch('/api/student/insights', {
            headers: { 'Authorization': `Bearer ${idToken}` },
          }),
        ]);
        
        const resultsData = await resultsRes.json();
        const insightsData = await insightsRes.json();
        
        if (resultsData.success) {
          setResults(resultsData.results || []);
        }
        
        if (insightsData.success) {
          setInsights(insightsData.insights);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load progress');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress & Analytics</h1>
          <p className="text-lg text-gray-600">Comprehensive insights into your learning journey</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {(['overview', 'trends', 'insights', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {insights?.overall.totalTests || results.length}
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tests Completed</div>
                  {insights && (
                    <div className="text-xs text-gray-500 mt-1">
                      {insights.overall.completionRate.toFixed(0)}% completion rate
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-600 mb-2">
                    {Math.round(insights?.overall.averageScore || 0)}%
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Average Score</div>
                  {insights?.trends.recentPerformance && (
                    <div className={`text-xs mt-1 ${insights.trends.recentPerformance.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {insights.trends.recentPerformance.change >= 0 ? '↑' : '↓'} {Math.abs(insights.trends.recentPerformance.change)}% recent
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {Math.round(insights?.overall.bestScore || 0)}%
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Best Score</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${(insights?.overall.improvement || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(insights?.overall.improvement || 0) >= 0 ? '+' : ''}{Math.round(insights?.overall.improvement || 0)}%
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Improvement</div>
                </div>
              </div>
            </div>

            {/* Subject Performance */}
            {insights && (
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Subject Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['reading', 'writing', 'math'] as const).map((subject) => {
                    const stats = insights.subjects[subject];
                    return (
                      <div key={subject} className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 capitalize">{subject}</h3>
                        <div className="text-6xl font-bold text-blue-600 mb-4">{stats.average}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all"
                            style={{ width: `${stats.average}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Best: {stats.best}%</span>
                          <span className={stats.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {stats.trend >= 0 ? '↑' : '↓'} {Math.abs(stats.trend)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">{stats.testsCount} tests completed</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time Analysis */}
            {insights && (
              <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Time Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Time Spent</div>
                    <div className="text-2xl font-bold text-indigo-600">{formatTime(insights.timeAnalysis.totalTimeSpent)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Avg Time per Test</div>
                    <div className="text-2xl font-bold text-indigo-600">{formatTime(insights.timeAnalysis.averageTimePerTest)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Avg Time per Question</div>
                    <div className="text-2xl font-bold text-indigo-600">{Math.round(insights.timeAnalysis.averageTimePerQuestion)}s</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Time Efficiency</div>
                    <div className="text-2xl font-bold text-indigo-600">{insights.timeAnalysis.timeEfficiency.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Metrics */}
            {insights && (
              <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Engagement</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{insights.engagement.activeDays}</div>
                    <div className="text-sm text-gray-600">Active Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{insights.engagement.averageTestsPerWeek.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Tests/Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{insights.engagement.currentStreak}</div>
                    <div className="text-sm text-gray-600">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{insights.engagement.longestStreak}</div>
                    <div className="text-sm text-gray-600">Longest Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{insights.overall.totalAttempts}</div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Test History */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Test History</h2>
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-xl font-semibold mb-2">No test results yet</p>
                  <p className="text-gray-500">Complete a test to see your progress!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => {
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
          </>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && insights && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Performance Trend</h2>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${insights.trends.recentPerformance.direction === 'improving' ? 'text-green-600' : insights.trends.recentPerformance.direction === 'declining' ? 'text-red-600' : 'text-gray-600'}`}>
                  {insights.trends.recentPerformance.direction === 'improving' ? '📈' : insights.trends.recentPerformance.direction === 'declining' ? '📉' : '➡️'}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">{insights.trends.recentPerformance.direction}</div>
                  <div className="text-sm text-gray-600">
                    {insights.trends.recentPerformance.change >= 0 ? '+' : ''}{insights.trends.recentPerformance.change}% change
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Score Distribution</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{insights.trends.scoreDistribution.excellent}</div>
                  <div className="text-sm text-gray-600">Excellent (90-100%)</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{insights.trends.scoreDistribution.good}</div>
                  <div className="text-sm text-gray-600">Good (70-89%)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{insights.trends.scoreDistribution.average}</div>
                  <div className="text-sm text-gray-600">Average (50-69%)</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{insights.trends.scoreDistribution.needsImprovement}</div>
                  <div className="text-sm text-gray-600">Needs Improvement (&lt;50%)</div>
                </div>
              </div>
            </div>

            {insights.trends.weeklyProgress.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Weekly Progress</h2>
                <div className="space-y-3">
                  {insights.trends.weeklyProgress.slice(-8).map((week, idx) => (
                    <div key={week.week} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600">{week.week}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{week.testsCount} tests</span>
                          <span className="font-semibold">{week.averageScore}% avg</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${week.averageScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && insights && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Strengths</h2>
              {insights.performance.strengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {insights.performance.strengths.map((strength, idx) => (
                    <span key={idx} className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      ✓ {strength}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Complete more tests to identify your strengths!</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Areas for Improvement</h2>
              {insights.performance.weaknesses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {insights.performance.weaknesses.map((weakness, idx) => (
                    <span key={idx} className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                      ⚠ {weakness}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Great job! Keep up the excellent work!</p>
              )}
            </div>

            {insights.goals.targetScore && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Goal Progress</h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Average</span>
                    <span className="font-semibold">{Math.round(insights.goals.currentAverage)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target Score</span>
                    <span className="font-semibold">{insights.goals.targetScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(insights.goals.progressToGoal || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {Math.round(insights.goals.progressToGoal || 0)}% towards your goal
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && insights && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Personalized Recommendations</h2>
            <div className="space-y-4">
              {insights.performance.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-2xl">💡</div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
