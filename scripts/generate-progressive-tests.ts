/**
 * Progressive Test Generation Script
 * Generates 50 tests per grade (K-12) with spiral curriculum
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ProgressiveTest, generateTestId, generateQuestionId, getMasteryGate, Question } from '@/lib/test-system/schema';
import { CORE_CONCEPTS, getConceptsForTest } from '@/lib/test-system/spiral-curriculum';

interface TestGenerationConfig {
  grade: number;
  testNumber: number;
  difficultyTier: 'foundation' | 'bridge' | 'intro' | 'simulation';
  readingWritingRatio: number;
  mathRatio: number;
}

const GRADE_CONFIGS: Record<number, Partial<TestGenerationConfig>> = {
  0: { difficultyTier: 'foundation', readingWritingRatio: 0.6, mathRatio: 0.4 }, // K
  1: { difficultyTier: 'foundation', readingWritingRatio: 0.6, mathRatio: 0.4 },
  2: { difficultyTier: 'foundation', readingWritingRatio: 0.6, mathRatio: 0.4 },
  3: { difficultyTier: 'bridge', readingWritingRatio: 0.55, mathRatio: 0.45 },
  4: { difficultyTier: 'bridge', readingWritingRatio: 0.55, mathRatio: 0.45 },
  5: { difficultyTier: 'bridge', readingWritingRatio: 0.55, mathRatio: 0.45 },
  6: { difficultyTier: 'intro', readingWritingRatio: 0.5, mathRatio: 0.5 },
  7: { difficultyTier: 'intro', readingWritingRatio: 0.5, mathRatio: 0.5 },
  8: { difficultyTier: 'intro', readingWritingRatio: 0.5, mathRatio: 0.5 },
  9: { difficultyTier: 'simulation', readingWritingRatio: 0.5, mathRatio: 0.5 },
  10: { difficultyTier: 'simulation', readingWritingRatio: 0.5, mathRatio: 0.5 },
  11: { difficultyTier: 'simulation', readingWritingRatio: 0.5, mathRatio: 0.5 },
  12: { difficultyTier: 'simulation', readingWritingRatio: 0.5, mathRatio: 0.5 },
};

function getDifficultyForTest(grade: number, testNumber: number): 'easy' | 'medium' | 'hard' | 'expert' {
  if (grade <= 2) {
    if (testNumber <= 15) return 'easy';
    if (testNumber <= 35) return 'medium';
    return 'hard';
  }
  if (grade >= 3 && grade <= 5) {
    if (testNumber <= 12) return 'easy';
    if (testNumber <= 30) return 'medium';
    return 'hard';
  }
  if (grade >= 6 && grade <= 8) {
    if (testNumber <= 15) return 'easy';
    if (testNumber <= 35) return 'medium';
    return 'hard';
  }
  // Grades 9-12
  if (testNumber <= 10) return 'easy';
  if (testNumber <= 25) return 'medium';
  if (testNumber <= 40) return 'hard';
  return 'expert';
}

function getBloomLevel(testNumber: number): number {
  if (testNumber <= 15) return 2; // Remember/Understand
  if (testNumber <= 30) return 3; // Apply/Analyze
  if (testNumber <= 45) return 4; // Evaluate
  return 5; // Create
}

async function generateTest(grade: number, testNumber: number): Promise<ProgressiveTest> {
  const config = GRADE_CONFIGS[grade] || GRADE_CONFIGS[6];
  const testId = generateTestId(grade, testNumber);
  const masteryGate = getMasteryGate(grade, testNumber);
  const difficulty = getDifficultyForTest(grade, testNumber);
  const bloomLevel = getBloomLevel(testNumber);
  
  const readingWritingCount = Math.round(20 * (config.readingWritingRatio || 0.5));
  const mathCount = 20 - readingWritingCount;
  
  // Get concepts for this test from spiral curriculum
  const concepts = getConceptsForTest(grade, testNumber);
  
  // Generate questions (simplified - in production, use question bank templates)
  const questions: Question[] = [];
  
  // Reading/Writing questions
  for (let i = 0; i < readingWritingCount; i++) {
    const questionId = generateQuestionId(testId, i + 1);
    const questionType = i % 3 === 0 ? 'reading_comprehension' as const : i % 3 === 1 ? 'vocabulary' as const : 'grammar' as const;
    // Simplified question generation - in production, use templates
    questions.push({
      question_id: questionId,
      type: questionType,
      sub_type: 'main_idea',
      difficulty,
      bloom_level: bloomLevel,
      stem: `Sample question ${i + 1} for grade ${grade}, test ${testNumber}`,
      options: [
        { id: 'A', text: 'Option A', correct: false },
        { id: 'B', text: 'Option B', correct: true },
        { id: 'C', text: 'Option C', correct: false },
        { id: 'D', text: 'Option D', correct: false },
      ],
      explanation: 'This is a sample explanation.',
      standards_alignment: [`CCSS.GRADE.${grade}`],
      time_estimate_seconds: 60,
      subject: i % 2 === 0 ? 'reading' : 'writing',
      section: 1,
    });
  }
  
  // Math questions
  for (let i = 0; i < mathCount; i++) {
    const questionId = generateQuestionId(testId, readingWritingCount + i + 1);
    questions.push({
      question_id: questionId,
      type: 'math_procedural' as const,
      sub_type: 'fractions',
      difficulty,
      bloom_level: bloomLevel,
      stem: `Sample math question ${i + 1} for grade ${grade}, test ${testNumber}`,
      options: [
        { id: 'A', text: 'Option A', correct: false },
        { id: 'B', text: 'Option B', correct: true },
        { id: 'C', text: 'Option C', correct: false },
        { id: 'D', text: 'Option D', correct: false },
      ],
      explanation: 'This is a sample explanation.',
      standards_alignment: [`CCSS.MATH.GRADE.${grade}`],
      time_estimate_seconds: 60,
      subject: 'math',
      section: 2,
    });
  }
  
  return {
    metadata: {
      test_id: testId,
      grade,
      test_number: testNumber,
      estimated_time_minutes: 12,
      mastery_threshold: masteryGate.threshold_percentage,
      difficulty_tier: config.difficultyTier || 'bridge',
    },
    reading_writing_count: readingWritingCount,
    math_count: mathCount,
    total_questions: 20,
    questions,
  };
}

async function generateAllTestsForGrade(grade: number) {
  const gradeDir = join(process.cwd(), 'content', `grade-${grade === 0 ? 'K' : grade}`);
  
  if (!existsSync(gradeDir)) {
    await mkdir(gradeDir, { recursive: true });
  }
  
  console.log(`\n📚 Generating tests for Grade ${grade === 0 ? 'K' : grade}...`);
  
  for (let testNumber = 1; testNumber <= 50; testNumber++) {
    const test = await generateTest(grade, testNumber);
    const fileName = `test-${testNumber.toString().padStart(3, '0')}.json`;
    const filePath = join(gradeDir, fileName);
    
    await writeFile(filePath, JSON.stringify(test, null, 2));
    
    if (testNumber % 10 === 0) {
      console.log(`  ✓ Generated ${testNumber}/50 tests`);
    }
  }
  
  console.log(`  ✅ Completed Grade ${grade === 0 ? 'K' : grade}: 50 tests generated`);
}

async function main() {
  console.log('🚀 Starting Progressive Test Generation System');
  console.log('=' .repeat(60));
  
  // Generate for all grades K-12
  for (let grade = 0; grade <= 12; grade++) {
    await generateAllTestsForGrade(grade);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests generated successfully!');
  console.log(`📊 Total: ${13 * 50} tests (650 tests)`);
  console.log(`📝 Total: ${13 * 50 * 20} questions (13,000 questions)`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateTest, generateAllTestsForGrade };
