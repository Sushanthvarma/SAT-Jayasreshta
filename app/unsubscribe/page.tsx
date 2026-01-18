'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import Link from 'next/link';

function UnsubscribeContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [preferences, setPreferences] = useState({
    weeklyReport: true,
    encouragementEmails: true,
    achievementEmails: true,
    reminderEmails: true,
    newsletter: true,
    parentMonthlyReport: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const token = searchParams.get('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Decode token (in production, use proper encryption)
    // For now, assume token is userId (in production, use JWT or similar)
    const userId = token;

    const loadPreferences = async () => {
      try {
        if (typeof window === 'undefined') return;
        const auth = getAuthInstance();
        if (auth.currentUser) {
          const idToken = await getIdToken(auth.currentUser);
          const response = await fetch('/api/profile', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });
          const data = await response.json();
          if (data.success && data.profile?.emailPreferences) {
            setPreferences(data.profile.emailPreferences);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [searchParams]);

  const handleUnsubscribe = async () => {
    try {
      if (typeof window === 'undefined') return;
      const auth = getAuthInstance();
      if (!auth.currentUser) {
        toast.error('Please log in to manage preferences');
        return;
      }

      const idToken = await getIdToken(auth.currentUser);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPreferences: {
            weeklyReport: false,
            encouragementEmails: false,
            achievementEmails: false,
            reminderEmails: false,
            newsletter: false,
            parentMonthlyReport: false,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUnsubscribed(true);
        toast.success('Unsubscribed from all emails');
      } else {
        toast.error(data.error || 'Failed to unsubscribe');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {unsubscribed ? (
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Unsubscribed Successfully</h1>
                <p className="text-gray-600">
                  You've been unsubscribed from all emails. We're sorry to see you go!
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/settings/email-preferences"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Manage Email Preferences →
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Email Preferences</h1>
              <p className="text-gray-600 mb-6">
                We're sorry to see you go! Which emails would you like to stop receiving?
              </p>

              <div className="space-y-4 mb-6">
                {Object.entries(preferences).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleUnsubscribe}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Unsubscribe from All
                </button>
                <Link
                  href="/settings/email-preferences"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-center"
                >
                  Save Preferences
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
