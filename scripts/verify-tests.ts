/**
 * Verify Generated Test Files
 * Checks structure, calculations, and performance
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateTestFile } from '@/lib/test-importer/test-file-schema';

interface VerificationResult {
  totalTests: number;
  validTests: number;
  invalidTests: number;
  errors: Array<{ file: string; errors: string[] }>;
  statistics: {
    byStandard: Record<string, number>;
    byWeek: Record<string, number>;
    bySubject: Record<string, number>;
    totalQuestions: number;
    totalSections: number;
    averageQuestionsPerTest: number;
    averageTimePerTest: number;
  };
}

function verifyAllTests(): VerificationResult {
  const testsDir = path.join(process.cwd(), 'tests');
  const result: VerificationResult = {
    totalTests: 0,
    validTests: 0,
    invalidTests: 0,
    errors: [],
    statistics: {
      byStandard: {},
      byWeek: {},
      bySubject: {},
      totalQuestions: 0,
      totalSections: 0,
      averageQuestionsPerTest: 0,
      averageTimePerTest: 0,
    },
  };

  if (!fs.existsSync(testsDir)) {
    console.error('❌ Tests directory does not exist!');
    return result;
  }

  // Scan all test files
  const standards = ['9th', '10th', '11th', '12th'];
  let totalTime = 0;

  for (const standard of standards) {
    const standardDir = path.join(testsDir, standard);
    if (!fs.existsSync(standardDir)) continue;

    result.statistics.byStandard[standard] = 0;

    const weeks = fs.readdirSync(standardDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const week of weeks) {
      if (!result.statistics.byWeek[week]) {
        result.statistics.byWeek[week] = 0;
      }

      const weekDir = path.join(standardDir, week);
      const subjects = fs.readdirSync(weekDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const subject of subjects) {
        if (!result.statistics.bySubject[subject]) {
          result.statistics.bySubject[subject] = 0;
        }

        const testFile = path.join(weekDir, subject, 'test.json');
        if (!fs.existsSync(testFile)) continue;

        result.totalTests++;
        result.statistics.byStandard[standard]++;
        result.statistics.byWeek[week]++;
        result.statistics.bySubject[subject]++;

        try {
          const fileContent = fs.readFileSync(testFile, 'utf-8');
          const testData = JSON.parse(fileContent);

          // Validate structure
          const validation = validateTestFile(testData);
          if (!validation.valid) {
            result.invalidTests++;
            result.errors.push({
              file: `${standard}/${week}/${subject}/test.json`,
              errors: validation.errors,
            });
            continue;
          }

          result.validTests++;

          // Calculate statistics
          let testQuestions = 0;
          let testTime = 0;

          for (const section of testData.sections) {
            result.statistics.totalSections++;
            testQuestions += section.questions?.length || 0;
            testTime += section.timeLimit || 0;
          }

          result.statistics.totalQuestions += testQuestions;
          totalTime += testTime;

          // Verify calculations
          const metadata = testData.metadata;
          if (metadata.standard !== standard) {
            result.errors.push({
              file: `${standard}/${week}/${subject}/test.json`,
              errors: [`Standard mismatch: expected ${standard}, got ${metadata.standard}`],
            });
          }

          if (metadata.week !== week) {
            result.errors.push({
              file: `${standard}/${week}/${subject}/test.json`,
              errors: [`Week mismatch: expected ${week}, got ${metadata.week}`],
            });
          }

          if (metadata.subject !== subject) {
            result.errors.push({
              file: `${standard}/${week}/${subject}/test.json`,
              errors: [`Subject mismatch: expected ${subject}, got ${metadata.subject}`],
            });
          }

          // Verify question correctness
          for (const section of testData.sections) {
            for (const question of section.questions || []) {
              if (question.type === 'multiple-choice') {
                if (!question.options || question.options.length < 2) {
                  result.errors.push({
                    file: `${standard}/${week}/${subject}/test.json`,
                    errors: [`Question ${question.id}: Invalid options for multiple-choice`],
                  });
                } else {
                  const correctOptions = question.options.filter((opt: any) => opt.isCorrect);
                  if (correctOptions.length !== 1) {
                    result.errors.push({
                      file: `${standard}/${week}/${subject}/test.json`,
                      errors: [`Question ${question.id}: Expected exactly 1 correct option, found ${correctOptions.length}`],
                    });
                  } else {
                    // Verify correctAnswer matches isCorrect
                    const correctOption = correctOptions[0];
                    if (question.correctAnswer !== correctOption.id) {
                      result.errors.push({
                        file: `${standard}/${week}/${subject}/test.json`,
                        errors: [`Question ${question.id}: correctAnswer (${question.correctAnswer}) doesn't match isCorrect option (${correctOption.id})`],
                      });
                    }
                  }
                }
              }

              // Verify points are positive
              if (question.points <= 0) {
                result.errors.push({
                  file: `${standard}/${week}/${subject}/test.json`,
                  errors: [`Question ${question.id}: Points must be positive, got ${question.points}`],
                });
              }

              // Verify estimatedTime is positive
              if (question.estimatedTime <= 0) {
                result.errors.push({
                  file: `${standard}/${week}/${subject}/test.json`,
                  errors: [`Question ${question.id}: estimatedTime must be positive, got ${question.estimatedTime}`],
                });
              }
            }
          }

        } catch (error: any) {
          result.invalidTests++;
          result.errors.push({
            file: `${standard}/${week}/${subject}/test.json`,
            errors: [`Parse error: ${error.message}`],
          });
        }
      }
    }
  }

  // Calculate averages
  if (result.totalTests > 0) {
    result.statistics.averageQuestionsPerTest = Math.round(
      result.statistics.totalQuestions / result.totalTests
    );
    result.statistics.averageTimePerTest = Math.round(
      totalTime / result.totalTests
    );
  }

  return result;
}

// Run verification
console.log('🔍 Verifying generated test files...\n');
const result = verifyAllTests();

// Print results
console.log('📊 VERIFICATION RESULTS\n');
console.log(`Total Tests: ${result.totalTests}`);
console.log(`✅ Valid: ${result.validTests}`);
console.log(`❌ Invalid: ${result.invalidTests}`);
console.log(`\n📈 STATISTICS\n`);
console.log(`Total Questions: ${result.statistics.totalQuestions}`);
console.log(`Total Sections: ${result.statistics.totalSections}`);
console.log(`Average Questions per Test: ${result.statistics.averageQuestionsPerTest}`);
console.log(`Average Time per Test: ${Math.round(result.statistics.averageTimePerTest / 60)} minutes`);

console.log(`\n📚 BY STANDARD:`);
Object.entries(result.statistics.byStandard).forEach(([standard, count]) => {
  console.log(`   ${standard}: ${count} tests`);
});

console.log(`\n📅 BY WEEK:`);
Object.entries(result.statistics.byWeek)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([week, count]) => {
    console.log(`   ${week}: ${count} tests`);
  });

console.log(`\n📖 BY SUBJECT:`);
Object.entries(result.statistics.bySubject).forEach(([subject, count]) => {
  console.log(`   ${subject}: ${count} tests`);
});

if (result.errors.length > 0) {
  console.log(`\n❌ ERRORS FOUND (${result.errors.length} files):\n`);
  result.errors.slice(0, 10).forEach((error) => {
    console.log(`   ${error.file}:`);
    error.errors.forEach((err) => {
      console.log(`     - ${err}`);
    });
  });
  if (result.errors.length > 10) {
    console.log(`   ... and ${result.errors.length - 10} more errors`);
  }
} else {
  console.log(`\n✅ ALL TESTS VALIDATED SUCCESSFULLY!`);
}

console.log(`\n🎯 SUMMARY:`);
console.log(`   Success Rate: ${Math.round((result.validTests / result.totalTests) * 100)}%`);
console.log(`   Total Test Files: ${result.totalTests}`);
console.log(`   Total Questions: ${result.statistics.totalQuestions}`);
console.log(`   Coverage: ${Object.keys(result.statistics.byStandard).length} standards × ${Object.keys(result.statistics.byWeek).length} weeks × ${Object.keys(result.statistics.bySubject).length} subjects`);
