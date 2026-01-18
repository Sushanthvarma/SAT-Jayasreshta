/**
 * Test File Schema for JSON Import
 * Validates and structures test files from the tests/ directory
 */

export interface TestFileMetadata {
  title: string;
  description: string;
  standard: string; // "9th", "10th", "11th", "12th"
  week: string; // "week-1", "week-2", etc.
  subject: string; // "reading", "writing", "math", etc.
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  version?: string;
  tags?: string[];
}

export interface TestFileQuestionOption {
  id: string; // A, B, C, D
  text: string;
  isCorrect: boolean;
}

export interface TestFileQuestion {
  id: string;
  questionNumber: number;
  type: 'multiple-choice' | 'grid-in' | 'essay';
  subject: 'reading' | 'writing' | 'math-calculator' | 'math-no-calculator';
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  passageText?: string;
  imageUrl?: string;
  options?: TestFileQuestionOption[];
  correctAnswer: string | number;
  explanation: string;
  topicTags: string[];
  skillTags: string[];
  points: number;
  estimatedTime: number;
}

export interface TestFileSection {
  id: string;
  sectionNumber: number;
  name: string;
  subject: 'reading' | 'writing' | 'math-calculator' | 'math-no-calculator';
  description?: string;
  timeLimit: number; // in seconds
  order: number;
  questions: TestFileQuestion[];
}

export interface TestFile {
  metadata: TestFileMetadata;
  sections: TestFileSection[];
}

/**
 * Validate test file structure
 */
export function validateTestFile(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate metadata
  if (!data.metadata) {
    errors.push('Missing metadata');
  } else {
    const { metadata } = data;
    if (!metadata.title) errors.push('Missing metadata.title');
    if (!metadata.description) errors.push('Missing metadata.description');
    if (!metadata.standard) errors.push('Missing metadata.standard');
    if (!metadata.week) errors.push('Missing metadata.week');
    if (!metadata.subject) errors.push('Missing metadata.subject');
    if (!metadata.difficulty) errors.push('Missing metadata.difficulty');
    
    // Validate standard format
    if (metadata.standard && !['9th', '10th', '11th', '12th'].includes(metadata.standard)) {
      errors.push(`Invalid standard: ${metadata.standard}. Must be 9th, 10th, 11th, or 12th`);
    }
    
    // Validate week format
    if (metadata.week && !/^week-\d+$/.test(metadata.week)) {
      errors.push(`Invalid week format: ${metadata.week}. Must be week-1, week-2, etc.`);
    }
  }

  // Validate sections
  if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
    errors.push('Missing or empty sections array');
  } else {
    data.sections.forEach((section: any, index: number) => {
      if (!section.id) errors.push(`Section ${index + 1}: Missing id`);
      if (!section.name) errors.push(`Section ${index + 1}: Missing name`);
      if (typeof section.timeLimit !== 'number') errors.push(`Section ${index + 1}: Invalid timeLimit`);
      if (!section.questions || !Array.isArray(section.questions)) {
        errors.push(`Section ${index + 1}: Missing or invalid questions array`);
      } else {
        section.questions.forEach((question: any, qIndex: number) => {
          if (!question.id) errors.push(`Section ${index + 1}, Question ${qIndex + 1}: Missing id`);
          if (!question.questionText) errors.push(`Section ${index + 1}, Question ${qIndex + 1}: Missing questionText`);
          if (!question.correctAnswer) errors.push(`Section ${index + 1}, Question ${qIndex + 1}: Missing correctAnswer`);
          if (question.type === 'multiple-choice' && (!question.options || question.options.length < 2)) {
            errors.push(`Section ${index + 1}, Question ${qIndex + 1}: Invalid options for multiple-choice`);
          }
          if (question.type === 'multiple-choice' && question.options) {
            const hasCorrect = question.options.some((opt: any) => opt.isCorrect);
            if (!hasCorrect) {
              errors.push(`Section ${index + 1}, Question ${qIndex + 1}: No correct option marked`);
            }
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
