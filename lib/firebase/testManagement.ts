/**
 * Test Management - Standard Values
 * CRITICAL: All tests MUST use these standard values
 * This ensures filters work correctly across the platform
 */

// STANDARD difficulty values - ONLY these are allowed
export const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard'
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

// STANDARD subject values
export const SUBJECTS = {
  READING: 'Reading',
  WRITING: 'Writing',
  MATH: 'Math'
} as const;

export type Subject = typeof SUBJECTS[keyof typeof SUBJECTS];

// STANDARD grade values
export const GRADES = {
  GRADE_4: '4th Grade',
  GRADE_5: '5th Grade',
  GRADE_6: '6th Grade',
  GRADE_7: '7th Grade',
  GRADE_8: '8th Grade',
  GRADE_9: '9th Grade',
  GRADE_10: '10th Grade',
  GRADE_11: '11th Grade',
  GRADE_12: '12th Grade'
} as const;

export type Grade = typeof GRADES[keyof typeof GRADES];

/**
 * Difficulty value mapping for migration
 * Maps old values to new standard values
 */
export const DIFFICULTY_MIGRATION_MAP: Record<string, DifficultyLevel> = {
  // Old values → New standardized values
  'Basic': DIFFICULTY_LEVELS.EASY,
  'Beginner': DIFFICULTY_LEVELS.EASY,
  'Easy': DIFFICULTY_LEVELS.EASY,
  'easy': DIFFICULTY_LEVELS.EASY,
  
  'Intermediate': DIFFICULTY_LEVELS.MEDIUM,
  'intermediate': DIFFICULTY_LEVELS.MEDIUM,
  'Average': DIFFICULTY_LEVELS.MEDIUM,
  'Medium': DIFFICULTY_LEVELS.MEDIUM,
  'medium': DIFFICULTY_LEVELS.MEDIUM,
  
  'Advanced': DIFFICULTY_LEVELS.HARD,
  'advanced': DIFFICULTY_LEVELS.HARD,
  'Difficult': DIFFICULTY_LEVELS.HARD,
  'Challenging': DIFFICULTY_LEVELS.HARD,
  'Expert': DIFFICULTY_LEVELS.HARD,
  'expert': DIFFICULTY_LEVELS.HARD,
  'Hard': DIFFICULTY_LEVELS.HARD,
  'hard': DIFFICULTY_LEVELS.HARD,
};

/**
 * Normalize difficulty value to standard
 * Handles case-insensitive matching and old values
 */
export function normalizeDifficulty(value: string | undefined | null): DifficultyLevel {
  if (!value) return DIFFICULTY_LEVELS.MEDIUM; // Default
  
  const normalized = value.trim();
  
  // Check migration map first
  if (DIFFICULTY_MIGRATION_MAP[normalized]) {
    return DIFFICULTY_MIGRATION_MAP[normalized];
  }
  
  // Case-insensitive check against standard values
  const lower = normalized.toLowerCase();
  if (lower === 'easy') return DIFFICULTY_LEVELS.EASY;
  if (lower === 'medium' || lower === 'intermediate') return DIFFICULTY_LEVELS.MEDIUM;
  if (lower === 'hard' || lower === 'advanced' || lower === 'expert') return DIFFICULTY_LEVELS.HARD;
  
  // Default to Medium if unknown
  console.warn(`Unknown difficulty value: "${value}", defaulting to Medium`);
  return DIFFICULTY_LEVELS.MEDIUM;
}

/**
 * Normalize subject value to standard
 */
export function normalizeSubject(value: string | undefined | null): Subject {
  if (!value) return SUBJECTS.READING; // Default
  
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  
  if (lower.includes('reading')) return SUBJECTS.READING;
  if (lower.includes('writing')) return SUBJECTS.WRITING;
  if (lower.includes('math')) return SUBJECTS.MATH;
  
  // Default to Reading if unknown
  console.warn(`Unknown subject value: "${value}", defaulting to Reading`);
  return SUBJECTS.READING;
}

/**
 * Check if difficulty value is standard
 */
export function isStandardDifficulty(value: string): boolean {
  return Object.values(DIFFICULTY_LEVELS).includes(value as DifficultyLevel);
}

/**
 * Check if subject value is standard
 */
export function isStandardSubject(value: string): boolean {
  return Object.values(SUBJECTS).includes(value as Subject);
}
