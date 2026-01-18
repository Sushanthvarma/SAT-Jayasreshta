/**
 * Skill Mastery Tracking System
 * Tracks student progress through skill tree and manages unlock conditions
 */

import { Skill, ALL_SKILLS, getSkillById } from '@/lib/types/skills';
import { StudentAbility } from './learning-engine';

export type SkillLevel = 'locked' | 'learning' | 'mastered' | 'legendary';

export interface SkillProgress {
  skillId: string;
  level: SkillLevel;
  mastery: number; // 0.0 to 1.0
  questionsCompleted: number;
  questionsRequired: number;
  accuracy: number; // 0-100%
  lastPracticeDate?: Date;
  nextReviewDate?: Date;
  unlockedAt?: Date;
  masteredAt?: Date;
}

export interface SkillTreeState {
  userId: string;
  skills: Record<string, SkillProgress>;
  updatedAt: Date;
}

/**
 * Skill Mastery Tracker
 */
export class SkillMasteryTracker {
  /**
   * Initialize skill tree for a new student
   */
  initializeSkillTree(userId: string): SkillTreeState {
    const skills: Record<string, SkillProgress> = {};
    
    for (const skill of ALL_SKILLS) {
      // Start with foundation skills unlocked
      const isUnlocked = skill.requiredPredecessors.length === 0;
      
      skills[skill.id] = {
        skillId: skill.id,
        level: isUnlocked ? 'learning' : 'locked',
        mastery: 0.0,
        questionsCompleted: 0,
        questionsRequired: skill.unlockCriteria.minQuestions,
        accuracy: 0,
        ...(isUnlocked && { unlockedAt: new Date() }),
      };
    }
    
    return {
      userId,
      skills,
      updatedAt: new Date(),
    };
  }

  /**
   * Update skill progress after answering a question
   */
  updateSkillProgress(
    skillTree: SkillTreeState,
    skillId: string,
    isCorrect: boolean,
    timeSpent: number,
    expectedTime: number
  ): SkillTreeState {
    const skillProgress = skillTree.skills[skillId];
    if (!skillProgress || skillProgress.level === 'locked') {
      return skillTree; // Can't update locked skills
    }

    const updated = { ...skillTree };
    const updatedSkill = { ...skillProgress };

    // Update question counts
    updatedSkill.questionsCompleted++;
    
    // Update accuracy (exponential moving average)
    const newAccuracy = isCorrect ? 100 : 0;
    updatedSkill.accuracy =
      (updatedSkill.accuracy * (updatedSkill.questionsCompleted - 1) + newAccuracy) /
      updatedSkill.questionsCompleted;

    // Update mastery (0.0 to 1.0)
    const skill = getSkillById(skillId);
    if (skill) {
      const masteryIncrease = isCorrect ? 0.02 : -0.01;
      updatedSkill.mastery = Math.max(
        0,
        Math.min(1, updatedSkill.mastery + masteryIncrease)
      );
    }

    // Update last practice date
    updatedSkill.lastPracticeDate = new Date();

    // Check if skill should level up
    updatedSkill.level = this.calculateSkillLevel(updatedSkill, skill);

    // Mark as mastered if criteria met
    if (
      updatedSkill.level === 'mastered' &&
      !updatedSkill.masteredAt &&
      updatedSkill.accuracy >= (skill?.unlockCriteria.minAccuracy ?? 80)
    ) {
      updatedSkill.masteredAt = new Date();
    }

    updated.skills[skillId] = updatedSkill;

    // Check if this mastery unlocks other skills
    this.checkUnlocks(updated);

    updated.updatedAt = new Date();
    return updated;
  }

  /**
   * Calculate skill level based on progress
   */
  private calculateSkillLevel(
    progress: SkillProgress,
    skill: Skill | undefined
  ): SkillLevel {
    if (!skill) return progress.level;

    // Legendary: 95%+ accuracy and 50+ questions
    if (progress.accuracy >= 95 && progress.questionsCompleted >= 50) {
      return 'legendary';
    }

    // Mastered: 80%+ accuracy and met question requirement
    if (
      progress.accuracy >= skill.unlockCriteria.minAccuracy &&
      progress.questionsCompleted >= skill.unlockCriteria.minQuestions
    ) {
      return 'mastered';
    }

    // Learning: unlocked but not yet mastered
    if (progress.level !== 'locked') {
      return 'learning';
    }

    return 'locked';
  }

  /**
   * Check if any locked skills should be unlocked
   */
  private checkUnlocks(skillTree: SkillTreeState): void {
    for (const skill of ALL_SKILLS) {
      const progress = skillTree.skills[skill.id];
      if (!progress || progress.level !== 'locked') {
        continue; // Already unlocked or doesn't exist
      }

      // Check if all prerequisites are mastered
      const allPrerequisitesMet = skill.requiredPredecessors.every(preqId => {
        const preqProgress = skillTree.skills[preqId];
        if (!preqProgress) return false;
        return (
          preqProgress.level === 'mastered' || preqProgress.level === 'legendary'
        );
      });

      if (allPrerequisitesMet) {
        progress.level = 'learning';
        progress.unlockedAt = new Date();
      }
    }
  }

  /**
   * Get skill tree visualization data
   */
  getSkillTreeVisualization(skillTree: SkillTreeState): {
    category: string;
    skills: Array<Skill & { progress: SkillProgress }>;
  }[] {
    const categories = ['reading', 'math', 'writing', 'test-strategy'] as const;
    
    return categories.map(category => ({
      category,
      skills: ALL_SKILLS.filter(s => s.category === category).map(skill => ({
        ...skill,
        progress: skillTree.skills[skill.id] ?? {
          skillId: skill.id,
          level: 'locked',
          mastery: 0,
          questionsCompleted: 0,
          questionsRequired: skill.unlockCriteria.minQuestions,
          accuracy: 0,
        },
      })),
    }));
  }

  /**
   * Get skills that need review (spaced repetition)
   */
  getSkillsNeedingReview(skillTree: SkillTreeState): SkillProgress[] {
    const now = new Date();
    return Object.values(skillTree.skills).filter(progress => {
      if (progress.level === 'locked') return false;
      if (!progress.nextReviewDate) return true; // Never reviewed
      return progress.nextReviewDate <= now;
    });
  }

  /**
   * Get student's strongest and weakest skills
   */
  getSkillAnalysis(skillTree: SkillTreeState): {
    strongest: SkillProgress[];
    weakest: SkillProgress[];
    needsPractice: SkillProgress[];
  } {
    const unlockedSkills = Object.values(skillTree.skills).filter(
      p => p.level !== 'locked'
    );

    const sortedByMastery = [...unlockedSkills].sort(
      (a, b) => b.mastery - a.mastery
    );

    return {
      strongest: sortedByMastery.slice(0, 3),
      weakest: sortedByMastery.slice(-3).reverse(),
      needsPractice: unlockedSkills
        .filter(p => p.mastery < 0.7)
        .sort((a, b) => a.mastery - b.mastery),
    };
  }
}

// Export singleton instance
export const skillMasteryTracker = new SkillMasteryTracker();
