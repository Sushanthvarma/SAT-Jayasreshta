/**
 * Virtual Currency System
 * Gems (premium) and Coins (common) for in-app economy
 */

export interface VirtualCurrency {
  gems: number; // Premium currency
  coins: number; // Common currency
}

export interface CurrencyTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  currency: 'gems' | 'coins';
  amount: number;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Currency Earning Rules
 */
export const EARNING_RULES = {
  // Coins (common currency)
  coinsPerCorrectAnswer: 5,
  coinsPerPerfectTest: 50,
  coinsDailyBonus: 25,
  coinsPerTestCompleted: 20,
  coinsPerStreakDay: 10,
  
  // Gems (premium currency)
  gemsPerBadge: 10,
  gemsPerLevelUp: 5,
  gemsPerWeekStreak: 15,
  gemsPerMonthStreak: 50,
  gemsPerPerfectScore: 20,
  gemsPerSkillMastery: 25,
};

/**
 * Calculate coins earned from an activity
 */
export function calculateCoinsEarned(activity: {
  correctAnswers?: number;
  isPerfectTest?: boolean;
  testCompleted?: boolean;
  streakDay?: number;
}): number {
  let coins = 0;
  
  if (activity.correctAnswers) {
    coins += activity.correctAnswers * EARNING_RULES.coinsPerCorrectAnswer;
  }
  
  if (activity.isPerfectTest) {
    coins += EARNING_RULES.coinsPerPerfectTest;
  }
  
  if (activity.testCompleted) {
    coins += EARNING_RULES.coinsPerTestCompleted;
  }
  
  if (activity.streakDay) {
    coins += activity.streakDay * EARNING_RULES.coinsPerStreakDay;
  }
  
  return coins;
}

/**
 * Calculate gems earned from achievements
 */
export function calculateGemsEarned(achievements: {
  badgesEarned?: number;
  levelUps?: number;
  weekStreak?: boolean;
  monthStreak?: boolean;
  perfectScore?: boolean;
  skillMasteries?: number;
}): number {
  let gems = 0;
  
  if (achievements.badgesEarned) {
    gems += achievements.badgesEarned * EARNING_RULES.gemsPerBadge;
  }
  
  if (achievements.levelUps) {
    gems += achievements.levelUps * EARNING_RULES.gemsPerLevelUp;
  }
  
  if (achievements.weekStreak) {
    gems += EARNING_RULES.gemsPerWeekStreak;
  }
  
  if (achievements.monthStreak) {
    gems += EARNING_RULES.gemsPerMonthStreak;
  }
  
  if (achievements.perfectScore) {
    gems += EARNING_RULES.gemsPerPerfectScore;
  }
  
  if (achievements.skillMasteries) {
    gems += achievements.skillMasteries * EARNING_RULES.gemsPerSkillMastery;
  }
  
  return gems;
}

/**
 * Currency Manager
 */
export class CurrencyManager {
  /**
   * Add currency to user balance
   */
  addCurrency(
    currentBalance: VirtualCurrency,
    currency: 'gems' | 'coins',
    amount: number
  ): VirtualCurrency {
    return {
      ...currentBalance,
      [currency]: currentBalance[currency] + amount,
    };
  }

  /**
   * Spend currency (returns new balance and success status)
   */
  spendCurrency(
    currentBalance: VirtualCurrency,
    currency: 'gems' | 'coins',
    amount: number
  ): { success: boolean; newBalance: VirtualCurrency } {
    if (currentBalance[currency] < amount) {
      return {
        success: false,
        newBalance: currentBalance,
      };
    }

    return {
      success: true,
      newBalance: {
        ...currentBalance,
        [currency]: currentBalance[currency] - amount,
      },
    };
  }

  /**
   * Check if user can afford an item
   */
  canAfford(
    balance: VirtualCurrency,
    price: { gems?: number; coins?: number }
  ): boolean {
    if (price.gems && balance.gems < price.gems) {
      return false;
    }
    if (price.coins && balance.coins < price.coins) {
      return false;
    }
    return true;
  }
}

export const currencyManager = new CurrencyManager();
