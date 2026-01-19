/**
 * Converter: Progressive Test Format → Standard Test File Format
 * Converts progressive assessment tests to the existing test file system format
 */

import { ProgressiveTest } from './schema';
import { TestFile, TestFileMetadata, TestFileSection, TestFileQuestion } from '@/lib/test-importer/test-file-schema';

export function convertProgressiveToStandard(progressiveTest: ProgressiveTest): TestFile {
  const { metadata, questions } = progressiveTest;
  
  // Convert grade number to standard format
  const gradeToStandard: Record<number, string> = {
    0: 'K', 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th',
    6: '6th', 7: '7th', 8: '8th', 9: '9th', 10: '10th', 11: '11th', 12: '12th'
  };
  
  const standard = gradeToStandard[metadata.grade] || `${metadata.grade}th`;
  
  // Determine subject based on test (progressive tests are blended)
  // For import purposes, we'll create a "blended" subject or split into sections
  const subject = 'blended'; // Progressive tests combine reading/writing/math
  
  // Convert difficulty tier to standard difficulty
  const difficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'> = {
    'foundation': 'beginner',
    'bridge': 'intermediate',
    'intro': 'advanced',
    'simulation': 'expert'
  };
  
  const difficulty = difficultyMap[metadata.difficulty_tier] || 'intermediate';
  
  // Create metadata
  const testMetadata: TestFileMetadata = {
    title: `Grade ${standard} Progressive Test ${metadata.test_number}`,
    description: `Progressive assessment test ${metadata.test_number} for grade ${standard}. Mastery threshold: ${(metadata.mastery_threshold * 100).toFixed(0)}%`,
    standard,
    subject,
    difficulty,
    testNumber: metadata.test_number,
    tags: ['progressive', `test-${metadata.test_number}`, `grade-${standard}`],
  };
  
  // Group questions by subject into sections
  const readingQuestions = questions.filter(q => q.subject === 'reading');
  const writingQuestions = questions.filter(q => q.subject === 'writing');
  const mathQuestions = questions.filter(q => q.subject === 'math');
  
  const sections: TestFileSection[] = [];
  let sectionNumber = 1;
  
  // Reading Section
  if (readingQuestions.length > 0) {
    sections.push({
      id: `section-reading-${metadata.test_number}`,
      sectionNumber: sectionNumber++,
      name: 'Reading Comprehension',
      subject: 'reading',
      description: 'Reading comprehension and vocabulary questions',
      timeLimit: Math.ceil(readingQuestions.length * 60), // 60 seconds per question
      order: 1,
      questions: readingQuestions.map((q, index) => convertQuestion(q, index + 1)),
    });
  }
  
  // Writing Section
  if (writingQuestions.length > 0) {
    sections.push({
      id: `section-writing-${metadata.test_number}`,
      sectionNumber: sectionNumber++,
      name: 'Writing and Grammar',
      subject: 'writing',
      description: 'Grammar, sentence structure, and writing conventions',
      timeLimit: Math.ceil(writingQuestions.length * 45), // 45 seconds per question
      order: 2,
      questions: writingQuestions.map((q, index) => convertQuestion(q, index + 1)),
    });
  }
  
  // Math Section
  if (mathQuestions.length > 0) {
    sections.push({
      id: `section-math-${metadata.test_number}`,
      sectionNumber: sectionNumber++,
      name: 'Mathematics',
      subject: 'math-calculator', // Progressive tests allow calculator
      description: 'Mathematical reasoning and problem solving',
      timeLimit: Math.ceil(mathQuestions.length * 75), // 75 seconds per question
      order: 3,
      questions: mathQuestions.map((q, index) => convertQuestion(q, index + 1)),
    });
  }
  
  return {
    metadata: testMetadata,
    sections,
  };
}

function convertQuestion(progressiveQ: any, questionNumber: number): TestFileQuestion {
  // Determine question type
  let type: 'multiple-choice' | 'grid-in' | 'essay' = 'multiple-choice';
  if (progressiveQ.type.includes('grid') || progressiveQ.type === 'math_word_problem') {
    // Check if answer is numeric
    const correctAnswer = progressiveQ.options?.find((opt: any) => opt.correct);
    if (correctAnswer && !isNaN(parseFloat(correctAnswer.text))) {
      type = 'grid-in';
    }
  }
  
  // Convert options
  const options = progressiveQ.options?.map((opt: any) => ({
    id: opt.id,
    text: opt.text,
    isCorrect: opt.correct || false,
  })) || [];
  
  // Get correct answer
  const correctOption = options.find((opt: any) => opt.isCorrect);
  const correctAnswer = correctOption 
    ? (type === 'grid-in' && !isNaN(parseFloat(correctOption.text)) 
        ? parseFloat(correctOption.text) 
        : correctOption.id)
    : 'A';
  
  // Determine subject
  let subject: 'reading' | 'writing' | 'math-calculator' | 'math-no-calculator' = 'reading';
  if (progressiveQ.subject === 'math') {
    subject = 'math-calculator';
  } else if (progressiveQ.subject === 'writing') {
    subject = 'writing';
  }
  
  return {
    id: progressiveQ.question_id,
    questionNumber,
    type,
    subject,
    difficulty: progressiveQ.difficulty,
    questionText: progressiveQ.stem,
    passageText: progressiveQ.passage,
    options: type === 'multiple-choice' ? options : undefined,
    correctAnswer,
    explanation: progressiveQ.explanation || 'No explanation provided',
    topicTags: progressiveQ.spiral_sequence?.concept_id ? [progressiveQ.spiral_sequence.concept_id] : [],
    skillTags: progressiveQ.standards_alignment || [],
    points: 1,
    estimatedTime: progressiveQ.time_estimate_seconds || 60,
  };
}
