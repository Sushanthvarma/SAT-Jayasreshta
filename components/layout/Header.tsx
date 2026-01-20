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

  // Determine active link based on pathname
  const isActive = (href: string) => {
    if (href === '/student' || href === '/admin/dashboard') {
      return pathname === href || pathname === `${href}/`;
    }
    return pathname.startsWith(href);
  };

  const navLinks = userData?.role === 'admin' ? (
    <>
      <Link
        href="/admin/dashboard"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/admin/dashboard')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Executive Dashboard
      </Link>
      <Link
        href="/admin/analytics"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/admin/analytics')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Analytics
      </Link>
      <Link
        href="/admin/email"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/admin/email')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Email Management
      </Link>
      <Link
        href="/admin/tests"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/admin/tests')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Test Management
      </Link>
    </>
  ) : (
    <>
      <Link
        href="/student"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/student')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Dashboard
      </Link>
      <Link
        href="/student/progress"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/student/progress')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Progress
      </Link>
      <Link
        href="/student/badges"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/student/badges')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Badges
      </Link>
      <Link
        href="/student/leaderboard"
        onClick={handleLinkClick}
        className={`block px-4 py-3 font-semibold transition-all duration-200 rounded-lg ${
          isActive('/student/leaderboard')
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        Leaderboard
      </Link>
    </>
  );

  return (
    <header className="bg-white border-b-2 border-gray-200 shadow-md sticky top-0 z-50 backdrop-blur-sm bg-white/95">
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
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/admin/dashboard')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Executive Dashboard
                  </Link>
                  <Link
                    href="/admin/analytics"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/admin/analytics')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/admin/email"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/admin/email')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Email Management
                  </Link>
                  <Link
                    href="/admin/tests"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/admin/tests')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Test Management
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/student"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/student')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/student/progress"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/student/progress')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Progress
                  </Link>
                  <Link
                    href="/student/badges"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/student/badges')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Badges
                  </Link>
                  <Link
                    href="/student/leaderboard"
                    onClick={() => playSound('click')}
                    className={`font-semibold transition-all duration-200 px-4 py-2 rounded-lg text-sm xl:text-base ${
                      isActive('/student/leaderboard')
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
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
