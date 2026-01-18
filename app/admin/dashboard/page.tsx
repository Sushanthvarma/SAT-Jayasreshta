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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ExecutiveDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (!user || !userData || userData.role !== 'admin') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch('/api/admin/stats/enhanced', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setKpis(data.kpis);
          setTrendData(data.trendData);
          setUserDetails(data.userDetails || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, userData]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null;
  }

  const formatChange = (value: number) => {
    if (value > 0) return `↑ ${Math.abs(value).toFixed(1)}%`;
    if (value < 0) return `↓ ${Math.abs(value).toFixed(1)}%`;
    return '→ 0%';
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'at-risk': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'at-risk': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Executive Analytics Dashboard</h1>
          <p className="text-lg text-gray-600">Real-time platform insights and student performance metrics</p>
        </div>

        {/* KPI Cards - Platform Health */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div 
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedKpi(selectedKpi === 'users' ? null : 'users')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-100">Total Active Students</div>
              {kpis?.platformHealth?.totalUsersChange && (
                <span className={`text-xs font-semibold ${getChangeColor(kpis.platformHealth.totalUsersChange)}`}>
                  {formatChange(kpis.platformHealth.totalUsersChange)}
                </span>
              )}
            </div>
            <div className="text-4xl font-bold mb-1">{kpis?.platformHealth?.totalActiveStudents || 0}</div>
            <div className="text-xs text-blue-100">Active Today: {kpis?.platformHealth?.activeToday || 0}</div>
            {selectedKpi === 'users' && trendData.length > 0 && (
              <div className="mt-4 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <Area type="monotone" dataKey="tests" stroke="#fff" fill="rgba(255,255,255,0.3)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div 
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedKpi(selectedKpi === 'tests' ? null : 'tests')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-purple-100">Total Tests Completed</div>
              {kpis?.platformHealth?.testsCompletedChange && (
                <span className={`text-xs font-semibold ${getChangeColor(kpis.platformHealth.testsCompletedChange)}`}>
                  {formatChange(kpis.platformHealth.testsCompletedChange)}
                </span>
              )}
            </div>
            <div className="text-4xl font-bold mb-1">{kpis?.platformHealth?.totalTestsCompleted || 0}</div>
            <div className="text-xs text-purple-100">This Week: {trendData.reduce((sum, d) => sum + d.tests, 0)}</div>
          </div>

          <div 
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedKpi(selectedKpi === 'score' ? null : 'score')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-green-100">Platform Average Score</div>
              {kpis?.platformHealth?.avgScoreChange && (
                <span className={`text-xs font-semibold ${getChangeColor(kpis.platformHealth.avgScoreChange)}`}>
                  {formatChange(kpis.platformHealth.avgScoreChange)}
                </span>
              )}
            </div>
            <div className="text-4xl font-bold mb-1">{kpis?.platformHealth?.platformAverageScore || 0}%</div>
            <div className="text-xs text-green-100">vs Last Month</div>
          </div>

          <div 
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedKpi(selectedKpi === 'active' ? null : 'active')}
          >
            <div className="text-sm font-medium text-orange-100 mb-2">Active Today</div>
            <div className="text-4xl font-bold mb-1">{kpis?.platformHealth?.activeToday || 0}</div>
            <div className="text-xs text-orange-100">
              {kpis?.platformHealth?.totalActiveStudents > 0 
                ? Math.round((kpis.platformHealth.activeToday / kpis.platformHealth.totalActiveStudents) * 100)
                : 0}% of total
            </div>
          </div>
        </div>

        {/* Engagement & Learning Outcomes Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Engagement Metrics */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Engagement Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Daily Active Users (DAU)</div>
                  <div className="text-2xl font-bold text-blue-600">{kpis?.engagement?.dau || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Weekly Active (WAU)</div>
                  <div className="text-2xl font-bold text-purple-600">{kpis?.engagement?.wau || 0}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Monthly Active (MAU)</div>
                  <div className="text-2xl font-bold text-green-600">{kpis?.engagement?.mau || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">DAU/MAU Ratio</div>
                  <div className="text-2xl font-bold text-indigo-600">{kpis?.engagement?.dauMauRatio || 0}%</div>
                  <div className="text-xs text-gray-500">
                    {kpis?.engagement?.dauMauRatio >= 30 ? '✅ Healthy' : '⚠️ Target: >30%'}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl">
                <div className="text-sm text-gray-600">Average Session Duration</div>
                <div className="text-2xl font-bold text-orange-600">{kpis?.engagement?.avgSessionDuration || 0} min</div>
              </div>
            </div>
          </div>

          {/* Learning Outcomes */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Learning Outcomes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Students Improving</div>
                  <div className="text-2xl font-bold text-green-600">{kpis?.learningOutcomes?.studentsImproving || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {kpis?.platformHealth?.totalActiveStudents > 0
                      ? Math.round((kpis.learningOutcomes.studentsImproving / kpis.platformHealth.totalActiveStudents) * 100)
                      : 0}% of total
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Students At Risk</div>
                  <div className="text-2xl font-bold text-red-600">{kpis?.learningOutcomes?.studentsAtRisk || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {kpis?.platformHealth?.totalActiveStudents > 0
                      ? Math.round((kpis.learningOutcomes.studentsAtRisk / kpis.platformHealth.totalActiveStudents) * 100)
                      : 0}% of total
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Students Excelling</div>
                  <div className="text-2xl font-bold text-yellow-600">{kpis?.learningOutcomes?.studentsExcelling || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Median Score</div>
                  <div className="text-2xl font-bold text-indigo-600">{kpis?.learningOutcomes?.medianScore || 0}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Streak & Retention */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Streak & Retention</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
              <div className="text-sm text-gray-600">Active Streaks</div>
              <div className="text-3xl font-bold text-orange-600">{kpis?.streaks?.activeStreaks || 0}</div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis?.platformHealth?.totalActiveStudents > 0
                  ? Math.round((kpis.streaks.activeStreaks / kpis.platformHealth.totalActiveStudents) * 100)
                  : 0}% of students
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
              <div className="text-sm text-gray-600">Average Streak Length</div>
              <div className="text-3xl font-bold text-yellow-600">{kpis?.streaks?.avgStreakLength || 0}</div>
              <div className="text-xs text-gray-500 mt-1">days</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-200">
              <div className="text-sm text-gray-600">Longest Current Streak</div>
              <div className="text-3xl font-bold text-red-600">{kpis?.streaks?.longestStreak || 0}</div>
              <div className="text-xs text-gray-500 mt-1">days</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
              <div className="text-sm text-gray-600">Streak Drop-off Rate</div>
              <div className="text-3xl font-bold text-gray-600">{kpis?.streaks?.streakDropOffRate || 0}%</div>
              <div className="text-xs text-gray-500 mt-1">this week</div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">7-Day Performance Trend</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="tests" fill="#8b5cf6" name="Tests Completed" radius={[8, 8, 0, 0]} />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  name="Avg Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Student Master Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Student Performance Overview</h3>
                <p className="text-sm text-gray-600 mt-1">Click on any student to view detailed analytics</p>
              </div>
              <Link
                href="/admin/analytics"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                View Full Analytics →
              </Link>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Grade</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Tests</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Avg Score</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Trend</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Streak</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Last Active</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Risk Level</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userDetails.slice(0, 10).map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{student.grade || 'N/A'}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-700">{student.testsCompleted}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        student.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                        student.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.avgScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.recentTrend === 'up' && <span className="text-green-600 font-bold">↑</span>}
                      {student.recentTrend === 'down' && <span className="text-red-600 font-bold">↓</span>}
                      {student.recentTrend === 'stable' && <span className="text-gray-600 font-bold">→</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.streak > 0 ? (
                        <span className="text-orange-600 font-bold">🔥 {student.streak}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.lastActive 
                        ? new Date(student.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(student.riskLevel)}`}>
                        {getRiskIcon(student.riskLevel)} {student.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/students/${student.id}`}
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
          
          {userDetails.length > 10 && (
            <div className="p-4 bg-gray-50 text-center">
              <Link
                href="/admin/analytics"
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                View All {userDetails.length} Students →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
