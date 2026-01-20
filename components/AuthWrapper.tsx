'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getAuthInstance, getGoogleProviderInstance } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const auth = getAuthInstance();
      const googleProvider = getGoogleProviderInstance();
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    }
  };

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

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Image 
              src="/logo.svg" 
              alt="SAT Practice Platform" 
              width={80}
              height={80}
              priority
              className="mx-auto"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            SAT Practice Platform
          </h1>
          <p className="text-2xl text-gray-600">
            Let's practice and learn together!
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md rounded-2xl bg-red-50 px-6 py-4 text-center text-lg text-red-800 border-2 border-red-200 shadow-lg">
            <div className="mb-2 text-3xl">⚠️</div>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          className="flex items-center gap-4 rounded-2xl bg-white px-8 py-5 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-gray-200 min-h-[64px] min-w-[280px] justify-center"
        >
          <svg className="h-8 w-8" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-xl font-semibold text-gray-800">
            Sign in with Google
          </span>
        </button>

        <div className="mt-4 text-center text-sm text-gray-500">
          Ask your parent or teacher for help if needed
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b-2 bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src="/logo.svg" 
                alt="SAT Practice Platform" 
                width={48}
                height={48}
                priority
                className="flex-shrink-0"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">SAT Practice</h2>
                {userData && (
                  <p className="text-sm text-gray-600">
                    Hi, {userData.displayName}! {userData.streak > 0 && `🔥 ${userData.streak} day streak!`}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                const auth = getAuthInstance();
                signOut(auth);
              }} 
              className="rounded-lg bg-gray-100 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-red-800 border-2 border-red-200">
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
