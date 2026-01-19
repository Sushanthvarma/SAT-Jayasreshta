/**
 * Skill Tree Visualization Component
 * Beautiful, engaging, and easy-to-navigate design
 * Gamified experience to motivate students
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['reading', 'math', 'writing', 'test-strategy']));

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories: Array<{ id: SkillCategory | 'all'; name: string; icon: string; gradient: string; bgColor: string; color: string }> = [
    { id: 'all', name: 'All Skills', icon: '✨', gradient: 'from-indigo-500 via-purple-500 to-pink-500', bgColor: 'bg-indigo-50', color: 'text-indigo-600' },
    { id: 'reading', name: 'Reading', icon: '📚', gradient: 'from-blue-500 via-cyan-500 to-teal-500', bgColor: 'bg-blue-50', color: 'text-blue-600' },
    { id: 'math', name: 'Math', icon: '🔢', gradient: 'from-emerald-500 via-green-500 to-lime-500', bgColor: 'bg-emerald-50', color: 'text-emerald-600' },
    { id: 'writing', name: 'Writing', icon: '✍️', gradient: 'from-orange-500 via-red-500 to-rose-500', bgColor: 'bg-orange-50', color: 'text-orange-600' },
    { id: 'test-strategy', name: 'Strategy', icon: '🎯', gradient: 'from-pink-500 via-rose-500 to-fuchsia-500', bgColor: 'bg-pink-50', color: 'text-pink-600' },
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
          className: `${baseStyle} bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 border-2 border-gray-400 opacity-70`,
          glow: 'shadow-none',
          pulse: false,
        };
      case 'learning':
        return {
          className: `${baseStyle} bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 border-2 border-blue-400`,
          glow: 'shadow-lg shadow-blue-500/50',
          pulse: true,
        };
      case 'mastered':
        return {
          className: `${baseStyle} bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-500 border-2 border-yellow-400`,
          glow: 'shadow-xl shadow-orange-500/50',
          pulse: false,
        };
      case 'legendary':
        return {
          className: `${baseStyle} bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 border-2 border-purple-400`,
          glow: 'shadow-2xl shadow-purple-500/60',
          pulse: true,
        };
      default:
        return {
          className: `${baseStyle} bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-300`,
          glow: 'shadow-none',
          pulse: false,
        };
    }
  };

  const visualization = skillMasteryTracker.getSkillTreeVisualization(skillTree);

  // Filter by category and search
  const filteredVisualization = useMemo(() => {
    let filtered = selectedCategory === 'all'
      ? visualization
      : visualization.filter(v => v.category === selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(cat => ({
        ...cat,
        skills: cat.skills.filter(skill => 
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query)
        ),
      })).filter(cat => cat.skills.length > 0);
    }

    return filtered;
  }, [visualization, selectedCategory, searchQuery]);

  // Calculate summary stats
  const unlockedSkills = Object.values(skillTree.skills).filter(s => s.level !== 'locked');
  const masteredSkills = unlockedSkills.filter(s => s.level === 'mastered' || s.level === 'legendary');
  const legendarySkills = unlockedSkills.filter(s => s.level === 'legendary');
  const analysis = skillMasteryTracker.getSkillAnalysis(skillTree);

  const totalSkills = Object.keys(skillTree.skills).length || visualization.reduce((sum, cat) => sum + cat.skills.length, 0);
  const progressPercentage = totalSkills > 0 ? (unlockedSkills.length / totalSkills) * 100 : 0;
  const masteryPercentage = totalSkills > 0 ? (masteredSkills.length / totalSkills) * 100 : 0;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="relative">
      {/* Animated Background with Particles */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 via-pink-50 to-orange-50 rounded-3xl opacity-60 -z-10"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl -z-0 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-blue-200/40 to-cyan-200/40 rounded-full blur-3xl -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100/50 p-6 md:p-8 overflow-hidden relative">
        {/* Header Section - Enhanced */}
        <div className="relative z-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <span className="text-4xl animate-bounce">🌳</span>
                Skill Mastery Tree
              </h2>
              <p className="text-gray-600 text-sm md:text-base">Unlock skills, master concepts, and level up your SAT preparation!</p>
            </div>
            
            {/* Progress Stats - Compact Cards */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg min-w-[100px]">
                <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
                <div className="text-xs opacity-90">Unlocked</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg min-w-[100px]">
                <div className="text-2xl font-bold">{Math.round(masteryPercentage)}%</div>
                <div className="text-xs opacity-90">Mastered</div>
              </div>
            </div>
          </div>
          
          {/* Overall Progress Bar - Enhanced */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-indigo-600">{unlockedSkills.length}/{totalSkills} Skills</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">⊞</span> Grid
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  viewMode === 'tree'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">🌳</span> Tree
              </button>
            </div>
          </div>
          
          {/* Category Filter - Enhanced Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => {
              const isSelected = selectedCategory === category.id;
              const categoryData = visualization.find(v => v.category === category.id);
              const unlockedCount = categoryData?.skills.filter(s => s.progress.level !== 'locked').length || 0;
              const totalCount = categoryData?.skills.length || 0;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    group relative px-4 py-2.5 rounded-full font-semibold text-sm
                    transition-all duration-300 ease-out transform
                    ${isSelected
                      ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg scale-105 ring-2 ring-white/50`
                      : `${category.bgColor} ${category.color} hover:scale-105 hover:shadow-md`
                    }
                  `}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: mounted ? 'fadeInUp 0.5s ease-out forwards' : 'none',
                    opacity: mounted ? 1 : 0,
                  }}
                >
                  <span className="text-lg mr-2">{category.icon}</span>
                  {category.name}
                  {category.id !== 'all' && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      isSelected ? 'bg-white/20' : 'bg-white/60'
                    }`}>
                      {unlockedCount}/{totalCount}
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill Tree Content */}
        <div className="relative z-10 space-y-8">
          {filteredVisualization.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-8xl mb-6 animate-bounce">🌱</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Skills Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 'Try a different search term' : 'Start practicing to unlock skills!'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredVisualization.map(({ category, skills }, categoryIndex) => {
              const categoryInfo = categories.find(c => c.id === category);
              const isExpanded = expandedCategories.has(category);
              const unlockedCount = skills.filter(s => s.progress.level !== 'locked').length;
              const masteredCount = skills.filter(s => s.progress.level === 'mastered' || s.progress.level === 'legendary').length;
              
              return (
                <div
                  key={category}
                  className="bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-gray-100 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{
                    animation: mounted ? `fadeInUp 0.6s ease-out ${categoryIndex * 0.1}s forwards` : 'none',
                    opacity: mounted ? 1 : 0,
                  }}
                >
                  {/* Collapsible Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-2 h-16 bg-gradient-to-b ${categoryInfo?.gradient || 'from-gray-400 to-gray-500'} rounded-full`}></div>
                      <div className="flex-1 text-left">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3 mb-1">
                          <span className="text-4xl">{categoryInfo?.icon}</span>
                          <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {category.replace('-', ' ').toUpperCase()} Skills
                          </span>
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-indigo-600">{unlockedCount}</span>
                            <span>unlocked</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-yellow-600">{masteredCount}</span>
                            <span>mastered</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-gray-600">{skills.length}</span>
                            <span>total</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400 transform transition-transform duration-300" style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </div>
                  </button>

                  {/* Skills Grid - Enhanced */}
                  {isExpanded && (
                    <div className="p-5 pt-0">
                      <div className={`grid gap-4 ${
                        viewMode === 'grid'
                          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      }`}>
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
                                rounded-2xl p-4 md:p-5 transform-gpu
                                transition-all duration-300 ease-out
                                ${style.pulse ? 'animate-pulse-subtle' : ''}
                              `}
                              style={{
                                animationDelay: `${(categoryIndex * 100) + (skillIndex * 50)}ms`,
                                animation: mounted ? 'fadeInScale 0.5s ease-out forwards' : 'none',
                                opacity: mounted ? 1 : 0,
                              }}
                            >
                              {/* Skill Icon - Enhanced */}
                              <div className="text-center mb-3">
                                <div className="text-4xl md:text-5xl transform transition-transform duration-300 inline-block hover:scale-125 hover:rotate-12">
                                  {getSkillIcon(progress.level)}
                                </div>
                              </div>

                              {/* Skill Name */}
                              <h4 className="font-bold text-xs md:text-sm mb-3 text-center text-white drop-shadow-lg line-clamp-2 min-h-[2.5rem] leading-tight">
                                {skill.name}
                              </h4>

                              {/* Progress Ring - Enhanced */}
                              {progress.level !== 'locked' && (
                                <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-3">
                                  <svg className="transform -rotate-90 w-full h-full">
                                    <circle
                                      cx="50%"
                                      cy="50%"
                                      r="45%"
                                      stroke="rgba(255,255,255,0.3)"
                                      strokeWidth="4"
                                      fill="none"
                                    />
                                    <circle
                                      cx="50%"
                                      cy="50%"
                                      r="45%"
                                      stroke="white"
                                      strokeWidth="4"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 45}`}
                                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress.mastery)}`}
                                      className="transition-all duration-1000 ease-out"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white drop-shadow-md">
                                      {Math.round(progress.mastery * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Stats - Enhanced */}
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-2xl backdrop-blur-sm">
                                  <p className="text-lg mb-1">🔒</p>
                                  <p className="text-xs text-white font-bold">Locked</p>
                                </div>
                              )}

                              {/* Legendary Badge - Enhanced */}
                              {progress.level === 'legendary' && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1">
                                  <span>💎</span>
                                  <span>LEGENDARY</span>
                                </div>
                              )}

                              {/* Hover Tooltip */}
                              {isHovered && isClickable && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-30 whitespace-nowrap">
                                  {skill.description || `Click to practice ${skill.name}`}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Progress Summary Cards - Enhanced */}
        <div className="relative z-10 mt-10 pt-8 border-t-2 border-gray-200">
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>📊</span>
            Progress Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 p-5 rounded-2xl border-2 border-blue-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{unlockedSkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Unlocked Skills</div>
              <div className="text-xs text-gray-500 mt-1">Keep going! 🚀</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 p-5 rounded-2xl border-2 border-yellow-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-yellow-600 mb-1">{masteredSkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Mastered Skills</div>
              <div className="text-xs text-gray-500 mt-1">Excellent work! ⭐</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 p-5 rounded-2xl border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">{legendarySkills.length}</div>
              <div className="text-sm text-gray-700 font-medium">Legendary Skills</div>
              <div className="text-xs text-gray-500 mt-1">You're amazing! 💎</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-5 rounded-2xl border-2 border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105 transform cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-gray-600 mb-1">{analysis.needsPractice.length}</div>
              <div className="text-sm text-gray-700 font-medium">Need Practice</div>
              <div className="text-xs text-gray-500 mt-1">Focus here! 📚</div>
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

          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes pulse-subtle {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }

          .animate-shimmer {
            animation: shimmer 2s infinite;
          }

          .animate-pulse-subtle {
            animation: pulse-subtle 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
