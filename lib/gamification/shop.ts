/**
 * Virtual Shop System
 * In-app purchases for avatars, power-ups, and certificates
 */

export type ShopCategory = 'avatars' | 'powerups' | 'certificates' | 'themes' | 'boosters';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ShopCategory;
  price: {
    gems?: number;
    coins?: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  available: boolean;
  limitedTime?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

/**
 * Shop Items Catalog
 */
export const SHOP_ITEMS: Record<ShopCategory, ShopItem[]> = {
  avatars: [
    {
      id: 'avatar-dragon',
      name: 'Dragon Avatar',
      description: 'A powerful dragon companion',
      icon: '🐉',
      category: 'avatars',
      price: { gems: 50 },
      rarity: 'epic',
      available: true,
    },
    {
      id: 'avatar-unicorn',
      name: 'Unicorn Avatar',
      description: 'A magical unicorn friend',
      icon: '🦄',
      category: 'avatars',
      price: { coins: 500 },
      rarity: 'rare',
      available: true,
    },
    {
      id: 'avatar-robot',
      name: 'Robot Avatar',
      description: 'A futuristic robot companion',
      icon: '🤖',
      category: 'avatars',
      price: { coins: 300 },
      rarity: 'common',
      available: true,
    },
    {
      id: 'avatar-astronaut',
      name: 'Astronaut Avatar',
      description: 'Explore the stars!',
      icon: '👨‍🚀',
      category: 'avatars',
      price: { gems: 75 },
      rarity: 'epic',
      available: true,
    },
    {
      id: 'avatar-wizard',
      name: 'Wizard Avatar',
      description: 'Master of magic and learning',
      icon: '🧙‍♂️',
      category: 'avatars',
      price: { gems: 100 },
      rarity: 'legendary',
      available: true,
    },
  ],

  powerups: [
    {
      id: 'streak-freeze',
      name: 'Streak Freeze',
      description: 'Save your streak if you miss a day',
      icon: '🧊',
      category: 'powerups',
      price: { coins: 200 },
      rarity: 'common',
      available: true,
      metadata: {
        effect: 'preserves_streak',
        duration: 1, // days
      },
    },
    {
      id: 'time-boost',
      name: 'Time Boost',
      description: 'Extra 2 minutes for next test',
      icon: '⏱️',
      category: 'powerups',
      price: { coins: 150 },
      rarity: 'common',
      available: true,
      metadata: {
        effect: 'extra_time',
        duration: 120, // seconds
      },
    },
    {
      id: 'hint-pack',
      name: '5 Hints',
      description: 'Get helpful hints on tough questions',
      icon: '💡',
      category: 'powerups',
      price: { coins: 100 },
      rarity: 'common',
      available: true,
      metadata: {
        effect: 'hints',
        quantity: 5,
      },
    },
    {
      id: 'double-xp',
      name: 'Double XP Boost',
      description: 'Earn 2x XP for 1 hour',
      icon: '⚡',
      category: 'powerups',
      price: { gems: 25 },
      rarity: 'rare',
      available: true,
      metadata: {
        effect: 'double_xp',
        duration: 3600, // seconds
      },
    },
    {
      id: 'perfect-day',
      name: 'Perfect Day Boost',
      description: 'Guaranteed perfect score on next test (one-time)',
      icon: '⭐',
      category: 'powerups',
      price: { gems: 100 },
      rarity: 'legendary',
      available: true,
      metadata: {
        effect: 'perfect_score',
        oneTime: true,
      },
    },
  ],

  certificates: [
    {
      id: 'cert-week',
      name: 'Week Completion Certificate',
      description: 'Printable certificate for 7-day streak',
      icon: '📜',
      category: 'certificates',
      price: { gems: 10 },
      rarity: 'common',
      available: true,
    },
    {
      id: 'cert-mastery',
      name: 'Skill Mastery Certificate',
      description: 'Prove you\'ve mastered a skill',
      icon: '🏆',
      category: 'certificates',
      price: { gems: 25 },
      rarity: 'rare',
      available: true,
    },
    {
      id: 'cert-perfect',
      name: 'Perfect Score Certificate',
      description: 'Celebrate your perfect test score',
      icon: '💯',
      category: 'certificates',
      price: { gems: 30 },
      rarity: 'epic',
      available: true,
    },
  ],

  themes: [
    {
      id: 'theme-galaxy',
      name: 'Galaxy Theme',
      description: 'Explore the cosmos while learning',
      icon: '🌌',
      category: 'themes',
      price: { gems: 100 },
      rarity: 'epic',
      available: true,
    },
    {
      id: 'theme-ocean',
      name: 'Ocean Theme',
      description: 'Dive into learning',
      icon: '🌊',
      category: 'themes',
      price: { coins: 800 },
      rarity: 'rare',
      available: true,
    },
    {
      id: 'theme-forest',
      name: 'Forest Theme',
      description: 'Learn in nature',
      icon: '🌲',
      category: 'themes',
      price: { coins: 600 },
      rarity: 'common',
      available: true,
    },
  ],

  boosters: [
    {
      id: 'booster-confidence',
      name: 'Confidence Booster',
      description: 'Start next test with 3 correct answers',
      icon: '💪',
      category: 'boosters',
      price: { gems: 50 },
      rarity: 'rare',
      available: true,
      metadata: {
        effect: 'head_start',
        correctAnswers: 3,
      },
    },
    {
      id: 'booster-focus',
      name: 'Focus Booster',
      description: 'No distractions for 30 minutes',
      icon: '🎯',
      category: 'boosters',
      price: { coins: 250 },
      rarity: 'common',
      available: true,
      metadata: {
        effect: 'focus_mode',
        duration: 1800, // seconds
      },
    },
  ],
};

/**
 * Get all shop items
 */
export function getAllShopItems(): ShopItem[] {
  return Object.values(SHOP_ITEMS).flat();
}

/**
 * Get shop items by category
 */
export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS[category] || [];
}

/**
 * Get shop item by ID
 */
export function getShopItemById(itemId: string): ShopItem | undefined {
  return getAllShopItems().find(item => item.id === itemId);
}

/**
 * Check if item is available (not limited time or within time window)
 */
export function isItemAvailable(item: ShopItem): boolean {
  if (!item.available) return false;
  
  if (item.limitedTime) {
    const now = new Date();
    return now >= item.limitedTime.start && now <= item.limitedTime.end;
  }
  
  return true;
}

/**
 * Purchase an item
 */
export interface PurchaseResult {
  success: boolean;
  message: string;
  newBalance?: { gems: number; coins: number };
  item?: ShopItem;
}

export function purchaseItem(
  itemId: string,
  currentBalance: { gems: number; coins: number }
): PurchaseResult {
  const item = getShopItemById(itemId);
  
  if (!item) {
    return {
      success: false,
      message: 'Item not found',
    };
  }
  
  if (!isItemAvailable(item)) {
    return {
      success: false,
      message: 'Item is not available',
    };
  }
  
  // Check if user can afford
  if (item.price.gems && currentBalance.gems < item.price.gems) {
    return {
      success: false,
      message: 'Not enough gems',
    };
  }
  
  if (item.price.coins && currentBalance.coins < item.price.coins) {
    return {
      success: false,
      message: 'Not enough coins',
    };
  }
  
  // Calculate new balance
  const newBalance = {
    gems: currentBalance.gems - (item.price.gems || 0),
    coins: currentBalance.coins - (item.price.coins || 0),
  };
  
  return {
    success: true,
    message: `Successfully purchased ${item.name}!`,
    newBalance,
    item,
  };
}
