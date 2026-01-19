/**
 * Generate Progressive Tests - Batch Generation
 * Generates tests efficiently with realistic question templates
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ProgressiveTest, generateTestId, generateQuestionId, getMasteryGate } from '@/lib/test-system/schema';
import { getConceptsForTest } from '@/lib/test-system/spiral-curriculum';
import { convertProgressiveToStandard } from '@/lib/test-system/progressive-to-standard-converter';

// Enhanced question templates with realistic content
const QUESTION_BANK = {
  reading: {
    easy: [
      {
        passage: 'The library is a wonderful place to visit. It has thousands of books about many different topics. You can read stories, learn about science, or discover history.',
        stem: 'What is the main idea of this passage?',
        options: ['Libraries have computers', 'Libraries are great places with many resources', 'You can read stories at libraries', 'Libraries are quiet places'],
        correct: 1,
        explanation: 'The main idea is that libraries are great places with many resources.',
      },
      {
        passage: 'Dogs and cats are both popular pets. Dogs need daily walks and lots of attention. Cats are more independent.',
        stem: 'How are dogs and cats different?',
        options: ['Dogs need more attention than cats', 'Cats are not popular pets', 'Dogs cannot be left alone', 'Cats don\'t make good companions'],
        correct: 0,
        explanation: 'Dogs need more attention than cats, as stated in the passage.',
      },
    ],
    medium: [
      {
        passage: 'The ancient castle stood on the hill for hundreds of years. Many visitors came to see its old walls and towers.',
        stem: 'What does the word "ancient" mean?',
        options: ['Very old', 'Very new', 'Very large', 'Very beautiful'],
        correct: 0,
        explanation: 'The context clues indicate that "ancient" means very old.',
      },
    ],
  },
  math: {
    easy: [
      { stem: 'What is 7 × 8?', options: ['54', '56', '63', '64'], correct: 1, explanation: '7 × 8 = 56' },
      { stem: 'What is 48 ÷ 6?', options: ['6', '7', '8', '9'], correct: 2, explanation: '48 ÷ 6 = 8' },
      { stem: 'What is 3/4 + 1/4?', options: ['4/8', '1', '4/4', '2/4'], correct: 1, explanation: '3/4 + 1/4 = 4/4 = 1' },
    ],
    medium: [
      { stem: 'A recipe uses 3/4 cup of sugar. If you double it, how much sugar?', options: ['6/4 cups', '1 1/2 cups', '3/8 cups', '6/8 cups'], correct: 1, explanation: 'Doubling 3/4 = 6/4 = 1 1/2' },
      { stem: 'A rectangle is 5 inches long and 3 inches wide. What is its area?', options: ['8 square inches', '15 square inches', '16 square inches', '30 square inches'], correct: 1, explanation: 'Area = 5 × 3 = 15 square inches' },
    ],
  },
  grammar: {
    easy: [
      { stem: 'Which sentence uses commas correctly?', options: ['I need to buy apples, bananas, and oranges.', 'I need to buy apples, bananas and oranges.', 'I need, to buy apples bananas, and oranges.', 'I need to buy, apples bananas, and oranges.'], correct: 0, explanation: 'Commas should separate each item in a list.' },
      { stem: 'Which sentence is complete?', options: ['Running in the park.', 'The dog running in the park.', 'The dog is running in the park.', 'The dog running.'], correct: 2, explanation: 'A complete sentence needs a subject and predicate.' },
    ],
  },
};

function getQuestionTemplate(grade: number, testNumber: number, questionIndex: number, subject: 'reading' | 'math' | 'grammar'): any {
  const difficulty = testNumber <= 15 ? 'easy' : testNumber <= 35 ? 'medium' : 'hard';
  const subjectBank = QUESTION_BANK[subject];
  const bank = (difficulty === 'easy' && 'easy' in subjectBank) 
    ? subjectBank.easy 
    : (difficulty === 'medium' && 'medium' in subjectBank)
      ? subjectBank.medium
      : subjectBank.easy;
  return bank[questionIndex % bank.length];
}

async function generateTest(grade: number, testNumber: number): Promise<ProgressiveTest> {
  const testId = generateTestId(grade, testNumber);
  const masteryGate = getMasteryGate(grade, testNumber);
  const difficulty = testNumber <= 15 ? 'easy' : testNumber <= 35 ? 'medium' : 'hard';
  
  // Grade-specific ratios
  const ratios: Record<number, { rw: number; m: number }> = {
    0: { rw: 12, m: 8 }, 1: { rw: 12, m: 8 }, 2: { rw: 12, m: 8 },
    3: { rw: 11, m: 9 }, 4: { rw: 11, m: 9 }, 5: { rw: 11, m: 9 },
    6: { rw: 10, m: 10 }, 7: { rw: 10, m: 10 }, 8: { rw: 10, m: 10 },
    9: { rw: 10, m: 10 }, 10: { rw: 10, m: 10 }, 11: { rw: 10, m: 10 }, 12: { rw: 10, m: 10 },
  };
  
  const config = ratios[grade] || ratios[6];
  const questions = [];
  let qNum = 1;
  
  // Reading/Writing questions
  for (let i = 0; i < config.rw; i++) {
    const isGrammar = i % 3 === 2;
    const template = getQuestionTemplate(grade, testNumber, i, isGrammar ? 'grammar' : 'reading');
    const questionId = generateQuestionId(testId, qNum++);
    
    questions.push({
      question_id: questionId,
      type: (isGrammar ? 'grammar' : 'reading_comprehension') as any,
      sub_type: isGrammar ? 'sentence_structure' : 'main_idea',
      difficulty,
      bloom_level: testNumber <= 15 ? 2 : testNumber <= 30 ? 3 : 4,
      passage: template.passage,
      stem: template.stem,
      options: template.options.map((text: string, idx: number) => ({
        id: String.fromCharCode(65 + idx),
        text,
        correct: idx === template.correct,
        distractor_type: idx !== template.correct ? (idx < template.correct ? 'too_specific' : 'too_broad') : undefined,
      })),
      explanation: template.explanation,
      standards_alignment: [`CCSS.GRADE.${grade}`],
      time_estimate_seconds: 60,
      subject: isGrammar ? 'writing' : 'reading',
      section: 1,
    });
  }
  
  // Math questions
  for (let i = 0; i < config.m; i++) {
    const template = getQuestionTemplate(grade, testNumber, i, 'math');
    const questionId = generateQuestionId(testId, qNum++);
    
    questions.push({
      question_id: questionId,
      type: (i % 2 === 0 ? 'math_procedural' : 'math_word_problem') as any,
      sub_type: 'fractions',
      difficulty,
      bloom_level: testNumber <= 15 ? 2 : testNumber <= 30 ? 3 : 4,
      stem: template.stem,
      options: template.options.map((text: string, idx: number) => ({
        id: String.fromCharCode(65 + idx),
        text,
        correct: idx === template.correct,
        distractor_type: idx !== template.correct ? 'calculation_error' : undefined,
      })),
      explanation: template.explanation,
      standards_alignment: [`CCSS.MATH.GRADE.${grade}`],
      time_estimate_seconds: 75,
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
      difficulty_tier: grade <= 2 ? 'foundation' : grade <= 5 ? 'bridge' : grade <= 8 ? 'intro' : 'simulation',
    },
    reading_writing_count: config.rw,
    math_count: config.m,
    total_questions: 20,
    questions,
  };
}

async function main() {
  console.log('🚀 Generating Progressive Tests for Import');
  console.log('='.repeat(60));
  
  const standardDir = join(process.cwd(), 'tests');
  let total = 0;
  
  // Generate for grades 4-12 (most commonly used)
  for (let grade = 4; grade <= 12; grade++) {
    const gradeLabel = `${grade}th`;
    const gradeDir = join(standardDir, gradeLabel, 'progressive');
    
    if (!existsSync(gradeDir)) {
      await mkdir(gradeDir, { recursive: true });
    }
    
    console.log(`\n📚 Generating Grade ${gradeLabel}...`);
    
    for (let testNum = 1; testNum <= 50; testNum++) {
      const progressiveTest = await generateTest(grade, testNum);
      const standardTest = convertProgressiveToStandard(progressiveTest);
      
      const fileName = `test-${testNum.toString().padStart(3, '0')}.json`;
      await writeFile(join(gradeDir, fileName), JSON.stringify(standardTest, null, 2));
      
      total++;
      if (testNum % 10 === 0) {
        console.log(`  ✓ ${testNum}/50`);
      }
    }
    
    console.log(`  ✅ Grade ${gradeLabel}: 50 tests ready for import`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Generated ${total} tests (${total * 20} questions)`);
  console.log(`📁 Location: tests/{4th-12th}/progressive/test-{001-050}.json`);
  console.log('\n💡 Next: Go to Admin Dashboard → Test Management → Scan & Import');
}

if (require.main === module) {
  main().catch(console.error);
}
