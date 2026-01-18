'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';

interface EmailPreferences {
  weeklyReport: boolean;
  encouragementEmails: boolean;
  achievementEmails: boolean;
  reminderEmails: boolean;
  newsletter: boolean;
  parentMonthlyReport: boolean;
}

export default function EmailPreferencesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    weeklyReport: true,
    encouragementEmails: true,
    achievementEmails: true,
    reminderEmails: true,
    newsletter: true,
    parentMonthlyReport: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        
        const data = await response.json();
        if (data.success && data.profile?.emailPreferences) {
          setPreferences(data.profile.emailPreferences);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPreferences: preferences,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Email preferences saved!');
      } else {
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = () => {
    setPreferences({
      weeklyReport: false,
      encouragementEmails: false,
      achievementEmails: false,
      reminderEmails: false,
      newsletter: false,
      parentMonthlyReport: false,
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading preferences...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Preferences</h1>
        <p className="text-gray-600 mb-8">Choose which emails you'd like to receive</p>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Weekly Progress Report</h3>
              <p className="text-sm text-gray-600">Get a summary of your weekly test performance every Sunday</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.weeklyReport}
                onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Encouragement Emails</h3>
              <p className="text-sm text-gray-600">Receive motivational messages when you're doing well</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.encouragementEmails}
                onChange={(e) => setPreferences({ ...preferences, encouragementEmails: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Achievement Notifications</h3>
              <p className="text-sm text-gray-600">Get notified when you earn badges or reach milestones</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.achievementEmails}
                onChange={(e) => setPreferences({ ...preferences, achievementEmails: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Reminder Emails</h3>
              <p className="text-sm text-gray-600">Gentle reminders if you haven't tested in a few days</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.reminderEmails}
                onChange={(e) => setPreferences({ ...preferences, reminderEmails: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Newsletter</h3>
              <p className="text-sm text-gray-600">Monthly updates about new features and study tips</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.newsletter}
                onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="pt-6 border-t border-gray-200 flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            <button
              onClick={handleUnsubscribeAll}
              className="px-6 py-3 bg-white border-2 border-red-600 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
            >
              Unsubscribe from All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
