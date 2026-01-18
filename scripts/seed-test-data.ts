/**
 * Seed Script: Add Sample Test Data to Firestore
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase Admin credentials in .env.local');
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = getFirestore();

// Sample Test Data
const sampleTest = {
  title: 'SAT Practice Test #1',
  description: 'A comprehensive practice test covering Reading, Writing, and Math sections',
  version: '1.0.0',
  status: 'published' as const,
  isActive: true,
  sections: [
    {
      id: 'section-reading-1',
      sectionNumber: 1,
      name: 'Reading',
      subject: 'reading' as const,
      description: 'Reading Comprehension Section',
      timeLimit: 1800, // 30 minutes
      questionCount: 10,
      questionIds: [] as string[],
      order: 1,
    },
    {
      id: 'section-writing-1',
      sectionNumber: 2,
      name: 'Writing and Language',
      subject: 'writing' as const,
      description: 'Grammar and Writing Skills',
      timeLimit: 1800, // 30 minutes
      questionCount: 10,
      questionIds: [] as string[],
      order: 2,
    },
    {
      id: 'section-math-1',
      sectionNumber: 3,
      name: 'Math (No Calculator)',
      subject: 'math-no-calculator' as const,
      description: 'Math Problems - No Calculator Allowed',
      timeLimit: 1500, // 25 minutes
      questionCount: 10,
      questionIds: [] as string[],
      order: 3,
    },
  ],
  totalQuestions: 30,
  totalTimeLimit: 5100, // 85 minutes total
  difficulty: 'intermediate' as const,
  tags: ['practice', 'full-length', 'diagnostic'],
  maxScore: 30,
  passingScore: 18,
  instructions: 'This is a practice SAT test. Read each question carefully and select the best answer. You have 85 minutes total to complete all sections.',
  allowedBreaks: 1,
  breakDuration: 300, // 5 minutes
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  publishedAt: Timestamp.now(),
  createdBy: 'admin',
  totalAttempts: 0,
};

// Sample Questions
const sampleQuestions = [
  // Reading Section Questions
  {
    type: 'multiple-choice' as const,
    subject: 'reading' as const,
    difficulty: 'medium' as const,
    questionNumber: 1,
    sectionNumber: 1,
    questionText: 'What is the main idea of the passage?',
    passageText: 'The SAT is a standardized test widely used for college admissions in the United States. It was first introduced in 1926, and its name and scoring have changed several times. The test is intended to assess a student\'s readiness for college.',
    options: [
      { id: 'A', text: 'The history of standardized testing', isCorrect: false },
      { id: 'B', text: 'The purpose and evolution of the SAT', isCorrect: true },
      { id: 'C', text: 'College admission requirements', isCorrect: false },
      { id: 'D', text: 'Student preparation strategies', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The passage discusses what the SAT is, when it was introduced, and its purpose, making option B the best answer.',
    topicTags: ['reading-comprehension', 'main-idea'],
    skillTags: ['analysis', 'comprehension'],
    points: 1,
    estimatedTime: 120,
  },
  {
    type: 'multiple-choice' as const,
    subject: 'reading' as const,
    difficulty: 'easy' as const,
    questionNumber: 2,
    sectionNumber: 1,
    questionText: 'According to the passage, when was the SAT first introduced?',
    passageText: 'The SAT is a standardized test widely used for college admissions in the United States. It was first introduced in 1926, and its name and scoring have changed several times.',
    options: [
      { id: 'A', text: '1920', isCorrect: false },
      { id: 'B', text: '1926', isCorrect: true },
      { id: 'C', text: '1930', isCorrect: false },
      { id: 'D', text: '1940', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The passage explicitly states that the SAT was first introduced in 1926.',
    topicTags: ['reading-comprehension', 'detail'],
    skillTags: ['comprehension', 'detail-finding'],
    points: 1,
    estimatedTime: 60,
  },
  // Add more reading questions...
  
  // Writing Section Questions
  {
    type: 'multiple-choice' as const,
    subject: 'writing' as const,
    difficulty: 'medium' as const,
    questionNumber: 1,
    sectionNumber: 2,
    questionText: 'Choose the best word to complete the sentence: The student studied _____ for the exam.',
    options: [
      { id: 'A', text: 'diligent', isCorrect: false },
      { id: 'B', text: 'diligently', isCorrect: true },
      { id: 'C', text: 'diligence', isCorrect: false },
      { id: 'D', text: 'diligenting', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'The sentence requires an adverb to modify the verb "studied", so "diligently" is correct.',
    topicTags: ['grammar', 'parts-of-speech'],
    skillTags: ['grammar', 'word-choice'],
    points: 1,
    estimatedTime: 90,
  },
  {
    type: 'multiple-choice' as const,
    subject: 'writing' as const,
    difficulty: 'easy' as const,
    questionNumber: 2,
    sectionNumber: 2,
    questionText: 'Which sentence is grammatically correct?',
    options: [
      { id: 'A', text: 'The students was studying.', isCorrect: false },
      { id: 'B', text: 'The students were studying.', isCorrect: true },
      { id: 'C', text: 'The students is studying.', isCorrect: false },
      { id: 'D', text: 'The students be studying.', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: 'Subject-verb agreement: "students" (plural) requires "were" (plural verb).',
    topicTags: ['grammar', 'subject-verb-agreement'],
    skillTags: ['grammar', 'sentence-structure'],
    points: 1,
    estimatedTime: 60,
  },
  
  // Math Section Questions
  {
    type: 'multiple-choice' as const,
    subject: 'math-no-calculator' as const,
    difficulty: 'easy' as const,
    questionNumber: 1,
    sectionNumber: 3,
    questionText: 'What is 15 + 27?',
    options: [
      { id: 'A', text: '40', isCorrect: false },
      { id: 'B', text: '42', isCorrect: true },
      { id: 'C', text: '44', isCorrect: false },
      { id: 'D', text: '46', isCorrect: false },
    ],
    correctAnswer: 'B',
    explanation: '15 + 27 = 42',
    topicTags: ['arithmetic', 'addition'],
    skillTags: ['computation', 'basic-math'],
    points: 1,
    estimatedTime: 30,
  },
  {
    type: 'grid-in' as const,
    subject: 'math-no-calculator' as const,
    difficulty: 'medium' as const,
    questionNumber: 2,
    sectionNumber: 3,
    questionText: 'If x + 5 = 12, what is the value of x?',
    correctAnswer: 7,
    explanation: 'Subtract 5 from both sides: x = 12 - 5 = 7',
    topicTags: ['algebra', 'linear-equations'],
    skillTags: ['problem-solving', 'algebra'],
    points: 1,
    estimatedTime: 90,
  },
];

// Generate more questions to reach 30 total
function generateMoreQuestions() {
  const questions: any[] = [...sampleQuestions];
  
  // Add more reading questions (8 more to reach 10)
  for (let i = 3; i <= 10; i++) {
    questions.push({
      type: 'multiple-choice' as const,
      subject: 'reading' as const,
      difficulty: (i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
      questionNumber: i,
      sectionNumber: 1,
      questionText: `Reading question ${i}: What can be inferred from the passage?`,
      passageText: 'Sample passage text for question ' + i,
      options: [
        { id: 'A', text: 'Option A', isCorrect: i % 4 === 1 },
        { id: 'B', text: 'Option B', isCorrect: i % 4 === 2 },
        { id: 'C', text: 'Option C', isCorrect: i % 4 === 3 },
        { id: 'D', text: 'Option D', isCorrect: i % 4 === 0 },
      ],
      correctAnswer: ['A', 'B', 'C', 'D'][(i - 1) % 4],
      explanation: `Explanation for reading question ${i}`,
      topicTags: ['reading-comprehension'],
      skillTags: ['analysis'],
      points: 1,
      estimatedTime: 120,
    });
  }
  
  // Add more writing questions (8 more to reach 10)
  for (let i = 3; i <= 10; i++) {
    questions.push({
      type: 'multiple-choice' as const,
      subject: 'writing' as const,
      difficulty: (i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
      questionNumber: i,
      sectionNumber: 2,
      questionText: `Writing question ${i}: Choose the best option.`,
      options: [
        { id: 'A', text: 'Option A', isCorrect: i % 4 === 1 },
        { id: 'B', text: 'Option B', isCorrect: i % 4 === 2 },
        { id: 'C', text: 'Option C', isCorrect: i % 4 === 3 },
        { id: 'D', text: 'Option D', isCorrect: i % 4 === 0 },
      ],
      correctAnswer: ['A', 'B', 'C', 'D'][(i - 1) % 4],
      explanation: `Explanation for writing question ${i}`,
      topicTags: ['grammar'],
      skillTags: ['grammar'],
      points: 1,
      estimatedTime: 90,
    });
  }
  
  // Add more math questions (8 more to reach 10)
  for (let i = 3; i <= 10; i++) {
    const isGridIn = i % 3 === 0;
    questions.push({
      type: isGridIn ? 'grid-in' : 'multiple-choice' as const,
      subject: 'math-no-calculator' as const,
      difficulty: (i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
      questionNumber: i,
      sectionNumber: 3,
      questionText: `Math question ${i}: Solve for the answer.`,
      options: isGridIn ? undefined : [
        { id: 'A', text: 'Option A', isCorrect: i % 4 === 1 },
        { id: 'B', text: 'Option B', isCorrect: i % 4 === 2 },
        { id: 'C', text: 'Option C', isCorrect: i % 4 === 3 },
        { id: 'D', text: 'Option D', isCorrect: i % 4 === 0 },
      ],
      correctAnswer: isGridIn ? i * 2 : ['A', 'B', 'C', 'D'][(i - 1) % 4],
      explanation: `Explanation for math question ${i}`,
      topicTags: ['algebra'],
      skillTags: ['problem-solving'],
      points: 1,
      estimatedTime: 90,
    });
  }
  
  return questions;
}

async function seedData() {
  try {
    console.log('🌱 Starting to seed test data...\n');

    // Create test document
    const testRef = db.collection('tests').doc();
    const testId = testRef.id;
    
    // Generate all questions
    const allQuestions = generateMoreQuestions();
    
    // Filter questions by section
    const readingQuestions = allQuestions.filter(q => q.sectionNumber === 1);
    const writingQuestions = allQuestions.filter(q => q.sectionNumber === 2);
    const mathQuestions = allQuestions.filter(q => q.sectionNumber === 3);
    
    // Save test first (without question IDs, we'll update them later)
    await testRef.set({
      ...sampleTest,
      id: testId,
      sections: sampleTest.sections.map(s => ({ ...s, questionIds: [] })),
    });
    console.log(`✅ Created test: ${sampleTest.title} (ID: ${testId})\n`);

    // Save questions and update section question IDs
    const questionsRef = db.collection('tests').doc(testId).collection('questions');
    let questionCount = 0;
    const questionIds: string[] = [];
    
    for (const question of allQuestions) {
      const questionRef = questionsRef.doc();
      const questionData = {
        ...question,
        id: questionRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      await questionRef.set(questionData);
      questionIds.push(questionRef.id);
      questionCount++;
    }
    
    // Update test with actual question IDs
    const readingIds = questionIds.slice(0, readingQuestions.length);
    const writingIds = questionIds.slice(readingQuestions.length, readingQuestions.length + writingQuestions.length);
    const mathIds = questionIds.slice(readingQuestions.length + writingQuestions.length);
    
    // Update sections with question IDs
    const updatedSections = [
      { ...sampleTest.sections[0], questionIds: readingIds },
      { ...sampleTest.sections[1], questionIds: writingIds },
      { ...sampleTest.sections[2], questionIds: mathIds },
    ];
    
    await testRef.update({
      sections: updatedSections,
    });
    
    console.log(`✅ Created ${questionCount} questions\n`);
    console.log(`📊 Test Summary:`);
    console.log(`   - Test ID: ${testId}`);
    console.log(`   - Sections: ${sampleTest.sections.length}`);
    console.log(`   - Total Questions: ${allQuestions.length}`);
    console.log(`   - Time Limit: ${Math.floor(sampleTest.totalTimeLimit / 60)} minutes\n`);
    console.log('🎉 Test data seeded successfully!');
    console.log(`\n💡 You can now access this test in the application with ID: ${testId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
