/**
 * Answer Normalization Utility
 * 
 * CRITICAL: All answer comparisons must use this utility to ensure consistency.
 * Handles various input formats (string, number, array) and normalizes them
 * to a consistent format for comparison.
 */

/**
 * Normalizes answers to lowercase, trimmed strings
 * Handles various input formats consistently
 * 
 * @param answer - Answer in any format (string, number, array, null, undefined)
 * @returns Normalized string for comparison
 */
export function normalizeAnswer(answer: any): string {
  if (answer === null || answer === undefined) {
    return '';
  }
  
  // Handle array format (take first element)
  if (Array.isArray(answer)) {
    if (answer.length === 0) return '';
    answer = answer[0];
  }
  
  // Convert to string, trim whitespace, lowercase
  let normalized = String(answer).trim().toLowerCase();
  
  // Handle option IDs: "A", "B", "C", "D" or "option a", "option b", etc.
  // Extract just the letter if it's in format like "Option A" or "A"
  const letterMatch = normalized.match(/\b([a-d])\b/);
  if (letterMatch) {
    normalized = letterMatch[1];
  }
  
  // Handle numeric strings: "0", "1", "2", "3" (for multiple choice indices)
  // Convert to letter equivalent: 0->a, 1->b, 2->c, 3->d
  const numMatch = normalized.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 0 && num <= 3) {
      normalized = String.fromCharCode(97 + num); // 0->a, 1->b, 2->c, 3->d
    }
  }
  
  return normalized;
}

/**
 * Compares two answers after normalization
 * 
 * @param userAnswer - User's selected answer
 * @param correctAnswer - Correct answer from question
 * @returns true if answers match after normalization
 */
export function answersMatch(userAnswer: any, correctAnswer: any): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  // Exact match after normalization
  if (normalizedUser === normalizedCorrect) {
    return true;
  }
  
  // Handle numeric answers (for grid-in questions)
  // Compare as numbers if both are numeric
  const userNum = parseFloat(normalizedUser);
  const correctNum = parseFloat(normalizedCorrect);
  
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    // Allow small tolerance for floating point errors
    return Math.abs(userNum - correctNum) < 0.001;
  }
  
  return false;
}

/**
 * Normalizes answer for storage (ensures consistent format in database)
 * 
 * @param answer - Answer to normalize
 * @param questionType - Type of question ('multiple-choice' | 'grid-in')
 * @returns Normalized answer ready for storage
 */
export function normalizeAnswerForStorage(
  answer: any,
  questionType: 'multiple-choice' | 'grid-in'
): string | number {
  if (answer === null || answer === undefined) {
    return '';
  }
  
  if (questionType === 'multiple-choice') {
    // For multiple choice, normalize to letter (a, b, c, d)
    const normalized = normalizeAnswer(answer);
    if (normalized.length === 1 && /^[a-d]$/.test(normalized)) {
      return normalized.toUpperCase(); // Store as uppercase
    }
    return '';
  } else if (questionType === 'grid-in') {
    // For grid-in, normalize to number
    const num = typeof answer === 'string' ? parseFloat(answer) : answer;
    if (!isNaN(num) && typeof num === 'number') {
      return num;
    }
    return '';
  }
  
  return '';
}
