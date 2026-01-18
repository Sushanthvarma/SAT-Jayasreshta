'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import Branding from '@/components/Branding';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/student');
    }
  }, [user, loading, router]);

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

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Branding />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg mb-6">
                <span className="text-4xl">📚</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Welcome to SAT Practice
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Master the SAT with comprehensive practice tests, detailed analytics, and personalized learning paths.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-indigo-50 rounded-xl">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-xs font-semibold text-gray-700">Analytics</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-xs font-semibold text-gray-700">Practice</p>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-xl">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-xs font-semibold text-gray-700">Achieve</p>
              </div>
            </div>

            {/* Sign In Button */}
            <GoogleSignInButton />

            {/* Help Text */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Secure sign-in with Google. Your progress is automatically saved.
            </p>
          </div>

          {/* Educational Note */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Start Your Journey</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Take practice tests, track your progress, and improve your scores with detailed feedback and recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
