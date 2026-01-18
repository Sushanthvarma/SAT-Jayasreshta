'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';

export default function EmailManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string>('');
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailType, setTestEmailType] = useState<'weekly_report' | 'streak_milestone' | 'simple'>('weekly_report');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (!user || !userData || userData.role !== 'admin') return;

    const setupAuth = async () => {
      try {
        const auth = getAuthInstance();
        const idToken = await getIdToken(auth.currentUser!);
        setAuthToken(idToken);
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    };

    setupAuth();
  }, [user, userData]);

  useEffect(() => {
    if (!authToken) return;

    const fetchEmailLogs = async () => {
      try {
        setLoading(true);
        // TODO: Create API endpoint to fetch email logs
        // For now, we'll just set empty array
        setEmailLogs([]);
      } catch (error) {
        console.error('Error fetching email logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmailLogs();
  }, [authToken]);

  const sendWeeklyReports = async () => {
    if (!authToken) {
      toast.error('Authentication required');
      return;
    }

    try {
      setSending(prev => ({ ...prev, weekly: true }));
      const response = await fetch('/api/admin/email/weekly-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully sent ${data.summary.successful} weekly report emails!`);
      } else {
        toast.error(data.error || 'Failed to send weekly reports');
      }
    } catch (error: any) {
      console.error('Error sending weekly reports:', error);
      toast.error('Failed to send weekly reports');
    } finally {
      setSending(prev => ({ ...prev, weekly: false }));
    }
  };

  const sendInactivityReminders = async () => {
    if (!authToken) {
      toast.error('Authentication required');
      return;
    }

    try {
      setSending(prev => ({ ...prev, reminders: true }));
      const response = await fetch('/api/admin/email/inactivity-reminder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysInactive: 3 }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully sent ${data.summary.successful} reminder emails!`);
      } else {
        toast.error(data.error || 'Failed to send reminders');
      }
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setSending(prev => ({ ...prev, reminders: false }));
    }
  };

  const sendTestEmail = async () => {
    if (!authToken) {
      toast.error('Authentication required');
      return;
    }

    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSending(prev => ({ ...prev, test: true }));
      setTestResult(null);
      
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          emailType: testEmailType,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test email sent!' : 'Failed to send'),
      });
      
      if (data.success) {
        toast.success(`Test email sent to ${testEmail}! Check your inbox.`);
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setTestResult({
        success: false,
        message: 'Failed to send test email',
      });
      toast.error('Failed to send test email');
    } finally {
      setSending(prev => ({ ...prev, test: false }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading email management...</p>
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Email Management</h1>
          <p className="text-lg text-gray-600">Send automated emails to students and manage email preferences</p>
        </div>

        {/* Test Email Section */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 border border-gray-100 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4">🧪 Test Email System</h2>
          <p className="text-indigo-100 mb-4">Send a test email to verify the email system is working correctly</p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Email Type</label>
                <select
                  value={testEmailType}
                  onChange={(e) => setTestEmailType(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
                >
                  <option value="weekly_report">Weekly Report</option>
                  <option value="streak_milestone">Streak Milestone</option>
                  <option value="simple">Simple Test</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={sendTestEmail}
              disabled={sending.test || !authToken || !testEmail}
              className="w-full px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending.test ? 'Sending Test Email...' : 'Send Test Email'}
            </button>
            
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-500/20 border border-green-300' : 'bg-red-500/20 border border-red-300'}`}>
                <p className={`font-semibold ${testResult.success ? 'text-green-100' : 'text-red-100'}`}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Email Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Reports */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Weekly Reports</h3>
                <p className="text-sm text-gray-600">Send progress reports to all students</p>
              </div>
            </div>
            <button
              onClick={sendWeeklyReports}
              disabled={sending.weekly || !authToken}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending.weekly ? 'Sending...' : 'Send Weekly Reports'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Sends personalized weekly progress reports to all active students
            </p>
          </div>

          {/* Inactivity Reminders */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inactivity Reminders</h3>
                <p className="text-sm text-gray-600">Remind inactive students to return</p>
              </div>
            </div>
            <button
              onClick={sendInactivityReminders}
              disabled={sending.reminders || !authToken}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending.reminders ? 'Sending...' : 'Send Reminders (3+ days)'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Sends gentle reminders to students inactive for 3+ days
            </p>
          </div>

          {/* Email Settings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Email Settings</h3>
                <p className="text-sm text-gray-600">Configure email preferences</p>
              </div>
            </div>
            <a
              href="/settings/email-preferences"
              className="block w-full px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors text-center"
            >
              View Settings
            </a>
            <p className="text-xs text-gray-500 mt-2">
              Manage email templates and preferences
            </p>
          </div>
        </div>

        {/* Email Types Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Email Types</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Weekly Progress Reports</h3>
              <p className="text-sm text-gray-700 mb-2">
                Automated weekly reports sent every Sunday at 6 PM (when scheduled). Includes:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Tests completed this week</li>
                <li>Average score and improvement</li>
                <li>Current streak status</li>
                <li>Weekly highlights and achievements</li>
                <li>Badges earned</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <h3 className="font-semibold text-gray-900 mb-2">🔔 Inactivity Reminders</h3>
              <p className="text-sm text-gray-700 mb-2">
                Gentle reminders sent to students who haven't tested in a while:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Day 3: Friendly "We saved your spot!" reminder</li>
                <li>Day 5: Encouraging "Quick 10-minute challenge?" message</li>
                <li>Day 7: Supportive "We miss you!" message</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-2">🔥 Streak Milestone Celebrations</h3>
              <p className="text-sm text-gray-700 mb-2">
                Celebration emails sent when students reach streak milestones:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>5, 10, 15, 20, 30, 50 day streaks</li>
                <li>Includes streak stats and motivation</li>
                <li>Encourages maintaining the streak</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-2">🏆 Achievement Notifications</h3>
              <p className="text-sm text-gray-700 mb-2">
                Notifications sent when students earn badges or achievements:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Badge unlock notifications</li>
                <li>Achievement celebrations</li>
                <li>Progress milestones</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-indigo-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📧 Email Setup Instructions</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">1. Configure SendGrid</h3>
              <p className="text-sm mb-2">Add to your <code className="bg-white px-2 py-1 rounded">.env.local</code> file:</p>
              <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto">
{`SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Schedule Automated Emails</h3>
              <p className="text-sm">
                Set up cron jobs or Cloud Scheduler to automatically send emails:
              </p>
              <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                <li><strong>Weekly Reports:</strong> Every Sunday at 6 PM → <code className="bg-white px-1 rounded">POST /api/admin/email/weekly-reports</code></li>
                <li><strong>Reminders:</strong> Daily at 9 AM → <code className="bg-white px-1 rounded">POST /api/admin/email/inactivity-reminder</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Test Email Delivery</h3>
              <p className="text-sm">
                Use the buttons above to manually send test emails. Check the email logs in Firestore collection <code className="bg-white px-1 rounded">emailLogs</code> to verify delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
