'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalTests: 0,
    publishedTests: 0,
    totalUsers: 0,
    totalAttempts: 0,
    totalTimeSpent: 0,
    averageTimePerAttempt: 0,
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setStats(data.stats);
          setAnalytics(data.analytics);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userData]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null;
  }

  // Prepare chart data
  const timeSpentData = analytics?.timeSpent?.byWeek
    ? Object.entries(analytics.timeSpent.byWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8)
        .map(([date, time]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          hours: Math.round((time as number) / 3600 * 10) / 10,
        }))
    : [];

  // Handle userGrowth - it might be nested or flat
  const userGrowthData = analytics?.userGrowth
    ? (() => {
        // Check if it's nested structure
        if (analytics.userGrowth.byMonth) {
          return Object.entries(analytics.userGrowth.byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              users: typeof count === 'number' ? count : 0,
            }));
        } else {
          // Flat structure
          return Object.entries(analytics.userGrowth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              users: typeof count === 'number' ? count : 0,
            }));
        }
      })()
    : [];

  // Handle attemptsOverTime - it might be nested (byMonth, byWeek) or flat
  const attemptsData = analytics?.attemptsOverTime
    ? (() => {
        // Check if it's nested structure
        if (analytics.attemptsOverTime.byMonth) {
          return Object.entries(analytics.attemptsOverTime.byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              attempts: typeof count === 'number' ? count : 0,
            }));
        } else if (analytics.attemptsOverTime.byWeek) {
          return Object.entries(analytics.attemptsOverTime.byWeek)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, count]) => ({
              month: week,
              attempts: typeof count === 'number' ? count : 0,
            }));
        } else {
          // Flat structure
          return Object.entries(analytics.attemptsOverTime)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              attempts: typeof count === 'number' ? count : 0,
            }));
        }
      })()
    : [];

  const locationsData = analytics?.locations?.byState
    ? Object.entries(analytics.locations.byState)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([state, count]) => ({
          name: state,
          value: count as number,
        }))
    : [];

  const gradesData = analytics?.grades
    ? Object.entries(analytics.grades)
        .map(([grade, count]) => ({
          name: grade,
          value: count as number,
        }))
    : [];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
              <p className="text-lg text-gray-600">Comprehensive insights into platform usage and user engagement</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
            >
              📊 Executive Dashboard →
            </Link>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold mb-1">{stats.totalUsers}</div>
            <div className="text-blue-100 text-sm font-medium">Total Users</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold mb-1">{stats.totalAttempts}</div>
            <div className="text-purple-100 text-sm font-medium">Test Attempts</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold mb-1">{formatTime(stats.totalTimeSpent)}</div>
            <div className="text-green-100 text-sm font-medium">Total Time Spent</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl font-bold mb-1">{formatTime(stats.averageTimePerAttempt)}</div>
            <div className="text-orange-100 text-sm font-medium">Avg. Time/Attempt</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Time Spent Over Time */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Time Spent (Last 8 Weeks)</h3>
            {timeSpentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSpentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => [`${value} hours`, 'Time Spent']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No time data available
              </div>
            )}
          </div>

          {/* User Growth */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">User Growth Over Time</h3>
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="users" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No user growth data available
              </div>
            )}
          </div>

          {/* Test Attempts Over Time */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Test Attempts Over Time</h3>
            {attemptsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attemptsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attempts"
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No attempts data available
              </div>
            )}
          </div>

          {/* Locations by State */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Users by State (Top 10)</h3>
            {locationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No location data available
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row - Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Grades Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Grade Distribution</h3>
            {gradesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No grade data available
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <Link
                href="/admin/dashboard"
                className="block w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all text-center"
              >
                📊 Executive Dashboard
              </Link>
              <Link
                href="/admin/analytics"
                className="block w-full px-6 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all text-center"
              >
                📈 Advanced Analytics
              </Link>
              <Link
                href="/admin/tests"
                className="block w-full px-6 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all text-center"
              >
                📁 Manage Tests
              </Link>
              <Link
                href="/admin/tests/new"
                className="block w-full px-6 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all text-center"
              >
                + Create New Test
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
