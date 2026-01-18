'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

type Tab = 'overview' | 'history' | 'analytics' | 'engagement' | 'communication';

export default function StudentDetailPage({ params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params instanceof Promise) {
      params.then(resolved => setUserId(resolved.userId));
    } else {
      setUserId(params.userId);
    }
  }, [params]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (!user || !userData || userData.role !== 'admin' || !userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch(`/api/admin/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setStudentData(data);
        } else {
          toast.error(data.error || 'Failed to load student data');
          router.push('/admin/dashboard');
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userData, userId, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading student analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin' || !studentData) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Prepare chart data
  const performanceData = studentData.results
    ?.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((result: any, index: number) => ({
      test: index + 1,
      date: new Date(result.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: result.percentage || 0,
      timeSpent: result.totalTimeSpent || 0,
    })) || [];

  const scoreDistribution = [
    { range: '0-59%', count: studentData.results?.filter((r: any) => (r.percentage || 0) < 60).length || 0, color: '#ef4444' },
    { range: '60-79%', count: studentData.results?.filter((r: any) => (r.percentage || 0) >= 60 && (r.percentage || 0) < 80).length || 0, color: '#f59e0b' },
    { range: '80-100%', count: studentData.results?.filter((r: any) => (r.percentage || 0) >= 80).length || 0, color: '#10b981' },
  ];

  const speedAccuracyData = studentData.results?.map((result: any) => ({
    time: Math.round((result.totalTimeSpent || 0) / 60), // minutes
    score: result.percentage || 0,
  })) || [];

  const attemptsByMonth = Object.entries(studentData.analytics?.attemptsByMonth || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      attempts: count as number,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-4">
            {studentData.user.photoURL ? (
              <img src={studentData.user.photoURL} alt={studentData.user.displayName} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {studentData.user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{studentData.user.displayName}</h1>
              <p className="text-gray-600">{studentData.user.email}</p>
              <p className="text-sm text-gray-500">
                Grade: {studentData.user.grade || 'Not set'} • 
                Joined: {studentData.user.createdAt ? new Date(studentData.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="text-sm text-gray-600">Tests Completed</div>
              <div className="text-2xl font-bold text-indigo-600">{studentData.stats.totalResults}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="text-sm text-gray-600">Average Score</div>
              <div className="text-2xl font-bold text-green-600">{studentData.stats.averageScore}%</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="text-sm text-gray-600">Total Time</div>
              <div className="text-2xl font-bold text-blue-600">{formatTime(studentData.stats.totalTimeSpent)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="text-sm text-gray-600">Current Streak</div>
              <div className="text-2xl font-bold text-orange-600">🔥 {studentData.user.currentStreak || 0}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {(['overview', 'history', 'analytics', 'engagement', 'communication'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' ? 'Performance Overview' :
                 tab === 'history' ? 'Test History' :
                 tab === 'analytics' ? 'Learning Analytics' :
                 tab === 'engagement' ? 'Engagement Patterns' :
                 'Communication Log'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Score Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Trend */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Trend</h3>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} name="Score (%)" />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Moving Avg" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">No performance data available</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Test History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Test</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Score</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Time</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentData.results?.map((result: any) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(result.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.testTitle || 'Test'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          result.percentage >= 90 ? 'bg-green-100 text-green-800' :
                          result.percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">{formatTime(result.totalTimeSpent || 0)}</td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/student/results/${result.attemptId || result.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Speed vs Accuracy */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Speed vs. Accuracy Analysis</h3>
              {speedAccuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" dataKey="time" name="Time (min)" stroke="#6b7280" fontSize={12} />
                    <YAxis type="number" dataKey="score" name="Score (%)" stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Scatter dataKey="score" fill="#6366f1" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
              )}
            </div>

            {/* Activity Over Time */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Activity Over Time</h3>
              {attemptsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attemptsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="attempts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">No activity data available</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Engagement Patterns</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-2xl font-bold text-blue-600">
                  {studentData.stats.completedAttempts > 0
                    ? Math.round((studentData.stats.completedAttempts / studentData.stats.totalAttempts) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {studentData.stats.completedAttempts} of {studentData.stats.totalAttempts} attempts completed
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-sm text-gray-600">Average Time Per Attempt</div>
                <div className="text-2xl font-bold text-green-600">{formatTime(studentData.stats.averageTimePerAttempt)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Communication Log</h3>
            <p className="text-gray-600">Email communication history will appear here once email system is fully implemented.</p>
          </div>
        )}
      </div>
    </div>
  );
}
