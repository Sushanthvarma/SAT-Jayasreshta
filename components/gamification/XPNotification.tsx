'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface XPNotificationProps {
  xpGained: number;
  reason?: string;
  leveledUp?: boolean;
  newLevel?: number;
}

export default function XPNotification({ xpGained, reason, leveledUp, newLevel }: XPNotificationProps) {
  useEffect(() => {
    if (leveledUp && newLevel) {
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-bold">Level Up!</div>
            <div className="text-sm">You're now Level {newLevel}</div>
          </div>
        </div>,
        { duration: 5000 }
      );
    } else {
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-xl">✨</span>
          <div>
            <div className="font-bold">+{xpGained} XP</div>
            {reason && <div className="text-sm text-gray-600">{reason}</div>}
          </div>
        </div>,
        { duration: 3000 }
      );
    }
  }, [xpGained, reason, leveledUp, newLevel]);

  return null;
}
