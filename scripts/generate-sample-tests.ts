/**
 * Generate 50+ Sample Test Papers
 * Organized by Standard, Week, and Subject
 */

import * as fs from 'fs';
import * as path from 'path';

// Sample passages for reading/writing
const READING_PASSAGES = [
  {
    text: "The Renaissance was a period of cultural rebirth that began in Italy in the 14th century and spread throughout Europe. This era marked a transition from the Middle Ages to modernity, characterized by renewed interest in classical learning, humanism, and artistic achievement. Artists like Leonardo da Vinci and Michelangelo created masterpieces that continue to inspire today.",
    questions: [
      {
        question: "What was the primary characteristic of the Renaissance?",
        options: ["A period of war", "A cultural rebirth", "A time of famine", "An era of isolation"],
        correct: "B",
        explanation: "The passage describes the Renaissance as 'a period of cultural rebirth'."
      },
      {
        question: "Where did the Renaissance begin?",
        options: ["France", "Germany", "Italy", "Spain"],
        correct: "C",
        explanation: "The passage states the Renaissance 'began in Italy in the 14th century'."
      }
    ]
  },
  {
    text: "Photosynthesis is the process by which plants convert light energy into chemical energy. During this process, plants absorb carbon dioxide from the atmosphere and water from the soil. Using sunlight as the energy source, they produce glucose (sugar) and release oxygen as a byproduct. This process is essential for life on Earth as it produces the oxygen we breathe.",
    questions: [
      {
        question: "What is the main purpose of photosynthesis?",
        options: ["To produce oxygen", "To convert light energy to chemical energy", "To absorb water", "To release carbon dioxide"],
        correct: "B",
        explanation: "Photosynthesis converts light energy into chemical energy."
      },
      {
        question: "What gas do plants release during photosynthesis?",
        options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"],
        correct: "C",
        explanation: "Plants release oxygen as a byproduct of photosynthesis."
      }
    ]
  },
  {
    text: "The Industrial Revolution transformed society in the 18th and 19th centuries. It began in Britain with the invention of steam engines and mechanized textile production. This revolution led to urbanization as people moved from rural areas to cities to work in factories. While it brought economic growth, it also created social challenges including poor working conditions and environmental pollution.",
    questions: [
      {
        question: "What invention marked the beginning of the Industrial Revolution?",
        options: ["Electricity", "Steam engines", "Telephone", "Automobile"],
        correct: "B",
        explanation: "The passage mentions 'steam engines' as a key invention."
      },
      {
        question: "What was a negative consequence of the Industrial Revolution?",
        options: ["Economic growth", "Urbanization", "Poor working conditions", "Technological advancement"],
        correct: "C",
        explanation: "The passage mentions 'poor working conditions' as a social challenge."
      }
    ]
  }
];

const WRITING_QUESTIONS = [
  {
    question: "Choose the best revision for the underlined portion: 'The students was excited about the field trip.'",
    options: [
      "NO CHANGE",
      "The students were excited",
      "The students is excited",
      "The students be excited"
    ],
    correct: "B",
    explanation: "Subject-verb agreement: 'students' (plural) requires 'were' (plural)."
  },
  {
    question: "Which sentence is grammatically correct?",
    options: [
      "She don't like pizza.",
      "She doesn't like pizza.",
      "She do not like pizza.",
      "She not like pizza."
    ],
    correct: "B",
    explanation: "Third person singular requires 'doesn't' not 'don't'."
  },
  {
    question: "Choose the sentence with correct punctuation:",
    options: [
      "I went to the store, and I bought milk.",
      "I went to the store and I bought milk.",
      "I went to the store, and, I bought milk.",
      "I went to the store and, I bought milk."
    ],
    correct: "A",
    explanation: "A comma is needed before 'and' when connecting two independent clauses."
  }
];

const MATH_QUESTIONS = [
  {
    question: "If x + 5 = 12, what is the value of x?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "5" },
      { id: "B", text: "7" },
      { id: "C", text: "12" },
      { id: "D", text: "17" }
    ],
    correct: "B",
    explanation: "x + 5 = 12, so x = 12 - 5 = 7"
  },
  {
    question: "What is 15% of 200?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "15" },
      { id: "B", text: "30" },
      { id: "C", text: "45" },
      { id: "D", text: "60" }
    ],
    correct: "B",
    explanation: "15% of 200 = 0.15 × 200 = 30"
  },
  {
    question: "If a rectangle has length 8 and width 5, what is its area?",
    type: "grid-in",
    correct: 40,
    explanation: "Area = length × width = 8 × 5 = 40"
  },
  {
    question: "Solve for y: 2y - 6 = 10",
    type: "multiple-choice",
    options: [
      { id: "A", text: "2" },
      { id: "B", text: "4" },
      { id: "C", text: "8" },
      { id: "D", text: "16" }
    ],
    correct: "C",
    explanation: "2y - 6 = 10, so 2y = 16, therefore y = 8"
  }
];

function generateReadingTest(standard: string, week: string): any {
  const questions: any[] = [];
  
  // Generate 10 reading questions
  for (let i = 1; i <= 10; i++) {
    const passageIndex = i % READING_PASSAGES.length;
    const selectedPassage = READING_PASSAGES[passageIndex];
    const questionIndex = (i - 1) % selectedPassage.questions.length;
    const questionData = selectedPassage.questions[questionIndex];
    
    questions.push({
      id: `q-reading-${i}`,
      questionNumber: i,
      type: 'multiple-choice',
      subject: 'reading',
      difficulty: i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard',
      questionText: questionData.question,
      passageText: selectedPassage.text,
      options: questionData.options.map((opt: string, idx: number) => {
        const optionId = String.fromCharCode(65 + idx); // A, B, C, D
        return {
          id: optionId,
          text: opt,
          isCorrect: optionId === questionData.correct,
        };
      }),
      correctAnswer: questionData.correct,
      explanation: questionData.explanation,
      topicTags: ['reading-comprehension', 'main-idea'],
      skillTags: ['analysis', 'inference'],
      points: 1,
      estimatedTime: 90,
    });
  }

  return {
    metadata: {
      title: `${week.replace('week-', 'Week ')} - Reading Comprehension (${standard} Grade)`,
      description: `Reading comprehension practice test for ${standard} grade students, ${week}`,
      standard,
      week,
      subject: 'reading',
      difficulty: 'intermediate',
      version: '1.0.0',
      tags: ['reading', 'comprehension', week],
    },
    sections: [
      {
        id: 'section-reading-1',
        sectionNumber: 1,
        name: 'Reading Comprehension',
        subject: 'reading',
        description: 'Read the following passages and answer the questions',
        timeLimit: 1800, // 30 minutes
        order: 1,
        questions,
      },
    ],
  };
}

function generateWritingTest(standard: string, week: string): any {
  const questions: any[] = [];
  
  // Generate 10 writing questions
  for (let i = 1; i <= 10; i++) {
    const questionIndex = (i - 1) % WRITING_QUESTIONS.length;
    const questionData = WRITING_QUESTIONS[questionIndex];
    
    questions.push({
      id: `q-writing-${i}`,
      questionNumber: i,
      type: 'multiple-choice',
      subject: 'writing',
      difficulty: i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard',
      questionText: questionData.question,
      options: questionData.options.map((opt: string, idx: number) => {
        const optionId = String.fromCharCode(65 + idx);
        return {
          id: optionId,
          text: opt,
          isCorrect: optionId === questionData.correct,
        };
      }),
      correctAnswer: questionData.correct,
      explanation: questionData.explanation,
      topicTags: ['grammar', 'sentence-structure'],
      skillTags: ['editing', 'revision'],
      points: 1,
      estimatedTime: 60,
    });
  }

  return {
    metadata: {
      title: `${week.replace('week-', 'Week ')} - Writing and Language (${standard} Grade)`,
      description: `Writing and language practice test for ${standard} grade students, ${week}`,
      standard,
      week,
      subject: 'writing',
      difficulty: 'intermediate',
      version: '1.0.0',
      tags: ['writing', 'grammar', week],
    },
    sections: [
      {
        id: 'section-writing-1',
        sectionNumber: 1,
        name: 'Writing and Language',
        subject: 'writing',
        description: 'Choose the best revision for each sentence',
        timeLimit: 1200, // 20 minutes
        order: 1,
        questions,
      },
    ],
  };
}

function generateMathTest(standard: string, week: string): any {
  const questions: any[] = [];
  
  // Generate 10 math questions (mix of multiple-choice and grid-in)
  for (let i = 1; i <= 10; i++) {
    const questionIndex = (i - 1) % MATH_QUESTIONS.length;
    const questionData = MATH_QUESTIONS[questionIndex];
    const isGridIn = questionData.type === 'grid-in' || (i % 3 === 0);
    
    if (isGridIn && typeof questionData.correct === 'number') {
      questions.push({
        id: `q-math-${i}`,
        questionNumber: i,
        type: 'grid-in',
        subject: 'math-no-calculator',
        difficulty: i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard',
        questionText: questionData.question,
        correctAnswer: questionData.correct,
        explanation: questionData.explanation,
        topicTags: ['algebra', 'arithmetic'],
        skillTags: ['problem-solving', 'calculation'],
        points: 1,
        estimatedTime: 120,
      });
    } else {
      questions.push({
        id: `q-math-${i}`,
        questionNumber: i,
        type: 'multiple-choice',
        subject: 'math-no-calculator',
        difficulty: i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard',
        questionText: questionData.question,
        options: (questionData.options || []).map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.id === questionData.correct,
        })),
        correctAnswer: questionData.correct,
        explanation: questionData.explanation,
        topicTags: ['algebra', 'arithmetic'],
        skillTags: ['problem-solving', 'calculation'],
        points: 1,
        estimatedTime: 90,
      });
    }
  }

  return {
    metadata: {
      title: `${week.replace('week-', 'Week ')} - Mathematics (${standard} Grade)`,
      description: `Mathematics practice test for ${standard} grade students, ${week}`,
      standard,
      week,
      subject: 'math',
      difficulty: 'intermediate',
      version: '1.0.0',
      tags: ['math', 'algebra', week],
    },
    sections: [
      {
        id: 'section-math-1',
        sectionNumber: 1,
        name: 'Mathematics - No Calculator',
        subject: 'math-no-calculator',
        description: 'Solve mathematical problems without a calculator',
        timeLimit: 1500, // 25 minutes
        order: 1,
        questions,
      },
    ],
  };
}

function generateAllTests() {
  const standards = ['9th', '10th', '11th', '12th'];
  const weeks = Array.from({ length: 12 }, (_, i) => `week-${i + 1}`);
  const subjects = ['reading', 'writing', 'math'];
  
  const testsDir = path.join(process.cwd(), 'tests');
  
  // Ensure tests directory exists
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  let totalGenerated = 0;

  // Generate tests for each combination
  for (const standard of standards) {
    for (const week of weeks) {
      for (const subject of subjects) {
        const testDir = path.join(testsDir, standard, week, subject);
        
        // Create directory structure
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        // Generate test based on subject
        let test: any;
        if (subject === 'reading') {
          test = generateReadingTest(standard, week);
        } else if (subject === 'writing') {
          test = generateWritingTest(standard, week);
        } else if (subject === 'math') {
          test = generateMathTest(standard, week);
        } else {
          continue; // Skip unknown subjects
        }

        // Write test file
        const testFilePath = path.join(testDir, 'test.json');
        fs.writeFileSync(testFilePath, JSON.stringify(test, null, 2));
        
        totalGenerated++;
        if (totalGenerated % 10 === 0) {
          console.log(`✅ Generated ${totalGenerated} tests...`);
        }
      }
    }
  }

  console.log(`\n🎉 Generated ${totalGenerated} test files!`);
  console.log(`📁 Location: ${testsDir}`);
  console.log(`\n📊 Distribution:`);
  console.log(`   - Standards: ${standards.length} (${standards.join(', ')})`);
  console.log(`   - Weeks: ${weeks.length} (${weeks[0]} to ${weeks[weeks.length - 1]})`);
  console.log(`   - Subjects: ${subjects.length} (${subjects.join(', ')})`);
  console.log(`   - Total: ${standards.length} × ${weeks.length} × ${subjects.length} = ${totalGenerated} tests`);
}

// Run the generator
generateAllTests();
