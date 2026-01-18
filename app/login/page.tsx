'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
      {/* App Logo/Title */}
      <div className="text-center">
        <div className="mb-6 text-7xl">📚</div>
        <h1 className="text-5xl font-bold text-gray-900 mb-3">
          SAT Practice Platform
        </h1>
        <p className="text-2xl text-gray-600">
          Let's start learning today!
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="flex gap-4 text-4xl opacity-50">
        <span>⭐</span>
        <span>📖</span>
        <span>🎯</span>
      </div>

      {/* Sign In Button */}
      <GoogleSignInButton />

      {/* Help Text */}
      <div className="mt-4 text-center text-sm text-gray-500 max-w-md">
        Ask your parent or teacher for help if needed
      </div>
    </div>
  );
}
