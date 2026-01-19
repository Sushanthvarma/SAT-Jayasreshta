/**
 * Progressive Mastery Tracker Component
 * Shows unlock status, progress, and adaptive recommendations for progressive tests
 */

'use client';

import { useEffect, useState } from 'react';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import { playSound } from '@/lib/audio';
import toast from 'react-hot-toast';

interface TestMasteryStatus {
  testId: string;
  grade: number;
  testNumber: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestScore?: number;
  attempts: number;
  masteryThreshold: number;
  canRetry: boolean;
  retriesRemaining?: number;
}

interface MasteryProgress {
  grade: number;
  totalTests: number;
  unlockedTests: number;
  completedTests: number;
  masteredTests: number;
  nextUnlockedTest: number | null;
  progressPercentage: number;
}

interface AdaptiveRecommendation {
  recommendedStartingTest: number;
  reasoning: string;
  averageScore: number;
  performanceLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface ProgressiveMasteryTrackerProps {
  grade: number;
  onTestClick?: (testId: string) => void;
}

export default function ProgressiveMasteryTracker({ grade, onTestClick }: ProgressiveMasteryTrackerProps) {
  const [masteryStatus, setMasteryStatus] = useState<TestMasteryStatus[]>([]);
  const [progress, setProgress] = useState<MasteryProgress | null>(null);
  const [recommendation, setRecommendation] = useState<AdaptiveRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllTests, setShowAllTests] = useState(false);

  useEffect(() => {
    fetchMasteryData();
  }, [grade]);

  const fetchMasteryData = async () => {
    try {
      setLoading(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch(`/api/student/mastery?grade=${grade}&recommendation=true`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMasteryStatus(data.testMastery || []);
          setProgress(data.progress || null);
          setRecommendation(data.recommendation || null);
        }
      }
    } catch (error) {
      console.error('Error fetching mastery data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const displayedTests = showAllTests ? masteryStatus : masteryStatus.slice(0, 10);
  const unlockedTests = masteryStatus.filter(t => t.isUnlocked);
  const completedTests = masteryStatus.filter(t => t.isCompleted);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Progressive Assessment Progress</h2>
          <p className="text-gray-600 text-sm">Track your mastery and unlock new tests</p>
        </div>
        <button
          onClick={() => {
            playSound('click');
            fetchMasteryData();
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Progress Overview */}
      {progress && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{progress.unlockedTests}</div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{progress.completedTests}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{progress.masteredTests}</div>
              <div className="text-sm text-gray-600">Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{Math.round(progress.progressPercentage)}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress.progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Adaptive Recommendation */}
      {recommendation && recommendation.recommendedStartingTest > 1 && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-1">Adaptive Recommendation</h3>
              <p className="text-sm text-yellow-700 mb-2">{recommendation.reasoning}</p>
              <div className="flex items-center gap-4 text-xs text-yellow-600">
                <span>Recommended Start: Test {recommendation.recommendedStartingTest}</span>
                <span>•</span>
                <span>Performance: {recommendation.performanceLevel.toUpperCase()}</span>
                <span>•</span>
                <span>Avg Score: {Math.round(recommendation.averageScore * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Tests 1-{displayedTests.length}</h3>
          {masteryStatus.length > 10 && (
            <button
              onClick={() => {
                playSound('click');
                setShowAllTests(!showAllTests);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showAllTests ? 'Show Less' : `Show All ${masteryStatus.length} Tests`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {displayedTests.map((test) => {
            const isUnlocked = test.isUnlocked;
            const isCompleted = test.isCompleted;
            const isMastered = test.isCompleted && test.bestScore !== undefined && test.bestScore >= test.masteryThreshold;
            
            return (
              <button
                key={test.testId}
                onClick={() => {
                  if (isUnlocked && onTestClick) {
                    playSound('click');
                    onTestClick(test.testId);
                  } else {
                    playSound('error');
                    toast.error(`Test ${test.testNumber} is locked. Complete previous tests to unlock.`);
                  }
                }}
                disabled={!isUnlocked}
                className={`
                  relative p-3 rounded-lg font-bold text-sm transition-all duration-200
                  ${isUnlocked
                    ? isMastered
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg hover:scale-110 cursor-pointer'
                      : isCompleted
                        ? 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-md hover:scale-105 cursor-pointer'
                        : 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow hover:scale-105 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                  }
                `}
                title={
                  !isUnlocked
                    ? `Locked - Complete Test ${test.testNumber - 1} to unlock`
                    : isMastered
                      ? `Test ${test.testNumber} - Mastered (${Math.round((test.bestScore || 0) * 100)}%)`
                      : isCompleted
                        ? `Test ${test.testNumber} - Completed (${Math.round((test.bestScore || 0) * 100)}%)`
                        : `Test ${test.testNumber} - Available`
                }
              >
                {test.testNumber}
                {isMastered && (
                  <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                )}
                {isCompleted && !isMastered && (
                  <span className="absolute -top-1 -right-1 text-xs">✓</span>
                )}
                {!isUnlocked && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-400 to-purple-500"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-cyan-500"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-400 to-orange-500"></div>
          <span>Mastered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200"></div>
          <span>Locked</span>
        </div>
      </div>
    </div>
  );
}
