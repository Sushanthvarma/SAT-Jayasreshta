/**
 * Progressive Assessment System - JSON Schema Definitions
 * SAT-aligned test structure for K-12 grades
 */

export interface TestMetadata {
  test_id: string;
  grade: number;
  test_number: number;
  estimated_time_minutes: number;
  mastery_threshold: number;
  difficulty_tier: 'foundation' | 'bridge' | 'intro' | 'simulation';
  adaptive_recommendation?: {
    min_score_for_next: number;
    recommended_starting_test?: number;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
  correct: boolean;
  distractor_type?: 'too_specific' | 'too_broad' | 'opposite_meaning' | 'calculation_error' | 'conceptual_misunderstanding' | 'partial_answer';
}

export interface SpiralSequence {
  concept_id: string;
  previous_appearance?: string;
  next_appearance?: string;
  appearance_number: number;
  complexity_level: number;
}

export interface Question {
  question_id: string;
  type: 'reading_comprehension' | 'vocabulary' | 'grammar' | 'math_procedural' | 'math_word_problem' | 'math_geometry' | 'math_data_analysis' | 'evidence_based' | 'rhetorical_synthesis';
  sub_type?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  bloom_level: number;
  passage?: string;
  stem: string;
  options: QuestionOption[];
  explanation: string;
  standards_alignment: string[];
  spiral_sequence?: SpiralSequence;
  time_estimate_seconds: number;
  prerequisite_skills?: string[];
  subject: 'reading' | 'writing' | 'math';
  section?: number;
}

export interface ProgressiveTest {
  metadata: TestMetadata;
  questions: Question[];
  reading_writing_count: number;
  math_count: number;
  total_questions: number;
}

export interface SpiralCurriculumMap {
  concept_id: string;
  concept_name: string;
  grade_range: string;
  appearances: Array<{
    test_number: number;
    complexity_level: number;
    question_type: string;
  }>;
}

export interface MasteryGate {
  test_range: string;
  threshold_percentage: number;
  minimum_correct: number;
  allows_retry: boolean;
  max_retries?: number;
}

export const MASTERY_GATES: Record<string, MasteryGate> = {
  'k-2-tests-1-15': {
    test_range: '1-15',
    threshold_percentage: 0.60,
    minimum_correct: 12,
    allows_retry: true,
    max_retries: 3,
  },
  'k-2-tests-16-35': {
    test_range: '16-35',
    threshold_percentage: 0.65,
    minimum_correct: 13,
    allows_retry: true,
    max_retries: 3,
  },
  'k-2-tests-36-50': {
    test_range: '36-50',
    threshold_percentage: 0.70,
    minimum_correct: 14,
    allows_retry: true,
    max_retries: 3,
  },
  '3-5-tests-1-25': {
    test_range: '1-25',
    threshold_percentage: 0.70,
    minimum_correct: 14,
    allows_retry: true,
    max_retries: 3,
  },
  '3-5-tests-26-50': {
    test_range: '26-50',
    threshold_percentage: 0.75,
    minimum_correct: 15,
    allows_retry: true,
    max_retries: 3,
  },
  '6-8-tests-1-50': {
    test_range: '1-50',
    threshold_percentage: 0.75,
    minimum_correct: 15,
    allows_retry: true,
    max_retries: 2,
  },
  '9-12-tests-1-10': {
    test_range: '1-10',
    threshold_percentage: 0.70,
    minimum_correct: 14,
    allows_retry: true,
    max_retries: 2,
  },
  '9-12-tests-11-25': {
    test_range: '11-25',
    threshold_percentage: 0.75,
    minimum_correct: 15,
    allows_retry: true,
    max_retries: 2,
  },
  '9-12-tests-26-40': {
    test_range: '26-40',
    threshold_percentage: 0.80,
    minimum_correct: 16,
    allows_retry: true,
    max_retries: 1,
  },
  '9-12-tests-41-50': {
    test_range: '41-50',
    threshold_percentage: 0.80,
    minimum_correct: 16,
    allows_retry: true,
    max_retries: 1,
  },
};

export function getMasteryGate(grade: number, testNumber: number): MasteryGate {
  if (grade >= 0 && grade <= 2) {
    if (testNumber <= 15) return MASTERY_GATES['k-2-tests-1-15'];
    if (testNumber <= 35) return MASTERY_GATES['k-2-tests-16-35'];
    return MASTERY_GATES['k-2-tests-36-50'];
  }
  if (grade >= 3 && grade <= 5) {
    if (testNumber <= 25) return MASTERY_GATES['3-5-tests-1-25'];
    return MASTERY_GATES['3-5-tests-26-50'];
  }
  if (grade >= 6 && grade <= 8) {
    return MASTERY_GATES['6-8-tests-1-50'];
  }
  if (grade >= 9 && grade <= 12) {
    if (testNumber <= 10) return MASTERY_GATES['9-12-tests-1-10'];
    if (testNumber <= 25) return MASTERY_GATES['9-12-tests-11-25'];
    if (testNumber <= 40) return MASTERY_GATES['9-12-tests-26-40'];
    return MASTERY_GATES['9-12-tests-41-50'];
  }
  // Default
  return MASTERY_GATES['6-8-tests-1-50'];
}

export function generateTestId(grade: number, testNumber: number): string {
  const gradePrefix = grade === 0 ? 'K' : grade.toString();
  return `grade-${gradePrefix}-test-${testNumber.toString().padStart(3, '0')}`;
}

export function generateQuestionId(testId: string, questionNumber: number): string {
  return `${testId}-q${questionNumber.toString().padStart(2, '0')}`;
}
