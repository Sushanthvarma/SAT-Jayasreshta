'use client';

import Link from 'next/link';

export default function Branding() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
        <span className="text-2xl font-bold text-white">SAT</span>
      </div>
      <div className="flex flex-col">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
          SAT Practice Platform
        </Link>
        <p className="text-xs text-gray-500 font-medium">By Sushanth Varma</p>
      </div>
    </div>
  );
}
