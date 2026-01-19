/**
 * Generate 10 test papers for each grade (4th through 12th)
 * Each test has appropriate complexity based on grade level
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestQuestion {
  id: string;
  questionNumber: number;
  type: 'multiple-choice';
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  passageText?: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer: string;
  explanation: string;
  topicTags: string[];
  skillTags: string[];
  points: number;
  estimatedTime: number;
}

interface TestSection {
  id: string;
  sectionNumber: number;
  name: string;
  subject: string;
  description: string;
  timeLimit: number;
  order: number;
  questions: TestQuestion[];
}

interface TestFile {
  metadata: {
    title: string;
    description: string;
    standard: string;
    week: string;
    subject: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    version: string;
    tags: string[];
  };
  sections: TestSection[];
}

// Grade complexity mapping
const gradeComplexity: Record<string, { difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'; questionCount: number; timeLimit: number }> = {
  '4th': { difficulty: 'beginner', questionCount: 10, timeLimit: 1200 },
  '5th': { difficulty: 'beginner', questionCount: 12, timeLimit: 1500 },
  '6th': { difficulty: 'beginner', questionCount: 15, timeLimit: 1800 },
  '7th': { difficulty: 'intermediate', questionCount: 15, timeLimit: 1800 },
  '8th': { difficulty: 'intermediate', questionCount: 18, timeLimit: 2100 },
  '9th': { difficulty: 'intermediate', questionCount: 20, timeLimit: 2400 },
  '10th': { difficulty: 'advanced', questionCount: 22, timeLimit: 2700 },
  '11th': { difficulty: 'advanced', questionCount: 25, timeLimit: 3000 },
  '12th': { difficulty: 'expert', questionCount: 25, timeLimit: 3000 },
};

// Subject templates for questions
const readingQuestions = (grade: string, week: number, questionNum: number): TestQuestion[] => {
  const complexity = gradeComplexity[grade];
  const questions: TestQuestion[] = [];
  const questionCount = Math.floor(complexity.questionCount * 0.4); // 40% reading
  
  for (let i = 1; i <= questionCount; i++) {
    const difficulty = i <= questionCount * 0.3 ? 'easy' : i <= questionCount * 0.7 ? 'medium' : 'hard';
    questions.push({
      id: `q${i}`,
      questionNumber: i,
      type: 'multiple-choice',
      subject: 'reading',
      difficulty,
      questionText: `What is the main idea of the passage? (Week ${week}, Question ${i})`,
      passageText: `This is a sample reading passage for ${grade} grade students. The passage discusses various topics relevant to students at this grade level. It contains information that students need to understand and analyze to answer the questions correctly.`,
      options: [
        { id: 'A', text: 'Option A - First main point', isCorrect: false },
        { id: 'B', text: 'Option B - Correct main idea', isCorrect: true },
        { id: 'C', text: 'Option C - Supporting detail', isCorrect: false },
        { id: 'D', text: 'Option D - Minor detail', isCorrect: false },
      ],
      correctAnswer: 'B',
      explanation: `The correct answer is B because it best summarizes the main idea of the passage.`,
      topicTags: ['reading-comprehension', 'main-idea'],
      skillTags: ['analysis', 'inference'],
      points: 1,
      estimatedTime: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
    });
  }
  
  return questions;
};

const writingQuestions = (grade: string, week: number, questionNum: number): TestQuestion[] => {
  const complexity = gradeComplexity[grade];
  const questions: TestQuestion[] = [];
  const questionCount = Math.floor(complexity.questionCount * 0.3); // 30% writing
  
  for (let i = 1; i <= questionCount; i++) {
    const difficulty = i <= questionCount * 0.3 ? 'easy' : i <= questionCount * 0.7 ? 'medium' : 'hard';
    questions.push({
      id: `q${i}`,
      questionNumber: i,
      type: 'multiple-choice',
      subject: 'writing',
      difficulty,
      questionText: `Which sentence is grammatically correct? (Week ${week}, Question ${i})`,
      passageText: `Read the following sentences and identify the one that is grammatically correct.`,
      options: [
        { id: 'A', text: 'The students was studying.', isCorrect: false },
        { id: 'B', text: 'The students were studying.', isCorrect: true },
        { id: 'C', text: 'The students is studying.', isCorrect: false },
        { id: 'D', text: 'The students be studying.', isCorrect: false },
      ],
      correctAnswer: 'B',
      explanation: `The correct answer is B because "students" is plural and requires the plural verb "were".`,
      topicTags: ['grammar', 'subject-verb-agreement'],
      skillTags: ['grammar', 'syntax'],
      points: 1,
      estimatedTime: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
    });
  }
  
  return questions;
};

const mathQuestions = (grade: string, week: number, questionNum: number): TestQuestion[] => {
  const complexity = gradeComplexity[grade];
  const questions: TestQuestion[] = [];
  const questionCount = Math.floor(complexity.questionCount * 0.3); // 30% math
  
  for (let i = 1; i <= questionCount; i++) {
    const difficulty = i <= questionCount * 0.3 ? 'easy' : i <= questionCount * 0.7 ? 'medium' : 'hard';
    const gradeNum = parseInt(grade);
    let questionText = '';
    let options: Array<{ id: string; text: string; isCorrect: boolean }> = [];
    
    if (gradeNum <= 6) {
      // Elementary math
      const num1 = Math.floor(Math.random() * 50) + 1;
      const num2 = Math.floor(Math.random() * 50) + 1;
      const answer = num1 + num2;
      questionText = `What is ${num1} + ${num2}?`;
      options = [
        { id: 'A', text: String(answer - 2), isCorrect: false },
        { id: 'B', text: String(answer), isCorrect: true },
        { id: 'C', text: String(answer + 2), isCorrect: false },
        { id: 'D', text: String(answer + 5), isCorrect: false },
      ];
    } else if (gradeNum <= 9) {
      // Middle school math
      const num1 = Math.floor(Math.random() * 100) + 1;
      const num2 = Math.floor(Math.random() * 100) + 1;
      const answer = num1 * num2;
      questionText = `What is ${num1} × ${num2}?`;
      options = [
        { id: 'A', text: String(answer - 10), isCorrect: false },
        { id: 'B', text: String(answer), isCorrect: true },
        { id: 'C', text: String(answer + 10), isCorrect: false },
        { id: 'D', text: String(answer * 2), isCorrect: false },
      ];
    } else {
      // High school math
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const answer = a * b;
      questionText = `If x = ${a} and y = ${b}, what is x × y?`;
      options = [
        { id: 'A', text: String(answer - 5), isCorrect: false },
        { id: 'B', text: String(answer), isCorrect: true },
        { id: 'C', text: String(answer + 5), isCorrect: false },
        { id: 'D', text: String(a + b), isCorrect: false },
      ];
    }
    
    questions.push({
      id: `q${i}`,
      questionNumber: i,
      type: 'multiple-choice',
      subject: 'math-calculator',
      difficulty,
      questionText,
      options,
      correctAnswer: 'B',
      explanation: `The correct answer is B. This is a basic arithmetic problem appropriate for ${grade} grade students.`,
      topicTags: ['arithmetic', 'basic-math'],
      skillTags: ['calculation', 'problem-solving'],
      points: 1,
      estimatedTime: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 90,
    });
  }
  
  return questions;
};

function generateTest(grade: string, week: number, subject: string): TestFile {
  const complexity = gradeComplexity[grade];
  const weekStr = `week-${week}`;
  
  let questions: TestQuestion[] = [];
  let sectionName = '';
  let sectionSubject = '';
  
  if (subject === 'reading') {
    questions = readingQuestions(grade, week, 1);
    sectionName = 'Reading Comprehension';
    sectionSubject = 'reading';
  } else if (subject === 'writing') {
    questions = writingQuestions(grade, week, 1);
    sectionName = 'Writing and Language';
    sectionSubject = 'writing';
  } else if (subject === 'math') {
    questions = mathQuestions(grade, week, 1);
    sectionName = 'Mathematics';
    sectionSubject = 'math-calculator';
  }
  
  // Renumber questions
  questions = questions.map((q, idx) => ({
    ...q,
    questionNumber: idx + 1,
    id: `q${idx + 1}`,
  }));
  
  const totalTime = questions.reduce((sum, q) => sum + q.estimatedTime, 0);
  
  return {
    metadata: {
      title: `${grade.charAt(0).toUpperCase() + grade.slice(1)} Grade - Week ${week} - ${subject.charAt(0).toUpperCase() + subject.slice(1)}`,
      description: `Practice test for ${grade} grade students, week ${week}, ${subject} subject.`,
      standard: grade,
      week: weekStr,
      subject,
      difficulty: complexity.difficulty,
      version: '1.0.0',
      tags: [grade, weekStr, subject],
    },
    sections: [
      {
        id: 'section-1',
        sectionNumber: 1,
        name: sectionName,
        subject: sectionSubject,
        description: `${sectionName} practice questions for ${grade} grade students.`,
        timeLimit: Math.max(totalTime, complexity.timeLimit),
        order: 1,
        questions,
      },
    ],
  };
}

function generateAllTests() {
  const grades = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const subjects = ['reading', 'writing', 'math'];
  const testsPerGrade = 10;
  
  const baseDir = path.join(process.cwd(), 'tests');
  
  // Create base directory if it doesn't exist
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  let totalTests = 0;
  
  for (const grade of grades) {
    const gradeDir = path.join(baseDir, grade);
    if (!fs.existsSync(gradeDir)) {
      fs.mkdirSync(gradeDir, { recursive: true });
    }
    
    // Generate 10 tests per grade, rotating subjects
    for (let week = 1; week <= testsPerGrade; week++) {
      const subject = subjects[(week - 1) % subjects.length];
      const weekDir = path.join(gradeDir, `week-${week}`);
      if (!fs.existsSync(weekDir)) {
        fs.mkdirSync(weekDir, { recursive: true });
      }
      
      const subjectDir = path.join(weekDir, subject);
      if (!fs.existsSync(subjectDir)) {
        fs.mkdirSync(subjectDir, { recursive: true });
      }
      
      const test = generateTest(grade, week, subject);
      const testFile = path.join(subjectDir, 'test.json');
      
      fs.writeFileSync(testFile, JSON.stringify(test, null, 2), 'utf-8');
      totalTests++;
      
      console.log(`✅ Created: ${grade}/week-${week}/${subject}/test.json`);
    }
  }
  
  console.log(`\n🎉 Successfully generated ${totalTests} test papers!`);
  console.log(`   - ${grades.length} grades`);
  console.log(`   - ${testsPerGrade} tests per grade`);
  console.log(`   - Total: ${totalTests} tests`);
  console.log(`\n📁 Tests saved to: ${baseDir}`);
  console.log(`\n📝 Next step: Run the import script to add these tests to Firestore:`);
  console.log(`   npm run import-all-tests`);
}

// Run the generator
generateAllTests();
