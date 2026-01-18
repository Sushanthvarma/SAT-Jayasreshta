'use client';

import { useEffect, useState } from 'react';

interface LevelUpCelebrationProps {
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpCelebration({ newLevel, onClose }: LevelUpCelebrationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in zoom-in">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Level Up!</h2>
          <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Level {newLevel}
          </div>
          <p className="text-lg text-gray-600 mb-6">
            Congratulations! You've reached a new level. Keep up the great work!
          </p>
          <button
            onClick={() => {
              setShow(false);
              onClose();
            }}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
