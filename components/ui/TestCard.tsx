'use client';

import Link from 'next/link';
import { Test } from '@/lib/types/test';
import { playSound } from '@/lib/audio';

interface TestCardProps {
  test: Test;
  existingAttempt?: { id: string; status: string };
  isCompleted?: boolean;
}

export default function TestCard({ test, existingAttempt, isCompleted }: TestCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden group">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
              {test.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{test.description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold shadow-sm">
            {test.totalQuestions} Questions
          </span>
          <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow-sm">
            {Math.floor(test.totalTimeLimit / 60)} min
          </span>
          <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold shadow-sm capitalize ${
            test.difficulty === 'beginner' ? 'bg-blue-100 text-blue-700' :
            test.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
            test.difficulty === 'advanced' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {test.difficulty}
          </span>
        </div>
        
        <div className="pt-3 sm:pt-4 border-t border-gray-100">
          {existingAttempt ? (
            <Link
              href={`/student/test/${test.id}?attempt=${existingAttempt.id}`}
              onClick={() => playSound('click')}
              className="block w-full text-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white hover:from-yellow-600 hover:to-orange-600 active:scale-95 transition-all shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center"
            >
              Continue Test →
            </Link>
          ) : (
            <Link
              href={`/student/test/${test.id}`}
              onClick={() => playSound('click')}
              className="block w-full text-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center"
            >
              {isCompleted ? 'Retake Test →' : 'Start Test →'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
