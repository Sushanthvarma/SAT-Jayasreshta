'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { playSound } from '@/lib/audio';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="text-center max-w-md w-full">
          <div className="mb-6">
            <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
            <p className="text-lg text-gray-600 mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/student"
              onClick={() => playSound('click')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => {
                playSound('click');
                router.back();
              }}
              className="px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 border-2 border-gray-200 active:scale-95 transition-all min-h-[44px]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
