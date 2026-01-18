/**
 * Comprehensive validation functions for test data
 * Ensures data integrity and follows international standards
 */

import {
  Test,
  Question,
  Section,
  TestAttempt,
  StudentAnswer,
  ValidationResult,
  ValidationError,
  QuestionType,
  Subject,
  Difficulty,
  TestStatus,
  TestDifficulty,
} from '@/lib/types/test';

// ============================================================================
// QUESTION VALIDATION
// ============================================================================

export function validateQuestion(question: Partial<Question>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!question.id || question.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Question ID is required',
      code: 'REQUIRED',
    });
  }

  if (!question.type || !['multiple-choice', 'grid-in', 'essay'].includes(question.type)) {
    errors.push({
      field: 'type',
      message: 'Valid question type is required (multiple-choice, grid-in, or essay)',
      code: 'INVALID_TYPE',
    });
  }

  if (!question.subject || !['reading', 'writing', 'math-calculator', 'math-no-calculator'].includes(question.subject)) {
    errors.push({
      field: 'subject',
      message: 'Valid subject is required',
      code: 'INVALID_SUBJECT',
    });
  }

  if (!question.questionText || question.questionText.trim() === '') {
    errors.push({
      field: 'questionText',
      message: 'Question text is required',
      code: 'REQUIRED',
    });
  }

  // Validate question text length
  if (question.questionText && question.questionText.length > 5000) {
    errors.push({
      field: 'questionText',
      message: 'Question text must be 5000 characters or less',
      code: 'MAX_LENGTH',
    });
  }

  // Multiple-choice validation
  if (question.type === 'multiple-choice') {
    if (!question.options || question.options.length < 2) {
      errors.push({
        field: 'options',
        message: 'Multiple-choice questions must have at least 2 options',
        code: 'INSUFFICIENT_OPTIONS',
      });
    }

    if (question.options && question.options.length > 5) {
      errors.push({
        field: 'options',
        message: 'Multiple-choice questions cannot have more than 5 options',
        code: 'TOO_MANY_OPTIONS',
      });
    }

    if (question.options) {
      const correctCount = question.options.filter((opt) => opt.isCorrect).length;
      if (correctCount !== 1) {
        errors.push({
          field: 'options',
          message: 'Multiple-choice questions must have exactly one correct answer',
          code: 'INVALID_CORRECT_ANSWER_COUNT',
        });
      }

      // Validate option IDs are unique
      const optionIds = question.options.map((opt) => opt.id);
      const uniqueIds = new Set(optionIds);
      if (optionIds.length !== uniqueIds.size) {
        errors.push({
          field: 'options',
          message: 'Option IDs must be unique',
          code: 'DUPLICATE_OPTION_IDS',
        });
      }
    }
  }

  // Grid-in validation
  if (question.type === 'grid-in') {
    if (question.correctAnswer === undefined || question.correctAnswer === null) {
      errors.push({
        field: 'correctAnswer',
        message: 'Grid-in questions must have a numeric correct answer',
        code: 'REQUIRED',
      });
    } else {
      const numAnswer = typeof question.correctAnswer === 'string' 
        ? parseFloat(question.correctAnswer) 
        : question.correctAnswer;
      if (isNaN(numAnswer)) {
        errors.push({
          field: 'correctAnswer',
          message: 'Grid-in correct answer must be a valid number',
          code: 'INVALID_NUMBER',
        });
      }
    }
  }

  // Validate correct answer exists
  if (question.correctAnswer === undefined || question.correctAnswer === null) {
    errors.push({
      field: 'correctAnswer',
      message: 'Correct answer is required',
      code: 'REQUIRED',
    });
  }

  // Validate explanation
  if (!question.explanation || question.explanation.trim() === '') {
    errors.push({
      field: 'explanation',
      message: 'Explanation is required',
      code: 'REQUIRED',
    });
  }

  // Validate points
  if (question.points !== undefined && (question.points < 0 || question.points > 10)) {
    errors.push({
      field: 'points',
      message: 'Points must be between 0 and 10',
      code: 'INVALID_RANGE',
    });
  }

  // Validate estimated time
  if (question.estimatedTime !== undefined && question.estimatedTime < 0) {
    errors.push({
      field: 'estimatedTime',
      message: 'Estimated time cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SECTION VALIDATION
// ============================================================================

export function validateSection(section: Partial<Section>, questions?: Question[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!section.id || section.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Section ID is required',
      code: 'REQUIRED',
    });
  }

  if (!section.name || section.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Section name is required',
      code: 'REQUIRED',
    });
  }

  if (!section.subject) {
    errors.push({
      field: 'subject',
      message: 'Subject is required',
      code: 'REQUIRED',
    });
  }

  // Validate time limit
  if (section.timeLimit === undefined || section.timeLimit <= 0) {
    errors.push({
      field: 'timeLimit',
      message: 'Time limit must be greater than 0',
      code: 'INVALID_VALUE',
    });
  }

  if (section.timeLimit && section.timeLimit > 3600) {
    errors.push({
      field: 'timeLimit',
      message: 'Time limit cannot exceed 3600 seconds (1 hour)',
      code: 'MAX_VALUE',
    });
  }

  // Validate question count
  if (section.questionCount === undefined || section.questionCount <= 0) {
    errors.push({
      field: 'questionCount',
      message: 'Question count must be greater than 0',
      code: 'INVALID_VALUE',
    });
  }

  // Validate question IDs match question count
  if (section.questionIds && section.questionCount !== section.questionIds.length) {
    errors.push({
      field: 'questionIds',
      message: `Question IDs count (${section.questionIds.length}) must match questionCount (${section.questionCount})`,
      code: 'COUNT_MISMATCH',
    });
  }

  // Validate questions exist and match section subject
  if (questions && section.questionIds) {
    const sectionQuestions = questions.filter((q) => section.questionIds?.includes(q.id));
    if (sectionQuestions.length !== section.questionIds.length) {
      errors.push({
        field: 'questionIds',
        message: 'Some question IDs do not exist in the questions array',
        code: 'INVALID_QUESTION_IDS',
      });
    }

    // Check all questions match section subject
    const mismatchedSubjects = sectionQuestions.filter((q) => q.subject !== section.subject);
    if (mismatchedSubjects.length > 0) {
      errors.push({
        field: 'questionIds',
        message: 'Some questions do not match the section subject',
        code: 'SUBJECT_MISMATCH',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// TEST VALIDATION
// ============================================================================

export function validateTest(test: Partial<Test>, questions?: Question[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!test.title || test.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Test title is required',
      code: 'REQUIRED',
    });
  }

  if (!test.description || test.description.trim() === '') {
    errors.push({
      field: 'description',
      message: 'Test description is required',
      code: 'REQUIRED',
    });
  }

  if (!test.status || !['draft', 'published', 'archived'].includes(test.status)) {
    errors.push({
      field: 'status',
      message: 'Valid status is required (draft, published, or archived)',
      code: 'INVALID_STATUS',
    });
  }

  // Validate sections
  if (!test.sections || test.sections.length === 0) {
    errors.push({
      field: 'sections',
      message: 'Test must have at least one section',
      code: 'REQUIRED',
    });
  } else {
    // Validate each section
    test.sections.forEach((section, index) => {
      const sectionValidation = validateSection(section, questions);
      if (!sectionValidation.isValid) {
        sectionValidation.errors.forEach((error) => {
          errors.push({
            field: `sections[${index}].${error.field}`,
            message: error.message,
            code: error.code,
          });
        });
      }
    });

    // Validate section numbers are unique and sequential
    const sectionNumbers = test.sections.map((s) => s.sectionNumber).sort((a, b) => a - b);
    const expectedNumbers = Array.from({ length: test.sections.length }, (_, i) => i + 1);
    if (JSON.stringify(sectionNumbers) !== JSON.stringify(expectedNumbers)) {
      errors.push({
        field: 'sections',
        message: 'Section numbers must be sequential starting from 1',
        code: 'INVALID_SECTION_NUMBERS',
      });
    }
  }

  // Validate total questions matches sum of section questions
  if (test.sections && test.totalQuestions !== undefined) {
    const calculatedTotal = test.sections.reduce((sum, section) => sum + section.questionCount, 0);
    if (test.totalQuestions !== calculatedTotal) {
      errors.push({
        field: 'totalQuestions',
        message: `Total questions (${test.totalQuestions}) must match sum of section questions (${calculatedTotal})`,
        code: 'COUNT_MISMATCH',
      });
    }
  }

  // Validate total time limit
  if (test.totalTimeLimit !== undefined && test.totalTimeLimit <= 0) {
    errors.push({
      field: 'totalTimeLimit',
      message: 'Total time limit must be greater than 0',
      code: 'INVALID_VALUE',
    });
  }

  // Validate total time matches sum of section times (with breaks)
  if (test.sections && test.totalTimeLimit !== undefined) {
    const sectionTimeSum = test.sections.reduce((sum, section) => sum + section.timeLimit, 0);
    const breakTime = (test.allowedBreaks || 0) * (test.breakDuration || 0);
    const calculatedTotal = sectionTimeSum + breakTime;
    
    // Allow some tolerance (within 60 seconds)
    if (Math.abs(test.totalTimeLimit - calculatedTotal) > 60) {
      errors.push({
        field: 'totalTimeLimit',
        message: `Total time limit should approximately match sum of section times plus breaks`,
        code: 'TIME_MISMATCH',
      });
    }
  }

  // Validate difficulty
  if (test.difficulty && !['beginner', 'intermediate', 'advanced', 'expert'].includes(test.difficulty)) {
    errors.push({
      field: 'difficulty',
      message: 'Invalid difficulty level',
      code: 'INVALID_DIFFICULTY',
    });
  }

  // Validate max score
  if (test.maxScore !== undefined && test.maxScore <= 0) {
    errors.push({
      field: 'maxScore',
      message: 'Max score must be greater than 0',
      code: 'INVALID_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// STUDENT ANSWER VALIDATION
// ============================================================================

export function validateStudentAnswer(answer: Partial<StudentAnswer>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!answer.questionId || answer.questionId.trim() === '') {
    errors.push({
      field: 'questionId',
      message: 'Question ID is required',
      code: 'REQUIRED',
    });
  }

  if (answer.timeSpent === undefined || answer.timeSpent < 0) {
    errors.push({
      field: 'timeSpent',
      message: 'Time spent must be a non-negative number',
      code: 'INVALID_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// TEST ATTEMPT VALIDATION
// ============================================================================

export function validateTestAttempt(attempt: Partial<TestAttempt>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!attempt.testId || attempt.testId.trim() === '') {
    errors.push({
      field: 'testId',
      message: 'Test ID is required',
      code: 'REQUIRED',
    });
  }

  if (!attempt.userId || attempt.userId.trim() === '') {
    errors.push({
      field: 'userId',
      message: 'User ID is required',
      code: 'REQUIRED',
    });
  }

  if (!attempt.status || !['not-started', 'in-progress', 'paused', 'submitted', 'expired', 'abandoned'].includes(attempt.status)) {
    errors.push({
      field: 'status',
      message: 'Valid status is required',
      code: 'INVALID_STATUS',
    });
  }

  if (!attempt.startedAt) {
    errors.push({
      field: 'startedAt',
      message: 'Start time is required',
      code: 'REQUIRED',
    });
  }

  if (attempt.timeRemaining !== undefined && attempt.timeRemaining < 0) {
    errors.push({
      field: 'timeRemaining',
      message: 'Time remaining cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
