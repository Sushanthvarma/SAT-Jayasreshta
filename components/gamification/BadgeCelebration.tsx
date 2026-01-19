'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/lib/gamification/badges';
import { playSound } from '@/lib/audio';

interface BadgeCelebrationProps {
  badges: Badge[];
  onClose: () => void;
}

export default function BadgeCelebration({ badges, onClose }: BadgeCelebrationProps) {
  const [show, setShow] = useState(true);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

  useEffect(() => {
    if (badges.length === 0) {
      setShow(false);
      onClose();
      return;
    }

    // Play achievement sound when badge appears
    playSound('achievement', 0.6);

    const timer = setTimeout(() => {
      if (currentBadgeIndex < badges.length - 1) {
        playSound('achievement', 0.5);
        setCurrentBadgeIndex(prev => prev + 1);
      } else {
        setTimeout(() => {
          setShow(false);
          onClose();
        }, 3000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [badges, currentBadgeIndex, onClose]);

  if (!show || badges.length === 0) {
    return null;
  }

  const currentBadge = badges[currentBadgeIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => {
      playSound('click');
      setShow(false);
      onClose();
    }}>
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-bounce" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-6xl sm:text-8xl mb-4 animate-pulse">{currentBadge.icon}</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Congratulations!</h2>
          <h3 className="text-xl sm:text-2xl font-semibold text-indigo-600 mb-4">{currentBadge.name}</h3>
          <p className="text-sm sm:text-base text-gray-700 mb-6">{currentBadge.description}</p>
          {badges.length > 1 && (
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Badge {currentBadgeIndex + 1} of {badges.length}
            </p>
          )}
          <button
            onClick={() => {
              playSound('click');
              setShow(false);
              onClose();
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 active:scale-95 transition-all min-h-[44px]"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
