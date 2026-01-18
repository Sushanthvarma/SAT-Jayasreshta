/**
 * Celebration Mechanics
 * Dopamine-driven design for immediate positive feedback
 */

export type CelebrationType =
  | 'checkmark'
  | 'confetti'
  | 'badge-modal'
  | 'level-up-sequence'
  | 'full-screen-takeover';

export type CelebrationEvent =
  | 'correct_answer'
  | 'test_complete'
  | 'badge_unlock'
  | 'level_up'
  | 'streak_milestone'
  | 'skill_mastery'
  | 'perfect_score';

export interface CelebrationAnimation {
  type: CelebrationType;
  animation: string;
  sound: string;
  duration: number; // milliseconds
  message?: string | ((context: any) => string);
  particles?: string;
  shareButton?: boolean;
}

export interface CelebrationTrigger {
  event: CelebrationEvent;
  condition?: (context: any) => boolean;
  celebration: CelebrationAnimation;
}

/**
 * Celebration Configurations
 */
export const CELEBRATIONS: CelebrationTrigger[] = [
  {
    event: 'correct_answer',
    celebration: {
      type: 'checkmark',
      animation: 'bounce-in',
      sound: 'success-ping',
      duration: 800,
      particles: 'sparkles',
    },
  },
  {
    event: 'test_complete',
    condition: (ctx) => ctx.score >= ctx.maxScore * 0.8, // 80%+
    celebration: {
      type: 'confetti',
      animation: 'explode',
      sound: 'fanfare',
      duration: 3000,
      message: (ctx) => `Amazing work! You got ${ctx.score}/${ctx.maxScore}! 🎉`,
      particles: 'confetti-burst',
    },
  },
  {
    event: 'test_complete',
    condition: (ctx) => ctx.score === ctx.maxScore, // Perfect score
    celebration: {
      type: 'full-screen-takeover',
      animation: 'dramatic-reveal',
      sound: 'epic-achievement',
      duration: 5000,
      message: 'PERFECT SCORE! 🌟 You\'re unstoppable!',
      particles: 'fireworks',
      shareButton: true,
    },
  },
  {
    event: 'badge_unlock',
    celebration: {
      type: 'badge-modal',
      animation: 'zoom-rotate',
      sound: 'achievement',
      duration: 4000,
      message: (ctx) => `You earned: ${ctx.badgeName}! 🏆`,
      particles: 'stars',
      shareButton: true,
    },
  },
  {
    event: 'level_up',
    celebration: {
      type: 'level-up-sequence',
      animation: 'cascade',
      sound: 'level-up-jingle',
      duration: 2500,
      message: (ctx) => `Level ${ctx.newLevel}! You're unstoppable! 🚀`,
      particles: 'fireworks',
    },
  },
  {
    event: 'streak_milestone',
    condition: (ctx) => [7, 30, 100, 365].includes(ctx.streak),
    celebration: {
      type: 'full-screen-takeover',
      animation: 'dramatic-reveal',
      sound: 'epic-achievement',
      duration: 5000,
      message: (ctx) => `${ctx.streak} DAY STREAK! 🔥🔥🔥`,
      particles: 'fire-explosion',
      shareButton: true,
    },
  },
  {
    event: 'skill_mastery',
    celebration: {
      type: 'badge-modal',
      animation: 'zoom-rotate',
      sound: 'achievement',
      duration: 4000,
      message: (ctx) => `You mastered ${ctx.skillName}! 💎`,
      particles: 'stars',
      shareButton: true,
    },
  },
  {
    event: 'perfect_score',
    celebration: {
      type: 'full-screen-takeover',
      animation: 'dramatic-reveal',
      sound: 'epic-achievement',
      duration: 6000,
      message: 'PERFECT SCORE! 🎖️ You\'re a true master!',
      particles: 'fireworks',
      shareButton: true,
    },
  },
];

/**
 * Get celebration for an event
 */
export function getCelebration(
  event: CelebrationEvent,
  context: any
): CelebrationAnimation | null {
  const triggers = CELEBRATIONS.filter(c => c.event === event);
  
  for (const trigger of triggers) {
    if (!trigger.condition || trigger.condition(context)) {
      const celebration = { ...trigger.celebration };
      
      // Resolve message if it's a function
      if (typeof celebration.message === 'function') {
        celebration.message = celebration.message(context);
      }
      
      return celebration;
    }
  }
  
  return null;
}

/**
 * Trigger haptic feedback (mobile devices)
 */
export function triggerHapticFeedback(
  type: 'success' | 'error' | 'milestone'
): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return; // Not supported
  }

  const patterns: Record<string, number> = {
    success: 50, // Quick tap
    error: 100, // Single buzz
    milestone: 200, // Celebration pattern
  };

  const pattern = patterns[type];
  if (pattern) {
    navigator.vibrate(pattern);
  }
}

/**
 * Celebration Manager
 */
export class CelebrationManager {
  private activeCelebrations: Set<string> = new Set();

  /**
   * Trigger a celebration
   */
  triggerCelebration(
    event: CelebrationEvent,
    context: any
  ): CelebrationAnimation | null {
    const celebration = getCelebration(event, context);
    
    if (celebration) {
      // Prevent duplicate celebrations
      const celebrationId = `${event}-${JSON.stringify(context)}`;
      if (this.activeCelebrations.has(celebrationId)) {
        return null;
      }
      
      this.activeCelebrations.add(celebrationId);
      
      // Auto-remove after duration
      setTimeout(() => {
        this.activeCelebrations.delete(celebrationId);
      }, celebration.duration);
      
      // Trigger haptic feedback
      if (event === 'correct_answer') {
        triggerHapticFeedback('success');
      } else if (['badge_unlock', 'level_up', 'streak_milestone'].includes(event)) {
        triggerHapticFeedback('milestone');
      }
      
      return celebration;
    }
    
    return null;
  }

  /**
   * Clear all active celebrations
   */
  clearAll(): void {
    this.activeCelebrations.clear();
  }
}

export const celebrationManager = new CelebrationManager();
