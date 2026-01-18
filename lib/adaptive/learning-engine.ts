/**
 * Adaptive Learning Engine
 * Implements Item Response Theory (IRT) and Bayesian Knowledge Tracing
 * Based on research from Harvard, Stanford, and Microsoft Education
 */

import { Question } from '@/lib/types/test';
import { Skill } from '@/lib/types/skills';

/**
 * Student Ability Profile
 * Tracks the student's current ability level across different skills
 */
export interface StudentAbility {
  userId: string;
  
  // Overall ability (0.0 = beginner, 1.0 = expert)
  overallAbility: number;
  
  // Skill-specific ability levels
  skillMastery: Record<string, number>; // skillId -> mastery (0.0 to 1.0)
  
  // Learning velocity (how fast student is improving)
  learningVelocity: Record<string, number>; // skillId -> velocity
  
  // Last practice date for each skill (for forgetting curve)
  lastPracticeDate: Record<string, Date>;
  
  // Metadata
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  updatedAt: Date;
}

/**
 * Question Selection Result
 */
export interface QuestionSelection {
  question: Question;
  reason: string; // Why this question was selected
  expectedDifficulty: number; // Expected difficulty for this student
  expectedSuccessProbability: number; // 0.0 to 1.0
}

/**
 * Adaptive Learning Engine Class
 */
export class AdaptiveLearningEngine {
  /**
   * Calculate probability of correct answer using Item Response Theory (IRT)
   * Uses 3-Parameter Logistic Model (3PL)
   */
  calculateIRTProbability(
    studentAbility: number,
    questionDifficulty: number,
    questionDiscrimination: number = 1.0,
    questionGuessing: number = 0.25
  ): number {
    // 3PL IRT formula: P(θ) = c + (1-c) / (1 + exp(-a(θ - b)))
    // where:
    // - θ (theta) = student ability
    // - b = question difficulty
    // - a = question discrimination
    // - c = guessing parameter
    
    const exponent = -questionDiscrimination * (studentAbility - questionDifficulty);
    const denominator = 1 + Math.exp(exponent);
    const probability = questionGuessing + (1 - questionGuessing) / denominator;
    
    return Math.max(0, Math.min(1, probability)); // Clamp between 0 and 1
  }

  /**
   * Select the next question based on student's ability and learning goals
   */
  selectNextQuestion(
    availableQuestions: Question[],
    studentAbility: StudentAbility,
    targetSkillId?: string
  ): QuestionSelection | null {
    if (availableQuestions.length === 0) {
      return null;
    }

    // Filter questions by target skill if specified
    let candidateQuestions = availableQuestions;
    if (targetSkillId) {
      candidateQuestions = availableQuestions.filter(q =>
        q.skillTags.includes(targetSkillId)
      );
      
      // If no questions for target skill, use all available
      if (candidateQuestions.length === 0) {
        candidateQuestions = availableQuestions;
      }
    }

    // Calculate optimal difficulty for this student
    const optimalDifficulty = this.calculateOptimalDifficulty(studentAbility);
    
    // Score each question based on:
    // 1. Match with optimal difficulty
    // 2. IRT probability (should be ~0.7 for optimal learning)
    // 3. Skill mastery (prioritize skills below 80% mastery)
    const scoredQuestions = candidateQuestions.map(question => {
      const questionDifficulty = this.getQuestionDifficulty(question);
      const skillMastery = this.getRelevantSkillMastery(question, studentAbility);
      
      // Calculate IRT probability
      const irtDifficulty = question.adaptiveData?.irtDifficulty ?? questionDifficulty;
      const irtDiscrimination = question.adaptiveData?.irtDiscrimination ?? 1.0;
      const irtGuessing = question.adaptiveData?.irtGuessing ?? 0.25;
      
      const successProbability = this.calculateIRTProbability(
        studentAbility.overallAbility,
        irtDifficulty,
        irtDiscrimination,
        irtGuessing
      );
      
      // Optimal learning happens at ~70% success rate
      const optimalProbability = 0.7;
      const probabilityScore = 1 - Math.abs(successProbability - optimalProbability);
      
      // Difficulty match score (closer to optimal = better)
      const difficultyScore = 1 - Math.abs(questionDifficulty - optimalDifficulty);
      
      // Skill priority score (lower mastery = higher priority)
      const skillPriorityScore = 1 - skillMastery;
      
      // Frequency score (prefer questions asked less often)
      const timesAsked = question.adaptiveData?.timesAsked ?? 0;
      const frequencyScore = 1 / (1 + timesAsked * 0.1);
      
      // Combined score (weighted)
      const totalScore =
        probabilityScore * 0.4 +      // 40% weight on optimal difficulty
        difficultyScore * 0.2 +        // 20% weight on difficulty match
        skillPriorityScore * 0.3 +     // 30% weight on skill priority
        frequencyScore * 0.1;           // 10% weight on frequency
      
      return {
        question,
        score: totalScore,
        successProbability,
        reason: this.generateSelectionReason(
          question,
          successProbability,
          skillMastery,
          skillPriorityScore
        ),
      };
    });

    // Select question with highest score
    const bestMatch = scoredQuestions.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return {
      question: bestMatch.question,
      reason: bestMatch.reason,
      expectedDifficulty: this.getQuestionDifficulty(bestMatch.question),
      expectedSuccessProbability: bestMatch.successProbability,
    };
  }

  /**
   * Update student ability after answering a question
   * Uses Bayesian Knowledge Tracing (BKT) principles
   */
  updateStudentAbility(
    currentAbility: StudentAbility,
    question: Question,
    isCorrect: boolean,
    timeSpent: number,
    expectedTime: number
  ): StudentAbility {
    const updatedAbility = { ...currentAbility };
    
    // Get relevant skill IDs for this question
    const relevantSkills = question.skillTags.length > 0
      ? question.skillTags
      : [this.inferSkillFromQuestion(question)];
    
    // Update each relevant skill
    for (const skillId of relevantSkills) {
      const currentMastery = updatedAbility.skillMastery[skillId] ?? 0.5;
      const learningRate = 0.15; // How fast student learns from each question
      
      let newMastery: number;
      
      if (isCorrect) {
        // Correct answer: increase mastery
        // Bonus for quick correct answers (indicates strong understanding)
        const timeBonus = timeSpent < expectedTime * 0.8 ? 1.2 : 1.0;
        const masteryIncrease = learningRate * (1 - currentMastery) * timeBonus;
        newMastery = Math.min(1.0, currentMastery + masteryIncrease);
      } else {
        // Incorrect answer: slight decrease (but not too harsh)
        const masteryDecrease = learningRate * currentMastery * 0.5;
        newMastery = Math.max(0.0, currentMastery - masteryDecrease);
      }
      
      // Apply forgetting curve (if student hasn't practiced this skill recently)
      const lastPractice = updatedAbility.lastPracticeDate[skillId];
      if (lastPractice) {
        const daysSince = this.daysSince(lastPractice);
        if (daysSince > 0) {
          // Exponential forgetting: mastery decays over time
          const forgettingRate = 0.05; // 5% decay per day
          const forgettingFactor = Math.exp(-forgettingRate * daysSince);
          newMastery = newMastery * forgettingFactor;
        }
      }
      
      updatedAbility.skillMastery[skillId] = newMastery;
      updatedAbility.lastPracticeDate[skillId] = new Date();
      
      // Update learning velocity (rate of improvement)
      const velocity = newMastery - currentMastery;
      updatedAbility.learningVelocity[skillId] =
        (updatedAbility.learningVelocity[skillId] ?? 0) * 0.7 + velocity * 0.3; // Exponential moving average
    }
    
    // Update overall ability (weighted average of all skills)
    const skillMasteries = Object.values(updatedAbility.skillMastery);
    if (skillMasteries.length > 0) {
      updatedAbility.overallAbility =
        skillMasteries.reduce((sum, m) => sum + m, 0) / skillMasteries.length;
    }
    
    // Update global stats
    updatedAbility.totalQuestionsAnswered++;
    if (isCorrect) {
      updatedAbility.totalCorrectAnswers++;
    }
    updatedAbility.updatedAt = new Date();
    
    return updatedAbility;
  }

  /**
   * Calculate optimal difficulty for next question
   * Based on student's current ability and learning goals
   */
  private calculateOptimalDifficulty(studentAbility: StudentAbility): number {
    // Optimal difficulty is slightly above current ability (zone of proximal development)
    // This creates challenge without frustration
    const ability = studentAbility.overallAbility;
    return Math.min(1.0, ability + 0.1); // 10% above current ability
  }

  /**
   * Get question difficulty as a number (0.0 to 1.0)
   */
  private getQuestionDifficulty(question: Question): number {
    if (question.adaptiveData?.irtDifficulty !== undefined) {
      return question.adaptiveData.irtDifficulty;
    }
    
    // Fallback: map difficulty string to number
    const difficultyMap: Record<string, number> = {
      easy: 0.3,
      medium: 0.5,
      hard: 0.7,
    };
    
    return difficultyMap[question.difficulty] ?? 0.5;
  }

  /**
   * Get average mastery for skills relevant to this question
   */
  private getRelevantSkillMastery(
    question: Question,
    studentAbility: StudentAbility
  ): number {
    if (question.skillTags.length === 0) {
      return studentAbility.overallAbility;
    }
    
    const skillMasteries = question.skillTags
      .map(skillId => studentAbility.skillMastery[skillId] ?? 0.5)
      .filter(m => m > 0);
    
    if (skillMasteries.length === 0) {
      return studentAbility.overallAbility;
    }
    
    return skillMasteries.reduce((sum, m) => sum + m, 0) / skillMasteries.length;
  }

  /**
   * Infer skill ID from question if not explicitly tagged
   */
  private inferSkillFromQuestion(question: Question): string {
    // Simple inference based on subject and topic tags
    if (question.subject === 'reading') {
      return 'reading-main-ideas';
    } else if (question.subject === 'writing') {
      return 'writing-grammar';
    } else if (question.subject.includes('math')) {
      return 'math-algebra-basics';
    }
    
    return 'strategy-time-management'; // Default
  }

  /**
   * Generate human-readable reason for question selection
   */
  private generateSelectionReason(
    question: Question,
    successProbability: number,
    skillMastery: number,
    skillPriority: number
  ): string {
    if (skillPriority > 0.7) {
      return `Focusing on skill that needs practice (${Math.round(skillMastery * 100)}% mastery)`;
    } else if (successProbability > 0.8) {
      return 'Building confidence with slightly easier question';
    } else if (successProbability < 0.6) {
      return 'Challenging you with a harder question';
    } else {
      return 'Perfect difficulty match for optimal learning';
    }
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Schedule review using spaced repetition algorithm
   * Based on SuperMemo 2 algorithm
   */
  scheduleReview(skillMastery: number, lastReviewDate: Date | null): Date {
    // Optimal review intervals based on mastery level
    const intervals: Record<string, number> = {
      '0.0-0.3': 1,   // Review tomorrow (very low mastery)
      '0.3-0.5': 3,   // Review in 3 days
      '0.5-0.7': 7,   // Review in 1 week
      '0.7-0.85': 14, // Review in 2 weeks
      '0.85-1.0': 30, // Review in 1 month (high mastery)
    };
    
    // Determine interval based on mastery
    let days: number;
    if (skillMastery < 0.3) {
      days = intervals['0.0-0.3'];
    } else if (skillMastery < 0.5) {
      days = intervals['0.3-0.5'];
    } else if (skillMastery < 0.7) {
      days = intervals['0.5-0.7'];
    } else if (skillMastery < 0.85) {
      days = intervals['0.7-0.85'];
    } else {
      days = intervals['0.85-1.0'];
    }
    
    // If last review was recent, extend interval slightly
    if (lastReviewDate) {
      const daysSinceLastReview = this.daysSince(lastReviewDate);
      if (daysSinceLastReview < days) {
        days = Math.max(days, daysSinceLastReview + 1);
      }
    }
    
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + days);
    return reviewDate;
  }
}

// Export singleton instance
export const adaptiveEngine = new AdaptiveLearningEngine();
