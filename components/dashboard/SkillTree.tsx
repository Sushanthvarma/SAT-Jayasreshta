/**
 * Skill Tree Visualization Component
 * Modern, fluid design with smooth animations
 */

'use client';

import { useState, useEffect } from 'react';
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
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories: Array<{ id: SkillCategory | 'all'; name: string; icon: string; gradient: string; bgColor: string }> = [
    { id: 'all', name: 'All Skills', icon: '✨', gradient: 'from-indigo-500 via-purple-500 to-pink-500', bgColor: 'bg-indigo-50' },
    { id: 'reading', name: 'Reading', icon: '📚', gradient: 'from-blue-500 via-cyan-500 to-teal-500', bgColor: 'bg-blue-50' },
    { id: 'math', name: 'Math', icon: '🔢', gradient: 'from-emerald-500 via-green-500 to-lime-500', bgColor: 'bg-emerald-50' },
    { id: 'writing', name: 'Writing', icon: '✍️', gradient: 'from-orange-500 via-red-500 to-rose-500', bgColor: 'bg-orange-50' },
    { id: 'test-strategy', name: 'Strategy', icon: '🎯', gradient: 'from-pink-500 via-rose-500 to-fuchsia-500', bgColor: 'bg-pink-50' },
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

  const getSkillStyle = (level: SkillLevel, mastery: number) => {
    const baseStyle = 'relative overflow-hidden transition-all duration-500 ease-out';
    
    switch (level) {
      case 'locked':
        return {
          className: `${baseStyle} bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 opacity-60`,
          glow: 'shadow-none',
        };
      case 'learning':
        return {
          className: `${baseStyle} bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 border-2 border-blue-400`,
          glow: 'shadow-lg shadow-blue-500/50',
        };
      case 'mastered':
        return {
          className: `${baseStyle} bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-500 border-2 border-yellow-400`,
          glow: 'shadow-xl shadow-orange-500/50',
        };
      case 'legendary':
        return {
          className: `${baseStyle} bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 border-2 border-purple-400`,
          glow: 'shadow-2xl shadow-purple-500/60 animate-pulse',
        };
      default:
        return {
          className: `${baseStyle} bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-300`,
          glow: 'shadow-none',
        };
    }
  };

  const visualization = skillMasteryTracker.getSkillTreeVisualization(skillTree);

  const filteredVisualization = selectedCategory === 'all'
    ? visualization
    : visualization.filter(v => v.category === selectedCategory);

  // Calculate summary stats
  const unlockedSkills = Object.values(skillTree.skills).filter(s => s.level !== 'locked');
  const masteredSkills = unlockedSkills.filter(s => s.level === 'mastered' || s.level === 'legendary');
  const legendarySkills = unlockedSkills.filter(s => s.level === 'legendary');
  const analysis = skillMasteryTracker.getSkillAnalysis(skillTree);

  const totalSkills = Object.keys(skillTree.skills).length;
  const progressPercentage = totalSkills > 0 ? (unlockedSkills.length / totalSkills) * 100 : 0;

  return (
    <div className="relative">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl opacity-50 -z-10"></div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 p-8 overflow-hidden relative">
        {/* Floating Orbs Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl -z-0"></div>

        {/* Header Section */}
        <div className="relative z-10 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Skill Mastery Tree
              </h2>
              <p className="text-gray-600">Track your progress and unlock new skills</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{Math.round(progressPercentage)}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Category Filter - Modern Pills */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category, index) => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    group relative px-5 py-2.5 rounded-full font-semibold text-sm
                    transition-all duration-300 ease-out
                    ${isSelected
                      ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg scale-105`
                      : `${category.bgColor} text-gray-700 hover:scale-105 hover:shadow-md`
                    }
                    transform
                  `}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: mounted ? 'fadeInUp 0.5s ease-out forwards' : 'none',
                    opacity: mounted ? 1 : 0,
                  }}
                >
                  <span className="text-lg mr-2">{category.icon}</span>
                  {category.name}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill Tree Content */}
        <div className="relative z-10 space-y-10">
          {filteredVisualization.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4 animate-bounce">🌱</div>
              <p className="text-gray-600 text-lg">Start practicing to unlock skills!</p>
            </div>
          ) : (
            filteredVisualization.map(({ category, skills }, categoryIndex) => {
              const categoryInfo = categories.find(c => c.id === category);
              return (
                <div
                  key={category}
                  className="space-y-6"
                  style={{
                    animation: mounted ? `fadeInUp 0.6s ease-out ${categoryIndex * 0.1}s forwards` : 'none',
                    opacity: mounted ? 1 : 0,
                  }}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-12 bg-gradient-to-b ${categoryInfo?.gradient || 'from-gray-400 to-gray-500'} rounded-full`}></div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-3xl">{categoryInfo?.icon}</span>
                        <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                          {category.replace('-', ' ')} Skills
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {skills.filter(s => s.progress.level !== 'locked').length} of {skills.length} unlocked
                      </p>
                    </div>
                  </div>

                  {/* Skills Grid - Fluid Layout */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {skills.map((skill, skillIndex) => {
                      const progress = skill.progress;
                      const isClickable = progress.level !== 'locked' && onSkillClick;
                      const isHovered = hoveredSkill === skill.id;
                      const style = getSkillStyle(progress.level, progress.mastery);

                      return (
                        <div
                          key={skill.id}
                          onClick={() => isClickable && onSkillClick(skill.id)}
                          onMouseEnter={() => setHoveredSkill(skill.id)}
                          onMouseLeave={() => setHoveredSkill(null)}
                          className={`
                            ${style.className}
                            ${style.glow}
                            ${isClickable 
                              ? 'cursor-pointer hover:scale-110 hover:-translate-y-2 active:scale-95' 
                              : 'cursor-not-allowed'
                            }
                            ${isHovered && isClickable ? 'ring-4 ring-indigo-300 ring-opacity-60 z-20' : ''}
                            rounded-2xl p-5 transform-gpu
                            transition-all duration-300 ease-out
                          `}
                          style={{
                            animationDelay: `${(categoryIndex * 100) + (skillIndex * 50)}ms`,
                            animation: mounted ? 'fadeInScale 0.5s ease-out forwards' : 'none',
                            opacity: mounted ? 1 : 0,
                          }}
                        >
                          {/* Skill Icon */}
                          <div className="text-center mb-3">
                            <div className="text-5xl transform transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12 inline-block">
                              {getSkillIcon(progress.level)}
                            </div>
                          </div>

                          {/* Skill Name */}
                          <h4 className="font-bold text-sm mb-3 text-center text-white drop-shadow-md line-clamp-2 min-h-[2.5rem]">
                            {skill.name}
                          </h4>

                          {/* Progress Ring */}
                          {progress.level !== 'locked' && (
                            <div className="relative w-20 h-20 mx-auto mb-3">
                              <svg className="transform -rotate-90 w-20 h-20">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="36"
                                  stroke="rgba(255,255,255,0.3)"
                                  strokeWidth="6"
                                  fill="none"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="36"
                                  stroke="white"
                                  strokeWidth="6"
                                  fill="none"
                                  strokeDasharray={`${2 * Math.PI * 36}`}
                                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress.mastery)}`}
                                  className="transition-all duration-1000 ease-out"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">
                                  {Math.round(progress.mastery * 100)}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          {progress.level !== 'locked' && (
                            <div className="text-xs text-center space-y-1 text-white/90">
                              <p className="font-semibold">
                                {progress.questionsCompleted}/{progress.questionsRequired}
                              </p>
                              <p className="text-white/80 text-[10px]">
                                {progress.accuracy}% accuracy
                              </p>
                            </div>
                          )}

                          {/* Locked Overlay */}
                          {progress.level === 'locked' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                              <p className="text-xs text-white font-bold">🔒 Locked</p>
                            </div>
                          )}

                          {/* Legendary Badge */}
                          {progress.level === 'legendary' && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
                              ⭐ LEGENDARY
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Progress Summary Cards */}
        <div className="relative z-10 mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Progress Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl border-2 border-blue-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
              <div className="text-3xl font-bold text-blue-600 mb-1">{unlockedSkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Unlocked</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-2xl border-2 border-yellow-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
              <div className="text-3xl font-bold text-yellow-600 mb-1">{masteredSkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Mastered</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
              <div className="text-3xl font-bold text-purple-600 mb-1">{legendarySkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Legendary</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-5 rounded-2xl border-2 border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
              <div className="text-3xl font-bold text-gray-600 mb-1">{analysis.needsPractice.length}</div>
              <div className="text-sm text-gray-700 font-medium">Need Practice</div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
