'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Test } from '@/lib/types/test';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <nav className="border-b-2 bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚙️</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-lg text-gray-600">Manage tests and view analytics</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/student"
                className="rounded-lg bg-gray-100 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px] flex items-center"
              >
                Student View
              </Link>
              <button
                onClick={() => router.push('/login')}
                className="rounded-lg bg-red-100 px-6 py-3 text-base font-medium text-red-700 hover:bg-red-200 transition-colors min-h-[44px]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-blue-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stats.totalTests}</div>
              <div className="text-sm text-gray-600 mt-2">Total Tests</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-green-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{stats.publishedTests}</div>
              <div className="text-sm text-gray-600 mt-2">Published Tests</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-purple-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600 mt-2">Total Users</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-orange-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{stats.totalAttempts}</div>
              <div className="text-sm text-gray-600 mt-2">Test Attempts</div>
            </div>
          </div>
        </div>

        {/* Tests Management */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-gray-900">Test Management</h2>
            <Link
              href="/admin/tests/new"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
            >
              + Create New Test
            </Link>
          </div>
          
          {tests.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 shadow-lg border-2 border-gray-200 text-center">
              <p className="text-xl text-gray-600">No tests created yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests.map((test) => (
                    <tr key={test.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{test.title}</div>
                        <div className="text-sm text-gray-500">{test.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          test.status === 'published' ? 'bg-green-100 text-green-800' :
                          test.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.totalQuestions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/admin/tests/${test.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
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
