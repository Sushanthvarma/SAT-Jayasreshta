'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Branding from '@/components/Branding';
import UserMenu from '@/components/layout/UserMenu';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { playSound } from '@/lib/audio';

export default function Header() {
  const { user, userData, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLinkClick = () => {
    playSound('click');
    setMobileMenuOpen(false);
  };

  const navLinks = userData?.role === 'admin' ? (
    <>
      <Link
        href="/admin/dashboard"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Executive Dashboard
      </Link>
      <Link
        href="/admin/analytics"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Analytics
      </Link>
      <Link
        href="/admin/email"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Email Management
      </Link>
      <Link
        href="/admin/tests"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Test Management
      </Link>
    </>
  ) : (
    <>
      <Link
        href="/student"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Dashboard
      </Link>
      <Link
        href="/student/progress"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Progress
      </Link>
      <Link
        href="/student/badges"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Badges
      </Link>
      <Link
        href="/student/leaderboard"
        onClick={handleLinkClick}
        className="block px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors rounded-lg"
      >
        Leaderboard
      </Link>
    </>
  );

  return (
    <header className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Branding */}
          <div className="flex-shrink-0">
            <Branding />
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
              {userData?.role === 'admin' ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Executive Dashboard
                  </Link>
                  <Link
                    href="/admin/analytics"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/admin/email"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Email Management
                  </Link>
                  <Link
                    href="/admin/tests"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Test Management
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/student"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/student/progress"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Progress
                  </Link>
                  <Link
                    href="/student/badges"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Badges
                  </Link>
                  <Link
                    href="/student/leaderboard"
                    onClick={() => playSound('click')}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm xl:text-base"
                  >
                    Leaderboard
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User Menu & Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                {/* Desktop User Menu */}
                <div className="hidden sm:block">
                  <UserMenu />
                </div>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => {
                    playSound('click');
                    setMobileMenuOpen(!mobileMenuOpen);
                  }}
                  className="sm:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {mobileMenuOpen ? (
                      <path d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => playSound('click')}
                className="px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center text-sm sm:text-base"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="lg:hidden border-t border-gray-200 py-4 animate-in">
            <nav className="flex flex-col space-y-2">
              {navLinks}
              {/* Mobile User Menu */}
              <div className="sm:hidden pt-2 border-t border-gray-200">
                <UserMenu />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
