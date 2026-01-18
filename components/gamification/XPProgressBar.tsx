'use client';

import { getXPProgress } from '@/lib/gamification/xp';

interface XPProgressBarProps {
  totalXP: number;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function XPProgressBar({ totalXP, showLevel = true, size = 'md' }: XPProgressBarProps) {
  const progress = getXPProgress(totalXP);
  
  const sizeClasses = {
    sm: { height: 'h-2', text: 'text-xs' },
    md: { height: 'h-3', text: 'text-sm' },
    lg: { height: 'h-4', text: 'text-base' },
  };

  return (
    <div className="w-full">
      {showLevel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-gray-900 ${sizeClasses[size].text}`}>
              Level {progress.level}
            </span>
            <span className="text-gray-500">•</span>
            <span className={`text-gray-600 ${sizeClasses[size].text}`}>
              {progress.currentLevelXP.toLocaleString()} / {progress.nextLevelXP.toLocaleString()} XP
            </span>
          </div>
          <span className={`font-semibold text-indigo-600 ${sizeClasses[size].text}`}>
            {totalXP.toLocaleString()} total XP
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].height}`}>
        <div
          className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ${sizeClasses[size].height}`}
          style={{ width: `${progress.progress}%` }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
