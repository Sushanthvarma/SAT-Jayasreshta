/**
 * Comprehensive TypeScript types for SAT Mock Test Platform
 * Following international standards for test structure and data models
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// QUESTION TYPES
// ============================================================================

export type QuestionType = 'multiple-choice' | 'grid-in' | 'essay';
export type Subject = 'reading' | 'writing' | 'math-calculator' | 'math-no-calculator';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string; // A, B, C, D, etc.
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  subject: Subject;
  difficulty: Difficulty;
  questionNumber: number; // Position in section (1-based)
  sectionNumber: number; // Which section this belongs to (1-based)
  
  // Question content
  questionText: string;
  passageText?: string; // For reading/writing questions
  imageUrl?: string; // For questions with diagrams/images
  
  // Answer options (for multiple-choice)
  options?: QuestionOption[];
  
  // Correct answer (for grid-in: numeric value as string)
  correctAnswer: string | number;
  
  // Explanation and learning
  explanation: string;
  topicTags: string[]; // e.g., ["algebra", "linear-equations"]
  skillTags: string[]; // e.g., ["problem-solving", "data-analysis"]
  
  // Metadata
  points: number; // Points for this question (usually 1)
  estimatedTime: number; // Estimated time in seconds
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ============================================================================
// SECTION TYPES
// ============================================================================

export interface Section {
  id: string;
  sectionNumber: number; // 1, 2, 3, etc.
  name: string; // "Reading", "Writing and Language", "Math (No Calculator)", etc.
  subject: Subject;
  description?: string;
  
  // Timing
  timeLimit: number; // Time limit in seconds
  questionCount: number; // Number of questions in this section
  
  // Questions (references or embedded)
  questionIds: string[]; // References to questions collection
  
  // Ordering
  order: number; // Display order in test
}

// ============================================================================
// TEST TYPES
// ============================================================================

export type TestStatus = 'draft' | 'published' | 'archived';
export type TestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Test {
  id: string;
  title: string;
  description: string;
  version: string; // e.g., "1.0.0"
  
  // Status and visibility
  status: TestStatus;
  isActive: boolean;
  publishedAt?: Timestamp | Date;
  
  // Test structure
  sections: Section[];
  totalQuestions: number;
  totalTimeLimit: number; // Total time in seconds
  
  // Difficulty and metadata
  difficulty: TestDifficulty;
  tags: string[]; // e.g., ["practice", "full-length", "diagnostic"]
  
  // Scoring
  maxScore: number; // Maximum possible score
  passingScore?: number; // Optional passing threshold
  
  // Instructions
  instructions: string;
  allowedBreaks: number; // Number of allowed breaks
  breakDuration: number; // Break duration in seconds
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string; // Admin user ID
  lastModifiedBy?: string;
  
  // Analytics
  totalAttempts: number;
  averageScore?: number;
  completionRate?: number; // Percentage of started tests that were completed
}

// ============================================================================
// TEST ATTEMPT TYPES (Student's active test session)
// ============================================================================

export type AttemptStatus = 'not-started' | 'in-progress' | 'paused' | 'submitted' | 'expired' | 'abandoned';

export interface StudentAnswer {
  questionId: string;
  answer: string | number | null; // Student's answer
  isCorrect?: boolean; // Calculated after submission
  timeSpent: number; // Time spent on this question in seconds
  answeredAt?: Timestamp | Date;
  skipped: boolean;
}

export interface SectionAttempt {
  sectionId: string;
  sectionNumber: number;
  status: 'not-started' | 'in-progress' | 'completed';
  startedAt?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  timeSpent: number; // Total time spent in this section (seconds)
  answers: StudentAnswer[];
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  
  // Status tracking
  status: AttemptStatus;
  startedAt: Timestamp | Date;
  submittedAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date; // Auto-submit if not completed by this time
  
  // Progress tracking
  currentSection: number; // Which section student is currently on
  sections: SectionAttempt[];
  
  // Timing
  totalTimeSpent: number; // Total time spent so far (seconds)
  timeRemaining: number; // Time remaining (seconds)
  
  // Answers
  answers: StudentAnswer[]; // All answers across all sections
  
  // Metadata
  deviceInfo?: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
  };
  ipAddress?: string; // For security/analytics
}

// ============================================================================
// TEST RESULT TYPES (Scored and analyzed results)
// ============================================================================

export interface SectionScore {
  sectionId: string;
  sectionNumber: number;
  sectionName: string;
  subject: Subject;
  
  // Scoring
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsSkipped: number;
  rawScore: number; // Raw points earned
  maxScore: number; // Maximum possible points
  percentage: number; // Percentage score
  
  // Time analysis
  timeSpent: number;
  averageTimePerQuestion: number;
  
  // Performance by difficulty
  easyCorrect: number;
  easyTotal: number;
  mediumCorrect: number;
  mediumTotal: number;
  hardCorrect: number;
  hardTotal: number;
}

export interface TopicPerformance {
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number; // Percentage
}

export interface SkillPerformance {
  skill: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number; // Percentage
}

export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  attemptId: string;
  userId: string;
  userName: string;
  userEmail: string;
  
  // Overall scoring
  totalScore: number; // Total points earned
  maxScore: number; // Maximum possible score
  percentage: number; // Overall percentage
  scaledScore?: number; // SAT-style scaled score (400-1600)
  
  // Section breakdown
  sectionScores: SectionScore[];
  
  // Detailed performance
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsSkipped: number;
  
  // Performance analysis
  topicPerformance: TopicPerformance[];
  skillPerformance: SkillPerformance[];
  
  // Timing analysis
  totalTimeSpent: number; // Total time in seconds
  averageTimePerQuestion: number;
  timeEfficiency: number; // Score per minute
  
  // Completion
  completedAt: Timestamp | Date;
  submittedAt: Timestamp | Date;
  
  // Feedback and recommendations
  strengths: string[]; // Topics/skills student did well on
  weaknesses: string[]; // Topics/skills that need improvement
  recommendations: string[]; // Suggested next steps
  
  // Metadata
  createdAt: Timestamp | Date;
}

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

export interface UserProgress {
  userId: string;
  
  // Overall statistics
  totalTestsCompleted: number;
  totalTestsAttempted: number;
  averageScore: number;
  bestScore: number;
  improvementTrend: number; // Percentage improvement over time
  
  // Subject-specific performance
  readingAverage: number;
  writingAverage: number;
  mathAverage: number;
  
  // Time statistics
  averageTimePerTest: number;
  averageTimePerQuestion: number;
  
  // Strengths and weaknesses
  strongTopics: string[];
  weakTopics: string[];
  
  // Recent activity
  lastTestDate?: Timestamp | Date;
  currentStreak: number; // Days of consecutive practice
  longestStreak: number;
  
  // Updated timestamp
  updatedAt: Timestamp | Date;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
