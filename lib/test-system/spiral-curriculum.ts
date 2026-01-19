/**
 * Spiral Curriculum Map
 * Defines when and how core concepts reappear across 50 tests
 */

export interface ConceptAppearance {
  test_number: number;
  complexity_level: number; // 1-5 scale
  question_type: string;
  bloom_level: number;
  expected_mastery: number; // 0-1
}

export interface CoreConcept {
  concept_id: string;
  concept_name: string;
  grade_range: string;
  category: 'reading' | 'writing' | 'math';
  appearances: ConceptAppearance[];
  prerequisite_concepts?: string[];
}

export const CORE_CONCEPTS: CoreConcept[] = [
  // Reading Concepts
  {
    concept_id: 'main_idea',
    concept_name: 'Main Idea Identification',
    grade_range: '3-12',
    category: 'reading',
    appearances: [
      { test_number: 3, complexity_level: 1, question_type: 'reading_comprehension', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 12, complexity_level: 2, question_type: 'reading_comprehension', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 28, complexity_level: 3, question_type: 'evidence_based', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 45, complexity_level: 4, question_type: 'evidence_based', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  {
    concept_id: 'inference',
    concept_name: 'Making Inferences',
    grade_range: '3-12',
    category: 'reading',
    appearances: [
      { test_number: 5, complexity_level: 1, question_type: 'reading_comprehension', bloom_level: 3, expected_mastery: 0.5 },
      { test_number: 15, complexity_level: 2, question_type: 'reading_comprehension', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 32, complexity_level: 3, question_type: 'evidence_based', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 48, complexity_level: 4, question_type: 'evidence_based', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  {
    concept_id: 'vocabulary_context',
    concept_name: 'Vocabulary in Context',
    grade_range: '3-12',
    category: 'reading',
    appearances: [
      { test_number: 7, complexity_level: 1, question_type: 'vocabulary', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 18, complexity_level: 2, question_type: 'vocabulary', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 35, complexity_level: 3, question_type: 'vocabulary', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 49, complexity_level: 4, question_type: 'vocabulary', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  // Writing Concepts
  {
    concept_id: 'comma_usage',
    concept_name: 'Comma Usage',
    grade_range: '3-12',
    category: 'writing',
    appearances: [
      { test_number: 8, complexity_level: 1, question_type: 'grammar', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 22, complexity_level: 2, question_type: 'grammar', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 36, complexity_level: 3, question_type: 'grammar', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 49, complexity_level: 4, question_type: 'grammar', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  {
    concept_id: 'sentence_structure',
    concept_name: 'Sentence Structure',
    grade_range: '4-12',
    category: 'writing',
    appearances: [
      { test_number: 10, complexity_level: 1, question_type: 'grammar', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 24, complexity_level: 2, question_type: 'grammar', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 38, complexity_level: 3, question_type: 'rhetorical_synthesis', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 50, complexity_level: 4, question_type: 'rhetorical_synthesis', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  // Math Concepts
  {
    concept_id: 'fractions',
    concept_name: 'Fraction Operations',
    grade_range: '3-12',
    category: 'math',
    appearances: [
      { test_number: 5, complexity_level: 1, question_type: 'math_procedural', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 17, complexity_level: 2, question_type: 'math_word_problem', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 31, complexity_level: 3, question_type: 'math_word_problem', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 44, complexity_level: 4, question_type: 'math_word_problem', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  {
    concept_id: 'linear_equations',
    concept_name: 'Linear Equations',
    grade_range: '6-12',
    category: 'math',
    appearances: [
      { test_number: 12, complexity_level: 1, question_type: 'math_procedural', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 28, complexity_level: 2, question_type: 'math_word_problem', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 40, complexity_level: 3, question_type: 'math_word_problem', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 48, complexity_level: 4, question_type: 'math_word_problem', bloom_level: 5, expected_mastery: 0.85 },
    ],
    prerequisite_concepts: ['fractions'],
  },
  {
    concept_id: 'geometry_basics',
    concept_name: 'Basic Geometry',
    grade_range: '3-12',
    category: 'math',
    appearances: [
      { test_number: 6, complexity_level: 1, question_type: 'math_geometry', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 20, complexity_level: 2, question_type: 'math_geometry', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 34, complexity_level: 3, question_type: 'math_geometry', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 47, complexity_level: 4, question_type: 'math_geometry', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
  {
    concept_id: 'data_analysis',
    concept_name: 'Data Analysis',
    grade_range: '4-12',
    category: 'math',
    appearances: [
      { test_number: 11, complexity_level: 1, question_type: 'math_data_analysis', bloom_level: 2, expected_mastery: 0.5 },
      { test_number: 26, complexity_level: 2, question_type: 'math_data_analysis', bloom_level: 3, expected_mastery: 0.65 },
      { test_number: 39, complexity_level: 3, question_type: 'math_data_analysis', bloom_level: 4, expected_mastery: 0.75 },
      { test_number: 50, complexity_level: 4, question_type: 'math_data_analysis', bloom_level: 5, expected_mastery: 0.85 },
    ],
  },
];

export function getConceptAppearances(conceptId: string, grade: number): ConceptAppearance[] {
  const concept = CORE_CONCEPTS.find(c => c.concept_id === conceptId);
  if (!concept) return [];
  
  // Filter by grade range
  const [minGrade, maxGrade] = concept.grade_range.split('-').map(g => g === 'K' ? 0 : parseInt(g));
  if (grade < minGrade || grade > maxGrade) return [];
  
  return concept.appearances;
}

export function getConceptsForTest(grade: number, testNumber: number): string[] {
  return CORE_CONCEPTS
    .filter(concept => {
      const [minGrade, maxGrade] = concept.grade_range.split('-').map(g => g === 'K' ? 0 : parseInt(g));
      if (grade < minGrade || grade > maxGrade) return false;
      return concept.appearances.some(a => a.test_number === testNumber);
    })
    .map(concept => concept.concept_id);
}
