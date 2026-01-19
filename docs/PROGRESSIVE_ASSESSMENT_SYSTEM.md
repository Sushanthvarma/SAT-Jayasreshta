# SAT-Aligned Progressive Assessment System

## System Overview

A comprehensive 50-test × 20-question blended assessment system (1,000 questions per grade, K-12) that progressively builds SAT readiness while respecting cognitive development stages. Each test combines Reading/Writing and Math in age-appropriate ratios, using spiral curriculum with mastery gates and authentic SAT alignment for Grades 9-12.

## Architecture

### File Structure
```
/content/
  /grade-K/
    /test-001.json
    /test-002.json
    ...
  /grade-1/
  ...
  /grade-12/
```

### JSON Schema
Each test follows the `ProgressiveTest` schema defined in `lib/test-system/schema.ts`:
- Metadata (test ID, grade, mastery threshold)
- 20 questions (Reading/Writing + Math)
- Spiral curriculum tracking
- Standards alignment

## Grade-Specific Configurations

### Grades K-2: Foundation Builder
- **Structure**: 12Q Literacy + 8Q Numeracy
- **Difficulty**: Tests 1-15 (easy), 16-35 (medium), 36-50 (hard)
- **Mastery Gates**: 60% (tests 1-15), 65% (tests 16-35), 70% (tests 36-50)
- **Time**: 5-8 minutes per test

### Grades 3-5: Skill Bridge
- **Structure**: 11Q Reading/Writing + 9Q Math
- **Difficulty**: Tests 1-12 (easy), 13-30 (medium), 31-50 (hard)
- **Mastery Gates**: 70% (tests 1-25), 75% (tests 26-50)
- **Time**: 10-12 minutes per test

### Grades 6-8: SAT Format Introduction
- **Structure**: 10Q Reading/Writing + 10Q Math
- **Difficulty**: Tests 1-15 (easy), 16-35 (medium), 36-50 (hard)
- **Mastery Gates**: 75% (all tests)
- **Time**: 12-15 minutes per test

### Grades 9-12: Full SAT Simulation
- **Structure**: 10Q Reading/Writing + 10Q Math
- **Difficulty**: Tests 1-10 (400-500 SAT), 11-25 (500-600), 26-40 (600-700), 41-50 (700-800)
- **Mastery Gates**: 70% (tests 1-10), 75% (tests 11-25), 80% (tests 26-50)
- **Time**: 16 minutes per test (48 seconds/question)

## Spiral Curriculum

Core concepts reappear 4-6 times across 50 tests with increasing complexity:

| Concept | First Intro | Depth Layer 1 | Depth Layer 2 | Mastery Check |
|---------|-------------|---------------|---------------|---------------|
| Main Idea | Test 3 | Test 12 | Test 28 | Test 45 |
| Fractions | Test 5 | Test 17 | Test 31 | Test 44 |
| Comma Usage | Test 8 | Test 22 | Test 36 | Test 49 |

### Spacing Algorithm
- **Initial exposure**: Test N
- **Reinforcement 1**: Test N + 7-10 (one week later)
- **Reinforcement 2**: Test N + 18-25 (increased difficulty)
- **Mastery assessment**: Test N + 35-45 (highest difficulty)

## Mastery Gates

Unlock logic ensures students demonstrate readiness before advancing:

```typescript
function unlockNextTest(currentTest: number, score: number, grade: number): boolean {
  const gate = getMasteryGate(grade, currentTest);
  return score >= gate.threshold_percentage;
}
```

### Retry Policy
- **K-5**: Up to 3 retries
- **6-8**: Up to 2 retries
- **9-12**: Up to 2 retries (tests 1-25), 1 retry (tests 26-50)

## Question Quality Standards

1. **No Ambiguity**: Single defensible correct answer
2. **Distractor Design**: 
   - Reflect common misconceptions
   - All choices must be plausible
3. **Stem Clarity**: Reading level = grade level - 1
4. **Real-world Context**: 60% of questions use authentic scenarios

## Standards Alignment

- **Common Core State Standards (CCSS)**: Grades K-8
- **Cambridge International Curriculum**: Grades 1-10
- **College Board SAT Suite**: Grades 9-12
  - PSAT 8/9: Tests 1-15
  - PSAT 10/NMSQT: Tests 16-35
  - SAT: Tests 36-50

## Usage

### Generate Tests
```bash
tsx scripts/generate-progressive-tests.ts
```

### Import Tests
Tests can be imported using the existing test import system:
```bash
npm run import-all-tests
```

### Access in Application
Tests are stored in `/content/grade-{N}/test-{NNN}.json` and can be:
1. Scanned by the test file scanner
2. Imported via admin dashboard
3. Assigned to students based on grade and mastery level

## Proof of Concept

**Grade 4, Test 1** (`content/grade-4/test-001.json`) demonstrates:
- ✅ Complete JSON schema compliance
- ✅ Spiral curriculum integration
- ✅ Mastery gate configuration
- ✅ Standards alignment
- ✅ Question quality standards
- ✅ Real-world context usage

## Next Steps

1. **Question Bank Templates**: Create 10+ templates per question type
2. **Content Generation**: Use AI/LLM to generate authentic questions
3. **Validation**: Run CCSS/Cambridge alignment checks
4. **Firebase Integration**: Update test import system to handle progressive tests
5. **Mastery Tracking**: Implement unlock logic in student dashboard
6. **Adaptive Recommendations**: Track performance on Tests 1-5 to recommend starting point

## Research Foundation

- **Bloom's Taxonomy**: Progressive cognitive complexity
- **Piaget/Vygotsky**: Age-appropriate cognitive development
- **Spaced Repetition**: Optimal concept reinforcement intervals
- **SAT Digital Test Specs**: Authentic question formats for Grades 9-12
