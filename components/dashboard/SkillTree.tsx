/**
 * Skill Tree Visualization Component
 * Duolingo-style skill progression map
 */

'use client';

import { useState } from 'react';
import { Skill, SkillCategory } from '@/lib/types/skills';
import { SkillProgress, SkillLevel } from '@/lib/adaptive/skill-mastery';
import { skillMasteryTracker } from '@/lib/adaptive/skill-mastery';

interface SkillTreeProps {
  skillTree: {
    userId: string;
    skills: Record<string, SkillProgress>;
    updatedAt: Date;
  };
  onSkillClick?: (skillId: string) => void;
}

export default function SkillTree({ skillTree, onSkillClick }: SkillTreeProps) {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');

  const categories: Array<{ id: SkillCategory | 'all'; name: string; icon: string }> = [
    { id: 'all', name: 'All Skills', icon: '🌟' },
    { id: 'reading', name: 'Reading', icon: '📚' },
    { id: 'math', name: 'Math', icon: '🔢' },
    { id: 'writing', name: 'Writing', icon: '✍️' },
    { id: 'test-strategy', name: 'Strategy', icon: '🎯' },
  ];

  const getSkillIcon = (level: SkillLevel): string => {
    switch (level) {
      case 'locked':
        return '🔒';
      case 'learning':
        return '📘';
      case 'mastered':
        return '⭐';
      case 'legendary':
        return '💎';
      default:
        return '📘';
    }
  };

  const getSkillColor = (level: SkillLevel): string => {
    switch (level) {
      case 'locked':
        return 'bg-gray-200 text-gray-500';
      case 'learning':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'mastered':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'legendary':
        return 'bg-purple-100 text-purple-700 border-purple-400';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getSkillProgressColor = (mastery: number): string => {
    if (mastery >= 0.95) return 'bg-purple-500';
    if (mastery >= 0.8) return 'bg-yellow-500';
    if (mastery >= 0.5) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const visualization = skillMasteryTracker.getSkillTreeVisualization(skillTree);

  const filteredVisualization = selectedCategory === 'all'
    ? visualization
    : visualization.filter(v => v.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Skill Tree</h2>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Tree by Category */}
      <div className="space-y-8">
        {filteredVisualization.map(({ category, skills }) => (
          <div key={category} className="border-b border-gray-200 pb-6 last:border-b-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize flex items-center gap-2">
              {categories.find(c => c.id === category)?.icon}
              {category} Skills
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {skills.map((skill) => {
                const progress = skill.progress;
                const isClickable = progress.level !== 'locked' && onSkillClick;

                return (
                  <div
                    key={skill.id}
                    onClick={() => isClickable && onSkillClick(skill.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all
                      ${getSkillColor(progress.level)}
                      ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                    `}
                  >
                    {/* Skill Icon */}
                    <div className="text-4xl mb-2 text-center">
                      {getSkillIcon(progress.level)}
                    </div>

                    {/* Skill Name */}
                    <h4 className="font-bold text-sm mb-2 text-center">{skill.name}</h4>

                    {/* Progress Bar */}
                    {progress.level !== 'locked' && (
                      <div className="mb-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getSkillProgressColor(progress.mastery)}`}
                            style={{ width: `${progress.mastery * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-center mt-1">
                          {Math.round(progress.mastery * 100)}% Mastery
                        </p>
                      </div>
                    )}

                    {/* Progress Stats */}
                    {progress.level !== 'locked' && (
                      <div className="text-xs text-center space-y-1">
                        <p className="text-gray-600">
                          {progress.questionsCompleted} / {progress.questionsRequired} questions
                        </p>
                        <p className="text-gray-600">
                          {progress.accuracy}% accuracy
                        </p>
                      </div>
                    )}

                    {/* Locked Message */}
                    {progress.level === 'locked' && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Complete prerequisites to unlock
                      </p>
                    )}

                    {/* Level Badge */}
                    {progress.level === 'legendary' && (
                      <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        LEGENDARY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Skill Analysis Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const analysis = skillMasteryTracker.getSkillAnalysis(skillTree);
            const unlockedSkills = Object.values(skillTree.skills).filter(s => s.level !== 'locked');
            const masteredSkills = unlockedSkills.filter(s => s.level === 'mastered' || s.level === 'legendary');
            
            return (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{unlockedSkills.length}</p>
                  <p className="text-sm text-gray-600">Unlocked</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{masteredSkills.length}</p>
                  <p className="text-sm text-gray-600">Mastered</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {unlockedSkills.filter(s => s.level === 'legendary').length}
                  </p>
                  <p className="text-sm text-gray-600">Legendary</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-600">{analysis.needsPractice.length}</p>
                  <p className="text-sm text-gray-600">Need Practice</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
