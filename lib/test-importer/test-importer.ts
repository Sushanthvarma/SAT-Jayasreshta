/**
 * Test Importer - Imports test files into Firestore
 * Converts file-based tests to Firestore structure
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { Test, Question, Section } from '@/lib/types/test';
import { ScannedTestFile } from './file-scanner';
import { validateTestFile } from './test-file-schema';

/**
 * Generate unique test ID from metadata
 */
function generateTestId(metadata: { standard: string; week: string; subject: string }): string {
  return `${metadata.standard}-${metadata.week}-${metadata.subject}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Convert test file to Firestore Test structure
 */
export function convertTestFileToFirestore(
  scannedFile: ScannedTestFile,
  createdBy: string
): { test: Omit<Test, 'id'>; questions: Question[] } {
  const { testData } = scannedFile;
  const { metadata, sections } = testData;

  // Calculate totals
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const totalTimeLimit = sections.reduce((sum, section) => sum + section.timeLimit, 0);

  // Convert sections
  const firestoreSections: Section[] = sections.map((section, index) => ({
    id: section.id,
    sectionNumber: section.sectionNumber || index + 1,
    name: section.name,
    subject: section.subject,
    description: section.description,
    timeLimit: section.timeLimit,
    questionCount: section.questions.length,
    questionIds: [], // Will be populated after questions are created
    order: section.order || index + 1,
  }));

  // Convert questions
  const questions: Question[] = [];
  sections.forEach((section, sectionIndex) => {
    section.questions.forEach((q, questionIndex) => {
      // Build question object, only including fields that have values
      const question: any = {
        id: q.id,
        type: q.type,
        subject: q.subject,
        difficulty: q.difficulty,
        questionNumber: q.questionNumber || questionIndex + 1,
        sectionNumber: section.sectionNumber || sectionIndex + 1,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        topicTags: q.topicTags || [],
        skillTags: q.skillTags || [],
        points: q.points || 1,
        estimatedTime: q.estimatedTime || 60,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Only add optional fields if they have actual values (not undefined/null)
      if (q.passageText !== undefined && q.passageText !== null && q.passageText !== '') {
        question.passageText = q.passageText;
      }
      
      if (q.imageUrl !== undefined && q.imageUrl !== null && q.imageUrl !== '') {
        question.imageUrl = q.imageUrl;
      }
      
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        question.options = q.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        }));
      }
      
      questions.push(question as Question);
    });
  });

  // Create test document
  const test: Omit<Test, 'id'> = {
    title: metadata.title,
    description: metadata.description,
    version: metadata.version || '1.0.0',
    status: 'draft', // Will be published by admin
    isActive: false, // Admin can activate
    sections: firestoreSections,
    totalQuestions,
    totalTimeLimit,
    difficulty: metadata.difficulty,
    tags: [
      metadata.standard,
      metadata.week,
      metadata.subject,
      ...(metadata.tags || []),
    ],
    maxScore: totalQuestions, // 1 point per question
    instructions: `Complete all sections within the time limits.`,
    allowedBreaks: 0,
    breakDuration: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy,
    totalAttempts: 0,
  };

  return { test, questions };
}

/**
 * Import a single test file into Firestore
 */
export async function importTestFile(
  scannedFile: ScannedTestFile,
  createdBy: string,
  options: {
    publish?: boolean;
    activate?: boolean;
    overwrite?: boolean;
  } = {}
): Promise<{ testId: string; imported: boolean; message: string }> {
  // Validate file
  if (!scannedFile.isValid) {
    return {
      testId: '',
      imported: false,
      message: `Invalid test file: ${scannedFile.errors.join(', ')}`,
    };
  }

  const testId = generateTestId(scannedFile.testData.metadata);
  console.log(`   Generated test ID: ${testId}`);
  const testRef = adminDb.collection('tests').doc(testId);

  // Check if test already exists
  const existingTest = await testRef.get();
  if (existingTest.exists && !options.overwrite) {
    console.log(`   ⚠️  Test already exists (ID: ${testId}), overwrite=false`);
    return {
      testId,
      imported: false,
      message: `Test already exists. Use overwrite option to replace.`,
    };
  }
  
  if (existingTest.exists && options.overwrite) {
    console.log(`   🔄 Overwriting existing test (ID: ${testId})`);
  }

  // Convert and import
  console.log(`   Converting test file to Firestore format...`);
  const { test, questions } = convertTestFileToFirestore(scannedFile, createdBy);
  console.log(`   Converted: ${questions.length} questions, ${test.sections.length} sections`);

  // Update status based on options
  if (options.publish) {
    test.status = 'published';
    test.publishedAt = Timestamp.now();
    console.log(`   ✅ Will publish test`);
  }
  if (options.activate) {
    test.isActive = true;
    console.log(`   ✅ Will activate test`);
  }

  // Save test document
  console.log(`   Saving test document to Firestore...`);
  try {
    await testRef.set(test);
    console.log(`   ✅ Test document saved`);
  } catch (error: any) {
    console.error(`   ❌ Error saving test document:`, error);
    throw new Error(`Failed to save test document: ${error.message}`);
  }

  // Delete existing questions if overwriting
  if (options.overwrite && existingTest.exists) {
    const existingQuestions = await testRef.collection('questions').get();
    const deletePromises = existingQuestions.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
  }

  // Save questions
  console.log(`   Saving ${questions.length} questions...`);
  const batch = adminDb.batch();
  questions.forEach((question) => {
    const questionRef = testRef.collection('questions').doc(question.id);
    batch.set(questionRef, question);
    
    // Update section questionIds
    const section = test.sections.find(s => s.sectionNumber === question.sectionNumber);
    if (section) {
      if (!section.questionIds.includes(question.id)) {
        section.questionIds.push(question.id);
      }
    }
  });

  // Update sections with questionIds
  console.log(`   Updating sections with question IDs...`);
  try {
    await testRef.update({
      sections: test.sections,
    });
    console.log(`   ✅ Sections updated`);
  } catch (error: any) {
    console.error(`   ❌ Error updating sections:`, error);
    throw new Error(`Failed to update sections: ${error.message}`);
  }

  try {
    await batch.commit();
    console.log(`   ✅ Questions saved to Firestore`);
  } catch (error: any) {
    console.error(`   ❌ Error committing questions batch:`, error);
    throw new Error(`Failed to save questions: ${error.message}`);
  }

  return {
    testId,
    imported: true,
    message: `Successfully imported test: ${test.title}`,
  };
}

/**
 * Import multiple test files
 */
export async function importTestFiles(
  scannedFiles: ScannedTestFile[],
  createdBy: string,
  options: {
    publish?: boolean;
    activate?: boolean;
    overwrite?: boolean;
    skipInvalid?: boolean;
  } = {}
): Promise<{
  total: number;
  imported: number;
  failed: number;
  results: Array<{ file: string; success: boolean; message: string; testId?: string }>;
}> {
  const results: Array<{ file: string; success: boolean; message: string; testId?: string }> = [];
  let imported = 0;
  let failed = 0;

  for (const scannedFile of scannedFiles) {
    if (!scannedFile.isValid && !options.skipInvalid) {
      console.log(`❌ Skipping invalid file: ${scannedFile.relativePath}`, scannedFile.errors);
      results.push({
        file: scannedFile.relativePath,
        success: false,
        message: `Invalid: ${scannedFile.errors.join(', ')}`,
      });
      failed++;
      continue;
    }

    if (!scannedFile.isValid && options.skipInvalid) {
      console.log(`⏭️  Skipping invalid file (skipInvalid=true): ${scannedFile.relativePath}`);
      continue; // Skip without adding to results
    }

    try {
      console.log(`📥 Importing: ${scannedFile.relativePath}`);
      const result = await importTestFile(scannedFile, createdBy, options);
      console.log(`   Result: ${result.imported ? '✅' : '❌'} ${result.message}`);
      
      results.push({
        file: scannedFile.relativePath,
        success: result.imported,
        message: result.message,
        testId: result.testId,
      });

      if (result.imported) {
        imported++;
      } else {
        failed++;
        console.log(`   Failed reason: ${result.message}`);
      }
    } catch (error: any) {
      console.error(`❌ Error importing ${scannedFile.relativePath}:`, error);
      results.push({
        file: scannedFile.relativePath,
        success: false,
        message: `Import failed: ${error.message || String(error)}`,
      });
      failed++;
    }
  }

  return {
    total: scannedFiles.length,
    imported,
    failed,
    results,
  };
}
