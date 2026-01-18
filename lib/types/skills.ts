/**
 * Skill Taxonomy for SAT Learning Platform
 * Based on official SAT content specifications and learning science research
 */

export type SkillCategory = 'reading' | 'writing' | 'math' | 'test-strategy';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  icon: string;
  
  // Prerequisites (must master these skills first)
  requiredPredecessors: string[];
  
  // Difficulty progression
  difficultyLevel: number; // 0.0 (easiest) to 1.0 (hardest)
  
  // Mastery criteria
  unlockCriteria: {
    minAccuracy: number; // 0-100%
    minQuestions: number;
    timeLimitPerQuestion?: number; // Optional speed challenge
  };
  
  // Metadata
  estimatedTimeToMaster: number; // Minutes
  relatedSkills: string[];
}

// Reading Skills
export const READING_SKILLS: Skill[] = [
  {
    id: 'reading-main-ideas',
    name: 'Main Ideas',
    category: 'reading',
    description: 'Identify the central theme or main point of a passage',
    icon: '📖',
    requiredPredecessors: [],
    difficultyLevel: 0.3,
    unlockCriteria: { minAccuracy: 80, minQuestions: 10 },
    estimatedTimeToMaster: 120,
    relatedSkills: ['reading-inferences', 'reading-author-purpose'],
  },
  {
    id: 'reading-inferences',
    name: 'Inferences',
    category: 'reading',
    description: 'Draw logical conclusions from text evidence',
    icon: '🔍',
    requiredPredecessors: ['reading-main-ideas'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 15 },
    estimatedTimeToMaster: 180,
    relatedSkills: ['reading-main-ideas', 'reading-evidence'],
  },
  {
    id: 'reading-vocab-context',
    name: 'Vocabulary in Context',
    category: 'reading',
    description: 'Determine word meanings from surrounding text',
    icon: '📚',
    requiredPredecessors: [],
    difficultyLevel: 0.4,
    unlockCriteria: { minAccuracy: 80, minQuestions: 12 },
    estimatedTimeToMaster: 150,
    relatedSkills: ['reading-inferences'],
  },
  {
    id: 'reading-author-purpose',
    name: "Author's Purpose",
    category: 'reading',
    description: 'Understand why the author wrote the passage',
    icon: '✍️',
    requiredPredecessors: ['reading-main-ideas'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 15 },
    estimatedTimeToMaster: 180,
    relatedSkills: ['reading-main-ideas', 'reading-tone'],
  },
  {
    id: 'reading-evidence',
    name: 'Evidence-Based Reasoning',
    category: 'reading',
    description: 'Find text evidence to support answers',
    icon: '🔎',
    requiredPredecessors: ['reading-inferences'],
    difficultyLevel: 0.6,
    unlockCriteria: { minAccuracy: 80, minQuestions: 20 },
    estimatedTimeToMaster: 240,
    relatedSkills: ['reading-inferences', 'reading-main-ideas'],
  },
  {
    id: 'reading-tone',
    name: 'Tone & Style',
    category: 'reading',
    description: 'Identify the author\'s tone and writing style',
    icon: '🎭',
    requiredPredecessors: ['reading-author-purpose'],
    difficultyLevel: 0.6,
    unlockCriteria: { minAccuracy: 80, minQuestions: 18 },
    estimatedTimeToMaster: 210,
    relatedSkills: ['reading-author-purpose'],
  },
];

// Math Skills
export const MATH_SKILLS: Skill[] = [
  {
    id: 'math-arithmetic',
    name: 'Arithmetic',
    category: 'math',
    description: 'Basic operations: addition, subtraction, multiplication, division',
    icon: '🔢',
    requiredPredecessors: [],
    difficultyLevel: 0.2,
    unlockCriteria: { minAccuracy: 80, minQuestions: 10 },
    estimatedTimeToMaster: 90,
    relatedSkills: ['math-algebra-basics'],
  },
  {
    id: 'math-algebra-basics',
    name: 'Algebra Basics',
    category: 'math',
    description: 'Solving linear equations and inequalities',
    icon: '📐',
    requiredPredecessors: ['math-arithmetic'],
    difficultyLevel: 0.4,
    unlockCriteria: { minAccuracy: 80, minQuestions: 15 },
    estimatedTimeToMaster: 150,
    relatedSkills: ['math-arithmetic', 'math-word-problems'],
  },
  {
    id: 'math-word-problems',
    name: 'Word Problems',
    category: 'math',
    description: 'Translate word problems into equations',
    icon: '📝',
    requiredPredecessors: ['math-algebra-basics'],
    difficultyLevel: 0.6,
    unlockCriteria: { minAccuracy: 80, minQuestions: 20 },
    estimatedTimeToMaster: 240,
    relatedSkills: ['math-algebra-basics', 'math-data-interpretation'],
  },
  {
    id: 'math-geometry',
    name: 'Geometry Foundations',
    category: 'math',
    description: 'Basic shapes, area, perimeter, angles',
    icon: '🔺',
    requiredPredecessors: ['math-arithmetic'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 18 },
    estimatedTimeToMaster: 210,
    relatedSkills: ['math-arithmetic'],
  },
  {
    id: 'math-data-interpretation',
    name: 'Data Interpretation',
    category: 'math',
    description: 'Read and analyze graphs, charts, and tables',
    icon: '📊',
    requiredPredecessors: ['math-algebra-basics'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 15 },
    estimatedTimeToMaster: 180,
    relatedSkills: ['math-word-problems'],
  },
];

// Writing Skills
export const WRITING_SKILLS: Skill[] = [
  {
    id: 'writing-grammar',
    name: 'Grammar & Usage',
    category: 'writing',
    description: 'Correct grammar, punctuation, and word usage',
    icon: '✏️',
    requiredPredecessors: [],
    difficultyLevel: 0.3,
    unlockCriteria: { minAccuracy: 80, minQuestions: 12 },
    estimatedTimeToMaster: 120,
    relatedSkills: ['writing-sentence-structure'],
  },
  {
    id: 'writing-sentence-structure',
    name: 'Sentence Structure',
    category: 'writing',
    description: 'Identify and fix sentence errors',
    icon: '📄',
    requiredPredecessors: ['writing-grammar'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 18 },
    estimatedTimeToMaster: 210,
    relatedSkills: ['writing-grammar', 'writing-style'],
  },
  {
    id: 'writing-style',
    name: 'Style & Tone',
    category: 'writing',
    description: 'Improve clarity, conciseness, and tone',
    icon: '🎨',
    requiredPredecessors: ['writing-sentence-structure'],
    difficultyLevel: 0.6,
    unlockCriteria: { minAccuracy: 80, minQuestions: 20 },
    estimatedTimeToMaster: 240,
    relatedSkills: ['writing-sentence-structure'],
  },
];

// Test Strategy Skills
export const TEST_STRATEGY_SKILLS: Skill[] = [
  {
    id: 'strategy-time-management',
    name: 'Time Management',
    category: 'test-strategy',
    description: 'Complete tests within time limits',
    icon: '⏱️',
    requiredPredecessors: [],
    difficultyLevel: 0.4,
    unlockCriteria: { minAccuracy: 70, minQuestions: 30, timeLimitPerQuestion: 60 },
    estimatedTimeToMaster: 300,
    relatedSkills: ['strategy-process-elimination'],
  },
  {
    id: 'strategy-process-elimination',
    name: 'Process of Elimination',
    category: 'test-strategy',
    description: 'Eliminate wrong answers to find the correct one',
    icon: '🎯',
    requiredPredecessors: [],
    difficultyLevel: 0.3,
    unlockCriteria: { minAccuracy: 75, minQuestions: 25 },
    estimatedTimeToMaster: 180,
    relatedSkills: ['strategy-time-management'],
  },
  {
    id: 'strategy-answer-checking',
    name: 'Answer Checking',
    category: 'test-strategy',
    description: 'Review and verify answers before submitting',
    icon: '✅',
    requiredPredecessors: ['strategy-time-management'],
    difficultyLevel: 0.5,
    unlockCriteria: { minAccuracy: 80, minQuestions: 20 },
    estimatedTimeToMaster: 150,
    relatedSkills: ['strategy-time-management'],
  },
];

// All skills combined
export const ALL_SKILLS: Skill[] = [
  ...READING_SKILLS,
  ...MATH_SKILLS,
  ...WRITING_SKILLS,
  ...TEST_STRATEGY_SKILLS,
];

// Helper functions
export function getSkillById(skillId: string): Skill | undefined {
  return ALL_SKILLS.find(skill => skill.id === skillId);
}

export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return ALL_SKILLS.filter(skill => skill.category === category);
}

export function getSkillTree(category?: SkillCategory): Skill[] {
  const skills = category ? getSkillsByCategory(category) : ALL_SKILLS;
  return skills.sort((a, b) => a.difficultyLevel - b.difficultyLevel);
}
