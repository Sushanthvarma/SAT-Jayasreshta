'use client';

import { useAuth } from '@/contexts/AuthContext';
import Branding from '@/components/Branding';
import UserMenu from '@/components/layout/UserMenu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, userData, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Branding */}
          <Branding />

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/student"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50"
              >
                Dashboard
              </Link>
              <Link
                href="/student/progress"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50"
              >
                Progress
              </Link>
              <Link
                href="/student/badges"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50"
              >
                Badges
              </Link>
              <Link
                href="/student/leaderboard"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50"
              >
                Leaderboard
              </Link>
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <UserMenu />
              </>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
