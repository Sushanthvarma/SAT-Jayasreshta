'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Test } from '@/lib/types/test';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    publishedTests: 0,
    totalUsers: 0,
    totalAttempts: 0,
  });
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
          setTests(data.tests || []);
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
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-lg text-gray-600">Manage tests and view platform analytics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">{stats.totalTests}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Tests</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">{stats.publishedTests}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Published</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">{stats.totalUsers}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Users</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-600 mb-2">{stats.totalAttempts}</div>
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Test Attempts</div>
            </div>
          </div>
        </div>

        {/* Tests Management */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Test Management</h2>
                <p className="text-gray-600 mt-1">Manage all practice tests</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/admin/tests"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all min-h-[44px] flex items-center"
                >
                  📁 Import Tests
                </Link>
                <Link
                  href="/admin/tests/new"
                  className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all min-h-[44px] flex items-center"
                >
                  + Create New Test
                </Link>
              </div>
            </div>
          </div>
          
          {tests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl text-gray-600 font-semibold">No tests created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{test.title}</div>
                        <div className="text-sm text-gray-500">{test.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          test.status === 'published' ? 'bg-green-100 text-green-800' :
                          test.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {test.totalQuestions}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <Link
                          href={`/admin/tests/${test.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
