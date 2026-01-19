/**
 * Question Generator
 * Generates authentic, age-appropriate questions for progressive assessment system
 */

import { Question, QuestionOption } from './schema';
import { getConceptsForTest } from './spiral-curriculum';

interface QuestionTemplate {
  type: Question['type'];
  gradeRange: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  templates: Array<{
    stem: string;
    passage?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    distractorTypes: string[];
  }>;
}

// Reading Comprehension Templates
const READING_TEMPLATES: QuestionTemplate[] = [
  {
    type: 'reading_comprehension',
    gradeRange: '3-5',
    difficulty: 'easy',
    templates: [
      {
        stem: 'What is the main idea of this passage?',
        passage: 'The library is a wonderful place to visit. It has thousands of books about many different topics. You can read stories, learn about science, or discover history. Many libraries also have computers and quiet study areas.',
        options: [
          'Libraries have computers',
          'Libraries are great places with many resources',
          'You can read stories at libraries',
          'Libraries are quiet places'
        ],
        correctIndex: 1,
        explanation: 'The main idea is that libraries are great places with many resources, as the passage discusses books, computers, and study areas.',
        distractorTypes: ['too_specific', 'correct', 'too_specific', 'too_specific']
      },
      {
        stem: 'Why did the character do this?',
        passage: 'Sarah looked at her watch and realized she was late. She quickly grabbed her backpack and ran out the door. Her mom called after her, but Sarah was already halfway down the street.',
        options: [
          'She wanted to exercise',
          'She was late and needed to hurry',
          'She forgot something',
          'She was excited'
        ],
        correctIndex: 1,
        explanation: 'Sarah ran because she realized she was late, as stated in the passage.',
        distractorTypes: ['conceptual_misunderstanding', 'correct', 'conceptual_misunderstanding', 'conceptual_misunderstanding']
      }
    ]
  }
];

// Math Templates
const MATH_TEMPLATES: QuestionTemplate[] = [
  {
    type: 'math_procedural',
    gradeRange: '3-5',
    difficulty: 'easy',
    templates: [
      {
        stem: 'What is 3/4 + 1/4?',
        options: ['4/8', '1', '4/4', '2/4'],
        correctIndex: 1,
        explanation: 'When adding fractions with the same denominator, add the numerators: 3/4 + 1/4 = 4/4 = 1.',
        distractorTypes: ['calculation_error', 'correct', 'partial_answer', 'calculation_error']
      },
      {
        stem: 'What is 7 × 8?',
        options: ['54', '56', '63', '64'],
        correctIndex: 1,
        explanation: '7 × 8 = 56.',
        distractorTypes: ['calculation_error', 'correct', 'calculation_error', 'calculation_error']
      }
    ]
  },
  {
    type: 'math_word_problem',
    gradeRange: '3-5',
    difficulty: 'medium',
    templates: [
      {
        stem: 'A recipe uses 3/4 cup of sugar. If you double the recipe, how much sugar do you need?',
        options: ['6/4 cups', '1 1/2 cups', '3/8 cups', '6/8 cups'],
        correctIndex: 1,
        explanation: 'Doubling 3/4 means multiplying by 2: 3/4 × 2 = 6/4 = 1 2/4 = 1 1/2.',
        distractorTypes: ['partial_answer', 'correct', 'calculation_error', 'partial_answer']
      }
    ]
  }
];

// Grammar Templates
const GRAMMAR_TEMPLATES: QuestionTemplate[] = [
  {
    type: 'grammar',
    gradeRange: '3-5',
    difficulty: 'easy',
    templates: [
      {
        stem: 'Which sentence uses commas correctly?',
        options: [
          'I need to buy apples, bananas, and oranges.',
          'I need to buy apples, bananas and oranges.',
          'I need, to buy apples bananas, and oranges.',
          'I need to buy, apples bananas, and oranges.'
        ],
        correctIndex: 0,
        explanation: 'In a list of three or more items, commas should separate each item, including before "and" (Oxford comma).',
        distractorTypes: ['correct', 'conceptual_misunderstanding', 'calculation_error', 'conceptual_misunderstanding']
      }
    ]
  }
];

function getTemplatesForGrade(grade: number, type: Question['type'], difficulty: 'easy' | 'medium' | 'hard' | 'expert'): QuestionTemplate[] {
  let templates: QuestionTemplate[] = [];
  
  if (type === 'reading_comprehension' || type === 'vocabulary' || type === 'evidence_based') {
    templates = READING_TEMPLATES;
  } else if (type === 'grammar' || type === 'rhetorical_synthesis') {
    templates = GRAMMAR_TEMPLATES;
  } else if (type.includes('math')) {
    templates = MATH_TEMPLATES;
  }
  
  return templates.filter(t => {
    const [minGrade, maxGrade] = t.gradeRange.split('-').map(g => g === 'K' ? 0 : parseInt(g));
    return grade >= minGrade && grade <= maxGrade && t.difficulty === difficulty;
  });
}

export function generateQuestion(
  grade: number,
  testNumber: number,
  questionNumber: number,
  type: Question['type'],
  difficulty: 'easy' | 'medium' | 'hard' | 'expert',
  conceptId?: string
): Question {
  const templates = getTemplatesForGrade(grade, type, difficulty);
  const template = templates[0]?.templates[0] || {
    stem: `Sample ${type} question for grade ${grade}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 1,
    explanation: 'Sample explanation',
    distractorTypes: ['too_specific', 'correct', 'too_broad', 'opposite_meaning']
  };
  
  const options: QuestionOption[] = template.options.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
    correct: index === template.correctIndex,
    distractor_type: index !== template.correctIndex ? template.distractorTypes[index] as any : undefined
  }));
  
  return {
    question_id: `g${grade}-t${testNumber.toString().padStart(3, '0')}-q${questionNumber.toString().padStart(2, '0')}`,
    type,
    sub_type: conceptId || 'general',
    difficulty,
    bloom_level: testNumber <= 15 ? 2 : testNumber <= 30 ? 3 : testNumber <= 45 ? 4 : 5,
    passage: template.passage,
    stem: template.stem,
    options,
    explanation: template.explanation,
    standards_alignment: [`CCSS.GRADE.${grade}`],
    time_estimate_seconds: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : difficulty === 'hard' ? 90 : 120,
    subject: type.includes('math') ? 'math' : type === 'grammar' || type === 'rhetorical_synthesis' ? 'writing' : 'reading',
    section: type.includes('math') ? 2 : 1,
  };
}
