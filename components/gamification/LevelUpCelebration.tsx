'use client';

import { useEffect, useState } from 'react';
import { playSound } from '@/lib/audio';

interface LevelUpCelebrationProps {
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpCelebration({ newLevel, onClose }: LevelUpCelebrationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Play level up sound
    playSound('levelUp', 0.7);
    
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in p-4" onClick={() => {
      playSound('click');
      setShow(false);
      onClose();
    }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full transform transition-all animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-6xl sm:text-8xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Level Up!</h2>
          <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Level {newLevel}
          </div>
          <p className="text-base sm:text-lg text-gray-600 mb-6">
            Congratulations! You've reached a new level. Keep up the great work!
          </p>
          <button
            onClick={() => {
              playSound('click');
              setShow(false);
              onClose();
            }}
            className="px-6 sm:px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg min-h-[44px]"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
