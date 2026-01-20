'use client';

/**
 * ADMIN ANALYTICS DASHBOARD - SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL: This page subscribes directly to analytics/summary document
 * All data comes from ONE source - ensures consistency across all tabs
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { initializeAnalytics } from '@/lib/firebase/analytics';
import Header from '@/components/layout/Header';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Tab = 'overview' | 'grades' | 'content';

interface AnalyticsData {
  lastUpdated: Date | Timestamp;
  totalUsers: number;
  activeUsers: number;
  totalTestsTaken: number;
  gradeStats: Record<string, {
    userCount: number;
    attemptCount: number;
    totalTimeSpent: number;
    avgTimePerAttempt: number;
  }>;
  contentStats: Record<string, {
    attemptCount: number;
    totalScore: number;
    avgScore: number;
    totalXPAwarded: number;
  }>;
  timeSeriesData: Record<string, {
    testAttempts: number;
    totalTimeSpent: number;
    activeUsers?: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);
  
  // Subscribe to SINGLE analytics document - real-time updates
  useEffect(() => {
    if (!user || !userData || userData.role !== 'admin') return;
    
    setIsLoading(true);
    setError(null);
    
    const db = getDbInstance();
    const analyticsRef = doc(db, 'analytics', 'summary');
    
    // Initialize analytics if it doesn't exist
    initializeAnalytics().catch(err => {
      console.warn('Analytics initialization warning:', err);
    });
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      analyticsRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('📊 [ANALYTICS] Real-time update received:', {
            totalTestsTaken: data.totalTestsTaken,
            totalUsers: data.totalUsers,
            lastUpdated: data.lastUpdated
          });
          
          setAnalytics({
            ...data,
            lastUpdated: (data.lastUpdated as any)?.toDate?.() || new Date(data.lastUpdated as any) || new Date()
          } as AnalyticsData);
          setIsLoading(false);
        } else {
          console.warn('⚠️ Analytics document does not exist');
          setError('Analytics data not available. Complete some tests to see data.');
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('❌ Analytics subscription error:', error);
        setError('Failed to load analytics data');
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user, userData]);
  
  // Calculate active users (last 30 days)
  useEffect(() => {
    if (!analytics) return;
    
    const calculateActiveUsers = async () => {
      try {
        const db = getDbInstance();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const usersQuery = query(
          collection(db, 'users'),
          where('lastActive', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        
        const snapshot = await getDocs(usersQuery);
        console.log(`Active users (last 30 days): ${snapshot.size}`);
        
        // Note: This would ideally update the analytics document server-side
        // For now, we'll just log it
        
      } catch (error) {
        console.error('Failed to calculate active users:', error);
      }
    };
    
    calculateActiveUsers();
  }, [analytics]);
  
  if (authLoading || isLoading) {
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
  
  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Header />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold text-red-600 mb-2">{error}</p>
            <p className="text-gray-600">Complete some tests to see analytics data.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Header />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-700 mb-2">No analytics data available</p>
            <p className="text-gray-600">Complete some tests to see analytics data.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Prepare time series data for charts
  const timeSeriesChartData = Object.entries(analytics.timeSeriesData || {})
    .map(([date, data]) => ({
      date,
      attempts: data.testAttempts || 0,
      timeSpent: data.totalTimeSpent || 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
  
  // Prepare grade data for charts
  const gradeChartData = Object.entries(analytics.gradeStats || {})
    .map(([grade, stats]) => ({
      grade: grade.replace(' Grade', ''),
      attempts: stats.attemptCount || 0,
      avgTime: stats.avgTimePerAttempt || 0,
      users: stats.userCount || 0
    }));
  
  // Prepare content data for charts
  const contentChartData = Object.entries(analytics.contentStats || {})
    .map(([category, stats]) => ({
      category,
      attempts: stats.attemptCount || 0,
      avgScore: stats.avgScore || 0,
      totalXP: stats.totalXPAwarded || 0
    }));
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />
      
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
          <p className="text-lg text-gray-600">
            Last updated: {analytics.lastUpdated instanceof Date 
              ? analytics.lastUpdated.toLocaleString() 
              : new Date(analytics.lastUpdated as any).toLocaleString()}
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon="📊"
            label="Overview"
          />
          <TabButton
            active={activeTab === 'grades'}
            onClick={() => setActiveTab('grades')}
            icon="🎓"
            label="Grade Analysis"
          />
          <TabButton
            active={activeTab === 'content'}
            onClick={() => setActiveTab('content')}
            icon="📝"
            label="Content Analytics"
          />
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Total Users"
                value={analytics.totalUsers}
                icon="👥"
                color="blue"
              />
              <StatCard
                title="Active Users"
                value={analytics.activeUsers}
                subtitle="Last 30 days"
                icon="✅"
                color="green"
              />
              <StatCard
                title="Total Tests Taken"
                value={analytics.totalTestsTaken}
                icon="📝"
                color="purple"
              />
              <StatCard
                title="Total Time"
                value={`${Object.values(analytics.gradeStats || {}).reduce((sum, g) => sum + (g.totalTimeSpent || 0), 0)}m`}
                icon="⏱️"
                color="orange"
              />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Attempts Over Time */}
              <ChartCard title="Test Attempts Over Time (Last 30 Days)">
                {timeSeriesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="attempts" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
              
              {/* Time Spent Over Time */}
              <ChartCard title="Time Spent Over Time (Last 30 Days)">
                {timeSeriesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="timeSpent" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
            </div>
          </div>
        )}
        
        {/* Grade Analysis Tab */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            {/* Grade Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Users</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(analytics.gradeStats || {}).map(([grade, stats]) => (
                    <tr key={grade} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{grade}</td>
                      <td className="px-6 py-4">{stats.userCount || 0}</td>
                      <td className="px-6 py-4">{stats.attemptCount || 0}</td>
                      <td className="px-6 py-4">{stats.totalTimeSpent || 0}m</td>
                      <td className="px-6 py-4">{stats.avgTimePerAttempt || 0}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Grade Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Attempts by Grade">
                {gradeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="attempts" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
              
              <ChartCard title="Average Time by Grade">
                {gradeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgTime" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
            </div>
          </div>
        )}
        
        {/* Content Analytics Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(analytics.contentStats || {}).map(([category, stats]) => (
                <div key={category} className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold mb-4">{category}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attempts:</span>
                      <span className="font-semibold">{stats.attemptCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Score:</span>
                      <span className="font-semibold">{stats.avgScore || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total XP:</span>
                      <span className="font-semibold text-purple-600">
                        {(stats.totalXPAwarded || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Content Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Attempts by Category">
                {contentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="attempts" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
              
              <ChartCard title="Average Score by Category">
                {contentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgScore" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoDataMessage />
                )}
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-3 font-semibold transition-colors border-b-2
        ${active 
          ? 'border-indigo-600 text-indigo-600' 
          : 'border-transparent text-gray-600 hover:text-gray-900'
        }
      `}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color, subtitle }: { title: string; value: number | string; icon: string; color: string; subtitle?: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600'
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} rounded-xl shadow-lg p-6 text-white`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{icon}</div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1 opacity-90">{title}</h3>
        <div className="text-3xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-sm opacity-75 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function NoDataMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <p className="text-lg font-semibold mb-2">No data available</p>
      <p className="text-sm">Complete some tests to see analytics</p>
    </div>
  );
}
