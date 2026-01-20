'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t-2 border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Column */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
              <Image 
                src="/logo.svg" 
                alt="SAT Practice Platform" 
                width={32}
                height={32}
                className="flex-shrink-0"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900">SAT Practice Platform</h3>
                <p className="text-xs text-gray-500">By Sushanth Varma</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Professional SAT preparation platform designed to help students achieve their target scores through adaptive practice and detailed analytics.
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/student" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/student/leaderboard" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/student/progress" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  Progress
                </Link>
              </li>
              <li>
                <Link href="/student/badges" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  Badges
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="text-center md:text-left">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:email@sushanthvarma.in" 
                  className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center justify-center md:justify-start gap-2"
                >
                  <span>📧</span>
                  <span>email@sushanthvarma.in</span>
                </a>
              </li>
              <li>
                <Link href="/student/profile" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <span className="text-sm text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-sm text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} SAT Practice Platform. Developed by{' '}
            <a 
              href="mailto:email@sushanthvarma.in" 
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Sushanth Varma
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
