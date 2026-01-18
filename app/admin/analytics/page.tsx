'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import UserSearch from '@/components/admin/UserSearch';
import StudentMasterTable from '@/components/admin/StudentMasterTable';
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

type TimePeriod = 'all' | 'week' | 'month' | 'quarter' | 'year';
type ViewMode = 'overview' | 'student' | 'grade' | 'cohort' | 'content' | 'predictive';

export default function AdminAnalytics() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  
  const [stats, setStats] = useState({
    totalTests: 0,
    publishedTests: 0,
    totalUsers: 0,
    totalAttempts: 0,
    totalTimeSpent: 0,
    averageTimePerAttempt: 0,
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any[]>([]);
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
        setAuthToken(idToken);
        
        const params = new URLSearchParams();
        if (timePeriod !== 'all') params.append('period', timePeriod);
        if (selectedGrade) params.append('grade', selectedGrade);
        
        const [statsResponse, enhancedResponse] = await Promise.all([
          fetch(`/api/admin/stats?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          }),
          fetch(`/api/admin/stats/enhanced`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          }),
        ]);
        
        const statsData = await statsResponse.json();
        const enhancedData = await enhancedResponse.json();
        
        if (statsData.success) {
          setStats(statsData.stats);
          setAnalytics(statsData.analytics);
        }
        
        if (enhancedData.success && enhancedData.userDetails) {
          setUserDetails(enhancedData.userDetails);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userData, timePeriod, selectedGrade]);

  useEffect(() => {
    if (!selectedUserId || !authToken) {
      setStudentData(null);
      return;
    }

    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${selectedUserId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setStudentData(data);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [selectedUserId, authToken]);

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Prepare chart data based on time period
  const getTimeSpentData = () => {
    if (!analytics?.timeSpent) return [];
    
    let data: Record<string, number> = {};
    switch (timePeriod) {
      case 'week':
        data = analytics.timeSpent.byWeek || {};
        break;
      case 'month':
        data = analytics.timeSpent.byMonth || {};
        break;
      case 'quarter':
        data = analytics.timeSpent.byQuarter || {};
        break;
      case 'year':
        data = analytics.timeSpent.byYear || {};
        break;
      default:
        data = analytics.timeSpent.byWeek || {};
    }
    
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, time]) => ({
        date: timePeriod === 'year' 
          ? date 
          : timePeriod === 'quarter'
          ? date
          : new Date(date + (timePeriod === 'week' ? '' : '-01')).toLocaleDateString('en-US', { 
              month: 'short', 
              day: timePeriod === 'week' ? 'numeric' : undefined,
              year: 'numeric' 
            }),
        hours: Math.round((time as number) / 3600 * 10) / 10,
      }));
  };

  const getAttemptsData = () => {
    if (!analytics?.attemptsOverTime) return [];
    
    let data: Record<string, number> = {};
    switch (timePeriod) {
      case 'month':
        data = analytics.attemptsOverTime.byMonth || {};
        break;
      case 'quarter':
        data = analytics.attemptsOverTime.byQuarter || {};
        break;
      case 'year':
        data = analytics.attemptsOverTime.byYear || {};
        break;
      default:
        data = analytics.attemptsOverTime.byMonth || {};
    }
    
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({
        period: timePeriod === 'year' 
          ? period 
          : timePeriod === 'quarter'
          ? period
          : new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        attempts: count as number,
      }));
  };

  const gradeWiseData = analytics?.gradeWiseStats
    ? Object.entries(analytics.gradeWiseStats).map(([grade, stats]: [string, any]) => ({
        grade,
        users: stats.totalUsers,
        attempts: stats.totalAttempts,
        timeSpent: stats.totalTimeSpent,
        avgTime: stats.averageTimePerAttempt,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Filters */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
          <p className="text-lg text-gray-600 mb-6">Comprehensive insights into platform usage and user engagement</p>
          
          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'overview'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'student'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              👤 Student Analysis
            </button>
            <button
              onClick={() => setViewMode('grade')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'grade'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🎓 Grade Analysis
            </button>
            <button
              onClick={() => setViewMode('cohort')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'cohort'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              👥 Cohort Analytics
            </button>
            <button
              onClick={() => setViewMode('content')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'content'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📝 Content Analytics
            </button>
            <button
              onClick={() => setViewMode('predictive')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                viewMode === 'predictive'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔮 Predictive Analytics
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Time Period:</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            
            {viewMode === 'grade' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Grade:</label>
                <select
                  value={selectedGrade || ''}
                  onChange={(e) => setSelectedGrade(e.target.value || null)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                >
                  <option value="">All Grades</option>
                  {Object.keys(analytics?.grades || {}).map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'student' && (
              <div className="flex-1 max-w-md">
                <UserSearch
                  onUserSelect={setSelectedUserId}
                  selectedUserId={selectedUserId}
                  authToken={authToken}
                />
              </div>
            )}
          </div>
        </div>

        {/* Overview Mode */}
        {viewMode === 'overview' && (
          <>
            {/* Quick Stats */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Time Spent Over Time</h3>
                {getTimeSpentData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getTimeSpentData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any) => [`${value} hours`, 'Time Spent']}
                      />
                      <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Test Attempts Over Time</h3>
                {getAttemptsData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getAttemptsData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Bar dataKey="attempts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Student Analysis Mode */}
        {viewMode === 'student' && (
          <div className="space-y-6">
            {selectedUserId && studentData ? (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Student Analysis: {studentData.user.displayName}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                    <div className="text-2xl font-bold text-indigo-600">{studentData.stats.totalAttempts}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Completed</div>
                    <div className="text-2xl font-bold text-green-600">{studentData.stats.completedAttempts}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Time</div>
                    <div className="text-2xl font-bold text-blue-600">{formatTime(studentData.stats.totalTimeSpent)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                    <div className="text-2xl font-bold text-purple-600">{studentData.stats.averageScore}%</div>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    href={`/admin/students/${selectedUserId}`}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors inline-block"
                  >
                    View Full Student Analysis →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <UserSearch
                    onUserSelect={setSelectedUserId}
                    selectedUserId={selectedUserId}
                    authToken={authToken}
                  />
                </div>
                {userDetails.length > 0 && (
                  <StudentMasterTable
                    students={userDetails}
                    onStudentSelect={setSelectedUserId}
                  />
                )}
              </>
            )}
          </div>
        )}
        
        {/* Legacy Student Analysis (for backward compatibility) */}
        {viewMode === 'student' && selectedUserId && studentData && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Student Analysis: {studentData.user.displayName}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Attempts</div>
                  <div className="text-2xl font-bold text-indigo-600">{studentData.stats.totalAttempts}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Completed</div>
                  <div className="text-2xl font-bold text-green-600">{studentData.stats.completedAttempts}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Time</div>
                  <div className="text-2xl font-bold text-blue-600">{formatTime(studentData.stats.totalTimeSpent)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg Score</div>
                  <div className="text-2xl font-bold text-purple-600">{studentData.stats.averageScore}%</div>
                </div>
              </div>
            </div>

            {Object.keys(studentData.analytics.attemptsByMonth).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Student Activity Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={Object.entries(studentData.analytics.attemptsByMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, count]) => ({
                      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                      attempts: count as number,
                    }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="attempts" stroke="#6366f1" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Grade Analysis Mode */}
        {viewMode === 'grade' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 overflow-x-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Grade-Wise Statistics</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Grade</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">Users</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">Attempts</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">Time Spent</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeWiseData.map((item, index) => (
                    <tr key={item.grade} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold">{item.grade}</td>
                      <td className="py-3 px-4 text-right">{item.users}</td>
                      <td className="py-3 px-4 text-right">{item.attempts}</td>
                      <td className="py-3 px-4 text-right">{formatTime(item.timeSpent)}</td>
                      <td className="py-3 px-4 text-right">{formatTime(item.avgTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cohort Analytics Mode */}
        {viewMode === 'cohort' && <CohortAnalyticsView authToken={authToken} />}

        {/* Content Analytics Mode */}
        {viewMode === 'content' && <ContentAnalyticsView authToken={authToken} />}

        {/* Predictive Analytics Mode */}
        {viewMode === 'predictive' && <PredictiveAnalyticsView authToken={authToken} />}
      </div>
    </div>
  );
}

// Cohort Analytics Component
function CohortAnalyticsView({ authToken }: { authToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/cohort', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching cohort analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    if (authToken) fetchData();
  }, [authToken]);

  if (loading) return <div className="text-center py-12">Loading cohort analytics...</div>;
  if (!data) return <div className="text-center py-12">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Distribution by Grade</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.gradeGroups}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="grade" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#6366f1" name="Average Score (%)" />
            <Bar dataKey="medianScore" fill="#8b5cf6" name="Median Score (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Improvement Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold">Rank</th>
                <th className="text-left py-3 px-4 font-bold">Student</th>
                <th className="text-right py-3 px-4 font-bold">Improvement</th>
                <th className="text-right py-3 px-4 font-bold">Recent Avg</th>
                <th className="text-right py-3 px-4 font-bold">Previous Avg</th>
              </tr>
            </thead>
            <tbody>
              {data.improvementLeaderboard.map((student: any, index: number) => (
                <tr key={student.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">#{index + 1}</td>
                  <td className="py-3 px-4 font-semibold">{student.name}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-bold">+{student.improvement}%</td>
                  <td className="py-3 px-4 text-right">{student.recentAvg}%</td>
                  <td className="py-3 px-4 text-right">{student.olderAvg}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Content Analytics Component
function ContentAnalyticsView({ authToken }: { authToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/content', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching content analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    if (authToken) fetchData();
  }, [authToken]);

  if (loading) return <div className="text-center py-12">Loading content analytics...</div>;
  if (!data) return <div className="text-center py-12">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Difficulty Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold">Test</th>
                <th className="text-right py-3 px-4 font-bold">Avg Score</th>
                <th className="text-right py-3 px-4 font-bold">Std Dev</th>
                <th className="text-right py-3 px-4 font-bold">Completion</th>
                <th className="text-center py-3 px-4 font-bold">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {data.testAnalytics.map((test: any) => (
                <tr key={test.testId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold">{test.testTitle}</td>
                  <td className="py-3 px-4 text-right">{test.avgScore}%</td>
                  <td className="py-3 px-4 text-right">{test.stdDev}%</td>
                  <td className="py-3 px-4 text-right">{test.completionRate}%</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      test.difficultyRating.includes('⚠️') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {test.difficultyRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions Needing Review</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold">Question</th>
                <th className="text-left py-3 px-4 font-bold">Subject</th>
                <th className="text-right py-3 px-4 font-bold">Accuracy</th>
                <th className="text-right py-3 px-4 font-bold">Times Asked</th>
                <th className="text-center py-3 px-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.questionAnalytics.slice(0, 20).map((q: any) => (
                <tr key={q.questionId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{q.questionText}</td>
                  <td className="py-3 px-4">{q.subject}</td>
                  <td className="py-3 px-4 text-right">{q.accuracy}%</td>
                  <td className="py-3 px-4 text-right">{q.timesAsked}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      q.status.includes('⚠️') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Predictive Analytics Component
function PredictiveAnalyticsView({ authToken }: { authToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/analytics/predictive', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching predictive analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    if (authToken) fetchData();
  }, [authToken]);

  if (loading) return <div className="text-center py-12">Loading predictive analytics...</div>;
  if (!data) return <div className="text-center py-12">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🚨 At-Risk Students</h2>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-xl">
            <div className="text-sm text-gray-600">High Risk</div>
            <div className="text-2xl font-bold text-red-600">{data.summary.highRisk}</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl">
            <div className="text-sm text-gray-600">Medium Risk</div>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.mediumRisk}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-sm text-gray-600">Low Risk</div>
            <div className="text-2xl font-bold text-green-600">{data.summary.lowRisk}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold">Student</th>
                <th className="text-right py-3 px-4 font-bold">Risk Score</th>
                <th className="text-center py-3 px-4 font-bold">Risk Level</th>
                <th className="text-right py-3 px-4 font-bold">Avg Score</th>
                <th className="text-left py-3 px-4 font-bold">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {data.atRiskStudents.map((student: any) => (
                <tr key={student.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold">{student.name}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      student.riskScore >= 60 ? 'bg-red-100 text-red-800' :
                      student.riskScore >= 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {student.riskScore}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      student.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                      student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {student.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{student.avgScore}%</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.reasons.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
