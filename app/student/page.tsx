'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Test } from '@/lib/types/test';
import { getPublishedTests } from '@/lib/firestore/tests-client';
import { getUserTestAttempts } from '@/lib/firestore/tests-client';
import { TestAttempt } from '@/lib/types/test';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import TestCard from '@/components/ui/TestCard';
import XPProgressBar from '@/components/gamification/XPProgressBar';
import DailyGoalWidget from '@/components/gamification/DailyGoalWidget';
import DailyChallenges from '@/components/dashboard/DailyChallenges';
import SkillTree from '@/components/dashboard/SkillTree';
import ProgressiveMasteryTracker from '@/components/dashboard/ProgressiveMasteryTracker';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import { playSound } from '@/lib/audio';

export default function StudentDashboard() {
  const { user, userData, loading: authLoading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [allTests, setAllTests] = useState<Test[]>([]); // Store all tests
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [testsLoading, setTestsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [dailyChallenges, setDailyChallenges] = useState<any[]>([]);
  const [skillTree, setSkillTree] = useState<any>(null);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [skillTreeLoading, setSkillTreeLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null); // '4th', '9th', '10th', '11th', '12th' or null
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all'); // 'all', 'beginner', 'intermediate', 'advanced', 'expert'
  const [selectedSubject, setSelectedSubject] = useState<string>('all'); // 'all', 'reading', 'writing', 'math-calculator', 'math-no-calculator'
  const [activeTab, setActiveTab] = useState<'tests' | 'progress' | 'challenges'>('tests');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const gradeInitialized = useRef(false); // Track if we've already processed initial grade
  const [allGradeTests, setAllGradeTests] = useState<Test[]>([]); // Store all tests for the grade

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch available tests
  useEffect(() => {
    if (user) {
      const fetchTests = async () => {
        try {
          setTestsLoading(true);
          console.log('🔍 Fetching tests from /api/tests...');
          const response = await fetch('/api/tests');
          console.log('📡 Response status:', response.status, response.statusText);
          
          const data = await response.json();
          console.log('📊 Response data:', {
            success: data.success,
            count: data.count,
            testsLength: data.tests?.length || 0,
            firstTest: data.tests?.[0] ? {
              id: data.tests[0].id,
              title: data.tests[0].title,
              status: data.tests[0].status,
              isActive: data.tests[0].isActive,
            } : null,
          });
          
          if (data.success) {
            const publishedTests = data.tests || [];
            console.log(`✅ Loaded ${publishedTests.length} published tests`);
            setAllTests(publishedTests);
            
            if (publishedTests.length === 0) {
              console.warn('⚠️ No tests found. Checking if tests are published and active...');
              toast('No tests available. Check if tests are published and active.');
            }
          } else {
            console.error('❌ API returned success=false:', data.error);
            // Don't show toast for quota errors - they're temporary and will resolve
            if (!data.error?.includes('quota') && !data.error?.includes('RESOURCE_EXHAUSTED')) {
              toast.error(data.error || 'Failed to load tests');
            }
          }
        } catch (error) {
          console.error('❌ Error fetching tests:', error);
          toast.error('Failed to load tests');
        } finally {
          setTestsLoading(false);
          setLoading(false);
        }
      };

      fetchTests();
    }
  }, [user]);

  // Fetch user's test attempts (fetch recent ones for UI, use userData.totalTestsCompleted for count)
  useEffect(() => {
    if (user) {
      const fetchAttempts = async () => {
        try {
          // Fetch recent attempts for UI display (last 10)
          // For accurate count, use userData.totalTestsCompleted which is synced from server
          const userAttempts = await getUserTestAttempts(user.uid, 10);
          setAttempts(userAttempts);
        } catch (error) {
          console.error('Error fetching attempts:', error);
        }
      };

      fetchAttempts();
    }
  }, [user]);

  // Fetch user stats for XP and leaderboard
  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        try {
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const response = await fetch('/api/leaderboard?limit=1&stats=true&comparison=true', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });

          const data = await response.json();
          if (data.success) {
            setUserStats({
              stats: data.stats,
              comparison: data.comparison,
            });
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };

      fetchStats();
    }
  }, [user]);

  // Fetch daily challenges
  useEffect(() => {
    if (user) {
      const fetchChallenges = async () => {
        try {
          setChallengesLoading(true);
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const response = await fetch('/api/daily-challenges', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });

          const data = await response.json();
          if (data.success) {
            setDailyChallenges(data.challenges || []);
          } else {
            // Silently handle quota errors - they're temporary
            if (!data.error?.includes('quota') && !data.error?.includes('RESOURCE_EXHAUSTED')) {
              console.error('Error loading daily challenges:', data.error);
            }
          }
        } catch (error) {
          console.error('Error fetching daily challenges:', error);
        } finally {
          setChallengesLoading(false);
        }
      };

      fetchChallenges();
    }
  }, [user]);

  // Fetch skill mastery data
  useEffect(() => {
    if (user) {
      const fetchSkillTree = async () => {
        try {
          setSkillTreeLoading(true);
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const response = await fetch('/api/skill-mastery', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          });

          const data = await response.json();
          if (data.success) {
            setSkillTree(data.skillTree);
          } else {
            // Silently handle quota errors - they're temporary
            if (!data.error?.includes('quota') && !data.error?.includes('RESOURCE_EXHAUSTED')) {
              console.error('Error loading skill mastery:', data.error);
            }
          }
        } catch (error) {
          console.error('Error fetching skill mastery:', error);
        } finally {
          setSkillTreeLoading(false);
        }
      };

      fetchSkillTree();
    }
  }, [user]);

  // Set initial grade from user profile when userData loads
  useEffect(() => {
    // Only process when userData is available
    if (!userData) {
      return;
    }
    
    // If grade is already set locally, don't override it (user just selected it)
    if (selectedGrade && gradeInitialized.current) {
      // Verify the grade matches what's in the profile
      const userGrade = userData.grade;
      if (userGrade) {
        const gradeMatch = userGrade.match(/(\d+)(th|st|nd|rd)/i);
        if (gradeMatch) {
          const extractedGrade = gradeMatch[0].toLowerCase();
          // If profile grade matches selected grade, we're good
          if (selectedGrade === extractedGrade) {
            setShowGradeModal(false);
            return;
          }
        }
      }
    }
    
    const userGrade = userData.grade;
    
    if (userGrade) {
      // Extract grade number (e.g., "4th Grade" -> "4th", "9th Grade" -> "9th")
      const gradeMatch = userGrade.match(/(\d+)(th|st|nd|rd)/i);
      if (gradeMatch) {
        const extractedGrade = gradeMatch[0].toLowerCase();
        // Always set the grade from profile if it exists
        if (selectedGrade !== extractedGrade) {
          setSelectedGrade(extractedGrade);
        }
        setShowGradeModal(false); // Ensure modal is closed
        gradeInitialized.current = true;
        return;
      }
    }
    
    // If no grade in profile and we haven't initialized yet, show modal
    // But only if grade is not already set locally
    if (!gradeInitialized.current && !selectedGrade) {
      setShowGradeModal(true);
      gradeInitialized.current = true; // Mark as initialized to prevent showing modal again on re-renders
    }
  }, [userData, selectedGrade]); // Include selectedGrade to check if it's already set

  // Filter tests by grade, difficulty, and subject
  useEffect(() => {
    if (!selectedGrade) {
      setTests([]);
      setAllGradeTests([]);
      return;
    }
    
    // Filter tests by grade (supports 4th, 9th, 10th, 11th, 12th, etc.)
    let filteredTests = allTests.filter(test => {
      // Check if test ID starts with grade (e.g., "4th-...", "9th-...")
      const matchesGrade = test.id.toLowerCase().startsWith(selectedGrade.toLowerCase() + '-') ||
        test.tags?.some(tag => tag.toLowerCase() === selectedGrade.toLowerCase());
      
      if (!matchesGrade) return false;
      
      // Filter by difficulty
      if (selectedDifficulty !== 'all') {
        // Map user-friendly difficulty to test difficulty
        const difficultyMap: Record<string, string[]> = {
          'easy': ['beginner'],
          'medium': ['intermediate'],
          'hard': ['advanced', 'expert'],
        };
        const testDifficulties = difficultyMap[selectedDifficulty] || [selectedDifficulty];
        if (!testDifficulties.includes(test.difficulty)) {
          return false;
        }
      }
      
      // Filter by subject - check if test has a section with matching subject
      if (selectedSubject !== 'all') {
        const hasMatchingSubject = test.sections?.some(section => {
          // Normalize subject names for comparison
          const sectionSubject = section.subject?.toLowerCase();
          const filterSubject = selectedSubject.toLowerCase();
          
          // Handle math subjects (both calculator and no-calculator match "math")
          if (filterSubject === 'math') {
            return sectionSubject === 'math-calculator' || sectionSubject === 'math-no-calculator';
          }
          return sectionSubject === filterSubject;
        });
        
        if (!hasMatchingSubject) return false;
      }
      
      return true;
    });

    // Store all grade tests for reference
    setAllGradeTests(filteredTests);

    // Sort tests by ID (alphabetical order) to ensure consistent sequential order
    const sortedTests = [...filteredTests].sort((a, b) => a.id.localeCompare(b.id));

    // Find completed test IDs
    const completedTestIds = new Set(
      attempts
        .filter(a => a.status === 'submitted')
        .map(a => a.testId)
    );

    // Show only ONE test - the next pending test based on filters
    // If filters are applied, find next pending from filtered results
    // Otherwise, find next pending from all grade tests
    const nextPendingTest = sortedTests.find(test => !completedTestIds.has(test.id));

    // Show only the next pending test, or empty array if all completed
    setTests(nextPendingTest ? [nextPendingTest] : []);
  }, [selectedGrade, selectedDifficulty, selectedSubject, allTests, attempts]);

  // Save grade preference to user profile
  const handleGradeSelect = async (grade: string) => {
    try {
      playSound('click');
      setSavingGrade(true);
      
      // Check if user is authenticated
      if (!user) {
        playSound('error');
        toast.error('Please sign in to save your grade preference');
        setSavingGrade(false);
        return;
      }

      const auth = getAuthInstance();
      
      // Wait for auth to be ready
      if (!auth.currentUser) {
        toast.error('Authentication not ready. Please try again.');
        setSavingGrade(false);
        return;
      }

      const idToken = await getIdToken(auth.currentUser);
      
      if (!idToken) {
        toast.error('Failed to get authentication token');
        setSavingGrade(false);
        return;
      }
      
      // Update profile with grade
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: `${grade.charAt(0).toUpperCase() + grade.slice(1)} Grade`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile API error:', response.status, errorText);
        
        // Check if it's a quota error - don't throw, just log and return
        const isQuotaError = errorText?.includes('quota') || 
                            errorText?.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
          console.warn('⚠️ Quota error detected in grade selection, but continuing');
          // Don't show error toast for quota issues - they're temporary
          setSavingGrade(false);
          return;
        }
        
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.success) {
        playSound('success');
        // Set grade locally immediately
        const formattedGrade = grade.charAt(0).toUpperCase() + grade.slice(1);
        setSelectedGrade(grade);
        setShowGradeModal(false);
        toast.success(`Grade set to ${formattedGrade} Grade`);
        
        // Keep gradeInitialized as true so modal doesn't show again
        // The refresh will update userData in the background
        gradeInitialized.current = true;
        
        console.log('✅ Grade saved successfully:', grade);
        
        // Refresh user data in the background (don't wait for it)
        // Add a small delay to ensure Firestore write is committed
        setTimeout(() => {
          refreshProfile().then(() => {
            console.log('✅ Profile refreshed after grade save');
          }).catch(error => {
            console.error('Error refreshing profile after grade save:', error);
            // Don't show error to user - grade is already set locally
          });
        }, 500); // 500ms delay to ensure Firestore write is committed
      } else {
        playSound('error');
        console.error('Profile update failed:', data);
        toast.error(data.error || 'Failed to save grade preference');
      }
    } catch (error: any) {
      playSound('error');
      console.error('Error saving grade:', error);
      toast.error(error.message || 'Failed to save grade preference. Please try again.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Use userData.totalTestsCompleted for accurate count (synced from server)
  // Fallback to attempts count if userData not available
  const completedTests = (userData as any)?.totalTestsCompleted || attempts.filter(a => a.status === 'submitted').length;
  const inProgressTests = attempts.filter(a => a.status === 'in-progress' || a.status === 'paused').length;
  
  // Generate all grades from 4th to 12th
  const allGradesFrom4to12 = Array.from({ length: 9 }, (_, i) => {
    const gradeNum = i + 4; // 4, 5, 6, 7, 8, 9, 10, 11, 12
    // Get the suffix (th, st, nd, rd)
    const suffix = gradeNum === 11 || gradeNum === 12 ? 'th' :
                   gradeNum === 1 ? 'st' :
                   gradeNum === 2 ? 'nd' :
                   gradeNum === 3 ? 'rd' : 'th';
    return `${gradeNum}${suffix}`;
  });
  
  // Also get grades from tests (in case there are tests for other grades)
  const gradesFromTests = [...new Set(
    allTests
      .map(test => {
        // Extract grade from test ID (e.g., "4th-week-1-reading" -> "4th", "9th-week-1-reading" -> "9th")
        const match = test.id.match(/^(\d+th)/i);
        if (match) {
          return match[1].toLowerCase();
        }
        // Also check tags for grade
        if (test.tags) {
          const gradeTag = test.tags.find((tag: string) => /^\d+th$/i.test(tag));
          if (gradeTag) {
            return gradeTag.toLowerCase();
          }
        }
        return null;
      })
      .filter((grade): grade is string => grade !== null)
  )];
  
  // Combine all grades from 4th to 12th with any additional grades found in tests
  // Filter to only show grades from 4th to 12th, remove duplicates, and sort
  const availableGrades = [...new Set([...allGradesFrom4to12, ...gradesFromTests])]
    .filter(grade => {
      const gradeNum = parseInt(grade);
      return gradeNum >= 4 && gradeNum <= 12; // Only show grades 4th through 12th
    })
    .sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section - Mobile Responsive */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                {(userData?.photoURL || user?.photoURL) && !imageError ? (
                  <div className="relative">
                    <img
                      src={userData?.photoURL || user?.photoURL || ''}
                      alt={userData?.displayName || user?.displayName || 'Student'}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-3 border-white shadow-lg ring-2 ring-indigo-200"
                      onError={() => setImageError(true)}
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full shadow-md"></div>
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-base sm:text-xl font-bold shadow-lg ring-2 ring-indigo-200">
                    {(userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'S')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              
              {/* Welcome Text */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  Welcome back, {userData?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Ready to practice? Select your grade and start testing!
                </p>
              </div>
            </div>
            
            {/* Quick Stats - Compact */}
            <div className="flex items-center gap-2 sm:gap-4">
              {(userData?.streak || 0) > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <span className="text-base sm:text-xl">🔥</span>
                  <span className="font-bold text-orange-700 text-xs sm:text-sm whitespace-nowrap">{userData?.streak || 0} day streak</span>
                </div>
              )}
              {userStats?.stats && (
                <div className="text-right">
                  <div className="text-xs text-gray-600">Level</div>
                  <div className="text-base sm:text-lg font-bold text-indigo-600">{userStats.stats.level || 1}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Grade Selector - Compact */}
          {selectedGrade && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-gray-600">Grade:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs sm:text-sm">
                    {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)} Grade
                  </span>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowGradeModal(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline min-h-[44px] px-2"
                  >
                    Change
                  </button>
                </div>
              </div>
              
              {/* Difficulty and Subject Filters */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Difficulty:</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'easy', 'medium', 'hard'].map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={() => {
                          playSound('click');
                          setSelectedDifficulty(difficulty);
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[36px] ${
                          selectedDifficulty === difficulty
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                        }`}
                      >
                        {difficulty === 'all' ? 'All' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Subject:</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'reading', 'writing', 'math'].map((subject) => (
                      <button
                        key={subject}
                        onClick={() => {
                          playSound('click');
                          setSelectedSubject(subject);
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[36px] ${
                          selectedSubject === subject
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                        }`}
                      >
                        {subject === 'all' ? 'All' : subject.charAt(0).toUpperCase() + subject.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {(selectedDifficulty !== 'all' || selectedSubject !== 'all') && (
                  <button
                    onClick={() => {
                      playSound('click');
                      setSelectedDifficulty('all');
                      setSelectedSubject('all');
                    }}
                    className="ml-auto px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 underline min-h-[36px]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grade Selection Modal */}
        {showGradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
            playSound('click');
            setShowGradeModal(false);
          }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 animate-in fade-in zoom-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Select Your Grade</h3>
                <button
                  onClick={() => {
                    playSound('click');
                    setShowGradeModal(false);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Choose your grade to see personalized practice tests</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {availableGrades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeSelect(grade)}
                    disabled={savingGrade}
                    className={`px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-semibold transition-all text-sm sm:text-base min-h-[44px] ${
                      selectedGrade === grade
                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 active:scale-95'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {grade.charAt(0).toUpperCase() + grade.slice(1)} Grade
                  </button>
                ))}
              </div>
              
              {savingGrade && (
                <div className="text-center text-sm text-gray-600">
                  Saving your preference...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation - Mobile Responsive */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-2 sm:gap-4 min-w-max sm:min-w-0">
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('tests');
              }}
              className={`px-3 sm:px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
                activeTab === 'tests'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 active:text-indigo-600'
              }`}
            >
              Practice Tests
            </button>
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('progress');
              }}
              className={`px-3 sm:px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
                activeTab === 'progress'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 active:text-indigo-600'
              }`}
            >
              My Progress
            </button>
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('challenges');
              }}
              className={`px-3 sm:px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base min-h-[44px] ${
                activeTab === 'challenges'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 active:text-indigo-600'
              }`}
            >
              Daily Challenges
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'tests' && (
          <>
            {/* Quick Stats - Compact Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-indigo-600">{completedTests}</div>
                <div className="text-xs text-gray-600 mt-1">Completed</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{inProgressTests}</div>
                <div className="text-xs text-gray-600 mt-1">In Progress</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{userData?.streak || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Day Streak</div>
              </div>
              <Link 
                href="/student/badges" 
                onClick={() => playSound('click')}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center hover:shadow-md active:scale-95 transition-all min-h-[44px] flex flex-col items-center justify-center"
              >
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{userData?.badges?.length || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Badges</div>
              </Link>
            </div>

            {/* Available Tests Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedGrade ? `${selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)} Grade Tests` : 'Practice Tests'}
                  </h2>
                  {selectedGrade && (
                    <p className="text-sm text-gray-600 mt-1">
                      {tests.length > 0 
                        ? `Showing ${tests.length} test${tests.length !== 1 ? 's' : ''}${selectedDifficulty !== 'all' || selectedSubject !== 'all' ? ' (filtered)' : ''}`
                        : 'No tests match your filters'}
                    </p>
                  )}
                </div>
              </div>

              {testsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
                    <p className="text-gray-600">Loading tests...</p>
                  </div>
                </div>
              ) : !selectedGrade ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                  <div className="text-6xl mb-4">🎓</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Your Grade</h3>
                  <p className="text-gray-600 mb-4">Please select your grade to see available practice tests</p>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowGradeModal(true);
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all font-semibold min-h-[44px]"
                  >
                    Choose Grade
                  </button>
                </div>
              ) : tests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)} Grade Tests Available
                  </h3>
                  <p className="text-gray-600 mb-4">Check back soon for new tests!</p>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowGradeModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all min-h-[44px]"
                  >
                    Change Grade
                  </button>
                </div>
              ) : tests.length === 0 && allGradeTests.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    All Tests Completed!
                  </h3>
                  <p className="text-gray-600 mb-4">Congratulations! You've completed all {allGradeTests.length} available tests for your grade.</p>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowGradeModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all min-h-[44px]"
                  >
                    Change Grade
                  </button>
                </div>
              ) : tests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)} Grade Tests Available
                  </h3>
                  <p className="text-gray-600 mb-4">Check back soon for new tests!</p>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowGradeModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all min-h-[44px]"
                  >
                    Change Grade
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  {tests.map((test) => {
                    const existingAttempt = attempts.find(a => a.testId === test.id && (a.status === 'in-progress' || a.status === 'paused'));
                    const isCompleted = attempts.some(a => a.testId === test.id && a.status === 'submitted');
                    
                    return (
                      <div key={test.id} className="transform hover:scale-105 transition-all duration-300">
                        <TestCard
                          test={test}
                          existingAttempt={existingAttempt ? { id: existingAttempt.id, status: existingAttempt.status } : undefined}
                          isCompleted={isCompleted}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* XP Progress */}
            {userStats?.stats && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Progress</h3>
                <XPProgressBar totalXP={userStats.stats.totalXP || 0} showLevel={true} size="lg" />
                {userStats.comparison && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Your Rank</div>
                      <div className="text-2xl font-bold text-indigo-600">#{userStats.stats.rank || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Better Than</div>
                      <div className="text-2xl font-bold text-green-600">{userStats.stats.percentile || 0}%</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Goal */}
            <DailyGoalWidget />

            {/* Recent Activity */}
            {attempts.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {attempts.slice(0, 5).map((attempt) => {
                    const test = allTests.find(t => t.id === attempt.testId);
                    const statusConfig: Record<string, { color: string; label: string }> = {
                      'submitted': { color: 'bg-green-100 text-green-800', label: 'Completed' },
                      'in-progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
                      'paused': { color: 'bg-orange-100 text-orange-800', label: 'Paused' },
                      'not-started': { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
                      'expired': { color: 'bg-red-100 text-red-800', label: 'Expired' },
                    };
                    const status = statusConfig[attempt.status] || statusConfig['not-started'];
                    
                    return (
                      <div key={attempt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{test?.title || 'Test'}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(attempt.startedAt instanceof Date ? attempt.startedAt : (attempt.startedAt as any)?.toDate?.() || attempt.startedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                          {attempt.status === 'in-progress' || attempt.status === 'paused' ? (
                            <Link
                              href={`/student/test/${attempt.testId}?attempt=${attempt.id}`}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                              Continue
                            </Link>
                          ) : attempt.status === 'submitted' ? (
                            <Link
                              href={`/student/results/${attempt.id}`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              View Results
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link
                  href="/student/progress"
                  className="mt-4 block text-center text-indigo-600 font-medium hover:text-indigo-700"
                >
                  View Full Progress →
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {/* Daily Challenges */}
            {challengesLoading ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
                  <p className="text-gray-600">Loading challenges...</p>
                </div>
              </div>
            ) : (
              <DailyChallenges 
                challenges={dailyChallenges}
                onChallengeClick={(challengeId) => {
                  console.log('Challenge clicked:', challengeId);
                }}
              />
            )}

            {/* Skill Tree - Collapsible */}
            {skillTree && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skill Mastery Tree</h2>
                <SkillTree 
                  skillTree={skillTree}
                  onSkillClick={(skillId) => {
                    console.log('Skill clicked:', skillId);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
