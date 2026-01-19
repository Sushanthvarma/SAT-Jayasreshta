'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { playSound } from '@/lib/audio';

interface XPNotificationProps {
  xpGained: number;
  reason?: string;
  leveledUp?: boolean;
  newLevel?: number;
}

export default function XPNotification({ xpGained, reason, leveledUp, newLevel }: XPNotificationProps) {
  useEffect(() => {
    if (leveledUp && newLevel) {
      playSound('levelUp', 0.5);
      toast.success(
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🎉</span>
          <div>
            <div className="font-bold text-sm sm:text-base">Level Up!</div>
            <div className="text-xs sm:text-sm">You're now Level {newLevel}</div>
          </div>
        </div>,
        { duration: 5000 }
      );
    } else {
      playSound('notification', 0.4);
      toast.success(
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">✨</span>
          <div>
            <div className="font-bold text-sm sm:text-base">+{xpGained} XP</div>
            {reason && <div className="text-xs sm:text-sm text-gray-600">{reason}</div>}
          </div>
        </div>,
        { duration: 3000 }
      );
    }
  }, [xpGained, reason, leveledUp, newLevel]);

  return null;
}
