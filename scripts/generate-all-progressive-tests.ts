/**
 * Generate All Progressive Tests
 * Creates 650 tests (K-12, 50 tests per grade) with realistic questions
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ProgressiveTest, generateTestId, generateQuestionId, getMasteryGate } from '@/lib/test-system/schema';
import { getConceptsForTest } from '@/lib/test-system/spiral-curriculum';
import { generateQuestion } from '@/lib/test-system/question-generator';
import { convertProgressiveToStandard } from '@/lib/test-system/progressive-to-standard-converter';

const GRADE_CONFIGS: Record<number, { readingWritingRatio: number; mathRatio: number }> = {
  0: { readingWritingRatio: 0.6, mathRatio: 0.4 }, // K
  1: { readingWritingRatio: 0.6, mathRatio: 0.4 },
  2: { readingWritingRatio: 0.6, mathRatio: 0.4 },
  3: { readingWritingRatio: 0.55, mathRatio: 0.45 },
  4: { readingWritingRatio: 0.55, mathRatio: 0.45 },
  5: { readingWritingRatio: 0.55, mathRatio: 0.45 },
  6: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  7: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  8: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  9: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  10: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  11: { readingWritingRatio: 0.5, mathRatio: 0.5 },
  12: { readingWritingRatio: 0.5, mathRatio: 0.5 },
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

function getDifficultyTier(grade: number): 'foundation' | 'bridge' | 'intro' | 'simulation' {
  if (grade <= 2) return 'foundation';
  if (grade >= 3 && grade <= 5) return 'bridge';
  if (grade >= 6 && grade <= 8) return 'intro';
  return 'simulation';
}

async function generateFullTest(grade: number, testNumber: number): Promise<ProgressiveTest> {
  const config = GRADE_CONFIGS[grade] || GRADE_CONFIGS[6];
  const testId = generateTestId(grade, testNumber);
  const masteryGate = getMasteryGate(grade, testNumber);
  const difficulty = getDifficultyForTest(grade, testNumber);
  const difficultyTier = getDifficultyTier(grade);
  
  const readingWritingCount = Math.round(20 * config.readingWritingRatio);
  const mathCount = 20 - readingWritingCount;
  
  // Get concepts for this test
  const concepts = getConceptsForTest(grade, testNumber);
  
  const questions = [];
  let questionNum = 1;
  
  // Generate Reading/Writing questions
  for (let i = 0; i < readingWritingCount; i++) {
    const isWriting = i % 3 === 2; // Every 3rd question is writing
    const type = isWriting 
      ? 'grammar' as const
      : i % 2 === 0 
        ? 'reading_comprehension' as const 
        : 'vocabulary' as const;
    
    const conceptId = concepts[i % concepts.length];
    const question = generateQuestion(grade, testNumber, questionNum++, type, difficulty, conceptId);
    
    // Add spiral sequence if concept matches
    if (conceptId) {
      question.spiral_sequence = {
        concept_id: conceptId,
        appearance_number: Math.floor(testNumber / 10) + 1,
        complexity_level: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4,
      };
    }
    
    questions.push(question);
  }
  
  // Generate Math questions
  for (let i = 0; i < mathCount; i++) {
    const type = i % 3 === 0 
      ? 'math_procedural' as const
      : i % 3 === 1
        ? 'math_word_problem' as const
        : 'math_geometry' as const;
    
    const conceptId = concepts.find(c => c.includes('fraction') || c.includes('math') || c.includes('geometry')) || concepts[0];
    const question = generateQuestion(grade, testNumber, questionNum++, type, difficulty, conceptId);
    
    if (conceptId) {
      question.spiral_sequence = {
        concept_id: conceptId,
        appearance_number: Math.floor(testNumber / 10) + 1,
        complexity_level: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4,
      };
    }
    
    questions.push(question);
  }
  
  return {
    metadata: {
      test_id: testId,
      grade,
      test_number: testNumber,
      estimated_time_minutes: 12,
      mastery_threshold: masteryGate.threshold_percentage,
      difficulty_tier: difficultyTier,
    },
    reading_writing_count: readingWritingCount,
    math_count: mathCount,
    total_questions: 20,
    questions,
  };
}

async function generateAllTests() {
  console.log('🚀 Starting Progressive Test Generation');
  console.log('='.repeat(60));
  
  const progressiveDir = join(process.cwd(), 'content');
  const standardDir = join(process.cwd(), 'tests');
  
  let totalGenerated = 0;
  
  // Generate for all grades K-12
  for (let grade = 0; grade <= 12; grade++) {
    const gradeLabel = grade === 0 ? 'K' : grade.toString();
    console.log(`\n📚 Generating Grade ${gradeLabel}...`);
    
    // Progressive format directory
    const progressiveGradeDir = join(progressiveDir, `grade-${gradeLabel}`);
    if (!existsSync(progressiveGradeDir)) {
      await mkdir(progressiveGradeDir, { recursive: true });
    }
    
    // Standard format directory (for import)
    const standardGradeDir = join(standardDir, `${gradeLabel === 'K' ? 'K' : gradeLabel}th`, 'progressive');
    if (!existsSync(standardGradeDir)) {
      await mkdir(standardGradeDir, { recursive: true });
    }
    
    for (let testNumber = 1; testNumber <= 50; testNumber++) {
      // Generate progressive format
      const progressiveTest = await generateFullTest(grade, testNumber);
      const progressiveFileName = `test-${testNumber.toString().padStart(3, '0')}.json`;
      const progressivePath = join(progressiveGradeDir, progressiveFileName);
      await writeFile(progressivePath, JSON.stringify(progressiveTest, null, 2));
      
      // Convert to standard format for import
      const standardTest = convertProgressiveToStandard(progressiveTest);
      const standardFileName = `test-${testNumber.toString().padStart(3, '0')}.json`;
      const standardPath = join(standardGradeDir, standardFileName);
      await writeFile(standardPath, JSON.stringify(standardTest, null, 2));
      
      totalGenerated++;
      
      if (testNumber % 10 === 0) {
        console.log(`  ✓ Generated ${testNumber}/50 tests`);
      }
    }
    
    console.log(`  ✅ Grade ${gradeLabel}: 50 tests generated (progressive + standard format)`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests generated successfully!');
  console.log(`📊 Total: ${totalGenerated} tests (${totalGenerated * 2} files - progressive + standard)`);
  console.log(`📝 Total: ${totalGenerated * 20} questions`);
  console.log('\n📁 Files created in:');
  console.log(`   - Progressive format: content/grade-{K-12}/test-{001-050}.json`);
  console.log(`   - Standard format: tests/{K-12th}/progressive/test-{001-050}.json`);
  console.log('\n💡 Next steps:');
  console.log('   1. Go to Admin Dashboard → Test Management');
  console.log('   2. Click "Scan Tests" to see all generated tests');
  console.log('   3. Select and import the tests you want');
}

if (require.main === module) {
  generateAllTests().catch(console.error);
}

export { generateFullTest, generateAllTests };
