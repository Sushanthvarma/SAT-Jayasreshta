/**
 * Test Scoring Calculator
 * Implements SAT-style scoring with section-based calculations
 */

import {
  Test,
  Question,
  TestAttempt,
  TestResult,
  SectionScore,
  TopicPerformance,
  SkillPerformance,
  StudentAnswer,
} from '@/lib/types/test';

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate score for a single question
 */
export function scoreQuestion(
  question: Question,
  studentAnswer: StudentAnswer | null
): {
  isCorrect: boolean;
  points: number;
} {
  if (!studentAnswer || studentAnswer.answer === null || studentAnswer.skipped) {
    return {
      isCorrect: false,
      points: 0,
    };
  }
  
  // Compare student answer with correct answer
  // PRODUCTION-GRADE: Normalize both answers to same format before comparison
  // Handles: student answer as number (0-3) vs correct answer as string ("A"-"D") or number
  let isCorrect = false;
  
  if (question.type === 'multiple-choice') {
    // Normalize student answer to option ID format ("A", "B", "C", "D")
    let studentAnswerNormalized: string;
    if (typeof studentAnswer.answer === 'number') {
      // Convert number index (0-3) to letter ("A"-"D")
      studentAnswerNormalized = String.fromCharCode(65 + studentAnswer.answer); // 0->A, 1->B, 2->C, 3->D
    } else if (typeof studentAnswer.answer === 'string') {
      // Already a string, normalize it
      const trimmed = studentAnswer.answer.trim().toUpperCase();
      // If it's a number string like "0", "1", convert to letter
      const numValue = parseInt(trimmed, 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 3) {
        studentAnswerNormalized = String.fromCharCode(65 + numValue);
      } else {
        studentAnswerNormalized = trimmed;
      }
    } else {
      isCorrect = false;
      return { isCorrect, points: 0 };
    }
    
    // Normalize correct answer to option ID format
    let correctAnswerNormalized: string;
    if (typeof question.correctAnswer === 'number') {
      // Convert number index to letter
      correctAnswerNormalized = String.fromCharCode(65 + question.correctAnswer);
    } else if (typeof question.correctAnswer === 'string') {
      const trimmed = question.correctAnswer.trim().toUpperCase();
      // If it's a number string, convert to letter
      const numValue = parseInt(trimmed, 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 3) {
        correctAnswerNormalized = String.fromCharCode(65 + numValue);
      } else {
        correctAnswerNormalized = trimmed;
      }
    } else {
      // Fallback: try to find correct option from options array
      if (question.options && question.options.length > 0) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption) {
          correctAnswerNormalized = correctOption.id.trim().toUpperCase();
        } else {
          isCorrect = false;
          return { isCorrect, points: 0 };
        }
      } else {
        isCorrect = false;
        return { isCorrect, points: 0 };
      }
    }
    
    // Compare normalized answers
    isCorrect = studentAnswerNormalized === correctAnswerNormalized;
    
    // Additional validation: if options array exists, verify the answer matches the correct option ID
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption && correctOption.id.trim().toUpperCase() !== correctAnswerNormalized) {
        // If correctAnswer field doesn't match the marked correct option, use the option
        correctAnswerNormalized = correctOption.id.trim().toUpperCase();
        isCorrect = studentAnswerNormalized === correctAnswerNormalized;
      }
    }
  } else if (question.type === 'grid-in') {
    // For grid-in, compare numeric values (with tolerance for floating point)
    const studentNum = typeof studentAnswer.answer === 'string' 
      ? parseFloat(studentAnswer.answer) 
      : typeof studentAnswer.answer === 'number'
      ? studentAnswer.answer
      : NaN;
    const correctNum = typeof question.correctAnswer === 'string'
      ? parseFloat(question.correctAnswer)
      : typeof question.correctAnswer === 'number'
      ? question.correctAnswer
      : NaN;
    
    if (isNaN(studentNum) || isNaN(correctNum)) {
      isCorrect = false;
    } else {
      // Allow small tolerance for floating point errors
      isCorrect = Math.abs(studentNum - correctNum) < 0.001;
    }
  }
  
  return {
    isCorrect,
    points: isCorrect ? question.points : 0,
  };
}

/**
 * Calculate section score
 */
export function calculateSectionScore(
  sectionId: string,
  sectionNumber: number,
  sectionName: string,
  subject: string,
  questions: Question[],
  answers: StudentAnswer[]
): SectionScore {
  let questionsAnswered = 0;
  let questionsCorrect = 0;
  let questionsIncorrect = 0;
  let questionsSkipped = 0;
  let rawScore = 0;
  let totalTimeSpent = 0;
  
  // Count by difficulty
  let easyCorrect = 0;
  let easyTotal = 0;
  let mediumCorrect = 0;
  let mediumTotal = 0;
  let hardCorrect = 0;
  let hardTotal = 0;
  
  // Process each question
  questions.forEach((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    
    if (!answer || answer.skipped || answer.answer === null) {
      questionsSkipped++;
      return;
    }
    
    questionsAnswered++;
    totalTimeSpent += answer.timeSpent || 0;
    
    const score = scoreQuestion(question, answer);
    
    if (score.isCorrect) {
      questionsCorrect++;
      rawScore += score.points;
    } else {
      questionsIncorrect++;
    }
    
    // Track by difficulty
    if (question.difficulty === 'easy') {
      easyTotal++;
      if (score.isCorrect) easyCorrect++;
    } else if (question.difficulty === 'medium') {
      mediumTotal++;
      if (score.isCorrect) mediumCorrect++;
    } else if (question.difficulty === 'hard') {
      hardTotal++;
      if (score.isCorrect) hardCorrect++;
    }
  });
  
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;
  const averageTimePerQuestion = questionsAnswered > 0 
    ? totalTimeSpent / questionsAnswered 
    : 0;
  
  return {
    sectionId,
    sectionNumber,
    sectionName,
    subject: subject as any,
    questionsAnswered,
    questionsCorrect,
    questionsIncorrect,
    questionsSkipped,
    rawScore,
    maxScore,
    percentage,
    timeSpent: totalTimeSpent,
    averageTimePerQuestion,
    easyCorrect,
    easyTotal,
    mediumCorrect,
    mediumTotal,
    hardCorrect,
    hardTotal,
  };
}

/**
 * Calculate topic and skill performance
 */
export function calculatePerformanceMetrics(
  questions: Question[],
  answers: StudentAnswer[]
): {
  topicPerformance: TopicPerformance[];
  skillPerformance: SkillPerformance[];
} {
  const topicMap = new Map<string, { attempted: number; correct: number }>();
  const skillMap = new Map<string, { attempted: number; correct: number }>();
  
  questions.forEach((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    
    if (!answer || answer.skipped || answer.answer === null) {
      return; // Skip unanswered questions
    }
    
    const score = scoreQuestion(question, answer);
    
    // Track topics
    question.topicTags.forEach((topic) => {
      const current = topicMap.get(topic) || { attempted: 0, correct: 0 };
      current.attempted++;
      if (score.isCorrect) current.correct++;
      topicMap.set(topic, current);
    });
    
    // Track skills
    question.skillTags.forEach((skill) => {
      const current = skillMap.get(skill) || { attempted: 0, correct: 0 };
      current.attempted++;
      if (score.isCorrect) current.correct++;
      skillMap.set(skill, current);
    });
  });
  
  const topicPerformance: TopicPerformance[] = Array.from(topicMap.entries()).map(
    ([topic, stats]) => ({
      topic,
      questionsAttempted: stats.attempted,
      questionsCorrect: stats.correct,
      accuracy: stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0,
    })
  );
  
  const skillPerformance: SkillPerformance[] = Array.from(skillMap.entries()).map(
    ([skill, stats]) => ({
      skill,
      questionsAttempted: stats.attempted,
      questionsCorrect: stats.correct,
      accuracy: stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0,
    })
  );
  
  return {
    topicPerformance: topicPerformance.sort((a, b) => b.accuracy - a.accuracy),
    skillPerformance: skillPerformance.sort((a, b) => b.accuracy - a.accuracy),
  };
}

/**
 * Calculate overall test result
 */
export async function calculateTestResult(
  test: Test,
  attempt: TestAttempt,
  questions: Question[]
): Promise<Omit<TestResult, 'id' | 'createdAt'>> {
  // Calculate section scores
  const sectionScores: SectionScore[] = test.sections.map((section) => {
    const sectionQuestions = questions.filter(
      (q) => q.sectionNumber === section.sectionNumber
    );
    const sectionAnswers = attempt.answers.filter(
      (a) => sectionQuestions.some((q) => q.id === a.questionId)
    );
    
    return calculateSectionScore(
      section.id,
      section.sectionNumber,
      section.name,
      section.subject,
      sectionQuestions,
      sectionAnswers
    );
  });
  
  // Calculate overall metrics
  const totalScore = sectionScores.reduce((sum, section) => sum + section.rawScore, 0);
  const maxScore = sectionScores.reduce((sum, section) => sum + section.maxScore, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  
  const questionsAnswered = sectionScores.reduce(
    (sum, section) => sum + section.questionsAnswered,
    0
  );
  const questionsCorrect = sectionScores.reduce(
    (sum, section) => sum + section.questionsCorrect,
    0
  );
  const questionsIncorrect = sectionScores.reduce(
    (sum, section) => sum + section.questionsIncorrect,
    0
  );
  const questionsSkipped = sectionScores.reduce(
    (sum, section) => sum + section.questionsSkipped,
    0
  );
  
  const totalTimeSpent = attempt.totalTimeSpent || 0;
  const averageTimePerQuestion = questionsAnswered > 0 
    ? totalTimeSpent / questionsAnswered 
    : 0;
  const timeEfficiency = totalTimeSpent > 0 ? (totalScore / totalTimeSpent) * 60 : 0; // Score per minute
  
  // Calculate performance metrics
  const { topicPerformance, skillPerformance } = calculatePerformanceMetrics(
    questions,
    attempt.answers
  );
  
  // Identify strengths and weaknesses
  const strengths = topicPerformance
    .filter((t) => t.accuracy >= 80 && t.questionsAttempted >= 3)
    .map((t) => t.topic)
    .slice(0, 5);
  
  const weaknesses = topicPerformance
    .filter((t) => t.accuracy < 60 && t.questionsAttempted >= 2)
    .map((t) => t.topic)
    .slice(0, 5);
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (weaknesses.length > 0) {
    recommendations.push(
      `Focus on improving: ${weaknesses.slice(0, 3).join(', ')}`
    );
  }
  if (questionsSkipped > questions.length * 0.1) {
    recommendations.push('Try to answer all questions - even guessing can help!');
  }
  if (averageTimePerQuestion > 120) {
    recommendations.push('Practice time management to improve your pacing');
  }
  if (strengths.length > 0) {
    recommendations.push(
      `Great work on: ${strengths.slice(0, 2).join(', ')}!`
    );
  }
  
  // Calculate SAT-style scaled score (simplified version)
  // Real SAT uses complex equating - this is a simplified approximation
  const scaledScore = Math.round(400 + (percentage / 100) * 1200);
  
  return {
    testId: test.id,
    testTitle: test.title,
    attemptId: attempt.id,
    userId: attempt.userId,
    userName: '', // Will be filled by API
    userEmail: '', // Will be filled by API
    totalScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    scaledScore,
    sectionScores,
    questionsAnswered,
    questionsCorrect,
    questionsIncorrect,
    questionsSkipped,
    topicPerformance,
    skillPerformance,
    totalTimeSpent,
    averageTimePerQuestion: Math.round(averageTimePerQuestion * 100) / 100,
    timeEfficiency: Math.round(timeEfficiency * 100) / 100,
    completedAt: attempt.submittedAt || new Date(),
    submittedAt: attempt.submittedAt || new Date(),
    strengths,
    weaknesses,
    recommendations,
  };
}
