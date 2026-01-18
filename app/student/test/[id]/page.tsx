'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Test, Question, TestAttempt, StudentAnswer } from '@/lib/types/test';
import { getTestById, getTestQuestions, updateTestAttempt, getTestAttempt } from '@/lib/firestore/tests-client';
import { getIdToken } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import ReviewModal from '@/components/test/ReviewModal';

export default function TestTakingPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptIdParam = searchParams.get('attempt');
  
  // Handle both Promise and direct params (Next.js 15 compatibility)
  const [testId, setTestId] = useState<string | null>(null);
  
  useEffect(() => {
    if (params instanceof Promise) {
      params.then(resolved => setTestId(resolved.id));
    } else {
      setTestId(params.id);
    }
  }, [params]);
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Browser back button warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attempt && attempt.status === 'in-progress') {
        e.preventDefault();
        e.returnValue = 'You have a test in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt]);

  // Load test and questions
  useEffect(() => {
    if (!user || !testId) return;

    const loadTest = async () => {
      try {
        setLoading(true);
        
        console.log(`🔍 Loading test: ${testId}`);
        console.log(`   Test ID type: ${typeof testId}, value: "${testId}"`);
        const response = await fetch(`/api/tests/${testId}?includeQuestions=true`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details,
          });
          toast.error(errorData.error || `Failed to load test (${response.status})`);
          router.push('/student');
          return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('❌ API returned success=false:', data.error);
          toast.error(data.error || 'Failed to load test');
          router.push('/student');
          return;
        }
        
        console.log(`✅ Test loaded:`, {
          testId: data.test?.id,
          title: data.test?.title,
          questionsCount: data.questions?.length || 0,
        });
        
        setTest(data.test);
        const loadedQuestions = data.questions || [];
        setQuestions(loadedQuestions);
        
        if (attemptIdParam) {
          console.log(`📂 Resuming existing attempt: ${attemptIdParam}`);
          const existingAttempt = await getTestAttempt(attemptIdParam);
          if (existingAttempt) {
            console.log(`✅ Attempt found:`, {
              id: existingAttempt.id,
              status: existingAttempt.status,
              currentSection: existingAttempt.currentSection,
              answersCount: existingAttempt.answers?.length || 0,
            });
            setAttempt(existingAttempt);
            
            // Set current section, but validate it exists
            const testSections = data.test?.sections || [];
            const validSection = Math.max(1, Math.min(existingAttempt.currentSection || 1, testSections.length || 1));
            setCurrentSection(validSection);
            
            // Find the first question in the current section
            const sectionQuestions = loadedQuestions.filter(q => q.sectionNumber === validSection);
            if (sectionQuestions.length > 0) {
              setCurrentQuestionIndex(0);
              console.log(`✅ Set to section ${validSection}, question 0`);
            } else {
              // If no questions in current section, go to first section with questions
              const firstSectionWithQuestions = testSections.find((s: any) => 
                loadedQuestions.some(q => q.sectionNumber === s.sectionNumber)
              );
              if (firstSectionWithQuestions) {
                const firstSectionNum = firstSectionWithQuestions.sectionNumber || 1;
                setCurrentSection(firstSectionNum);
                setCurrentQuestionIndex(0);
                console.log(`✅ Adjusted to first section with questions: ${firstSectionNum}`);
              } else if (loadedQuestions.length > 0) {
                // Fallback: use first question's section
                const firstQuestion = loadedQuestions[0];
                setCurrentSection(firstQuestion.sectionNumber);
                setCurrentQuestionIndex(0);
                console.log(`✅ Fallback to first question's section: ${firstQuestion.sectionNumber}`);
              }
            }
            
            const answersMap = new Map<string, StudentAnswer>();
            if (existingAttempt.answers) {
              existingAttempt.answers.forEach(answer => {
                answersMap.set(answer.questionId, answer);
              });
            }
            setAnswers(answersMap);
            
            if (existingAttempt.expiresAt) {
              const expiresAt = existingAttempt.expiresAt instanceof Date 
                ? existingAttempt.expiresAt 
                : new Date(existingAttempt.expiresAt);
              const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
              setTimeRemaining(remaining);
            } else {
              setTimeRemaining(existingAttempt.timeRemaining || 0);
            }
          } else {
            console.error(`❌ Attempt not found: ${attemptIdParam}`);
            toast.error('Test attempt not found. Starting a new attempt...');
            // Will fall through to start new attempt
          }
        } else {
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const startResponse = await fetch(`/api/tests/${testId}/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!startResponse.ok) {
            const errorData = await startResponse.json();
            console.error('❌ Start test API error:', {
              status: startResponse.status,
              statusText: startResponse.statusText,
              error: errorData.error,
              details: errorData.details,
            });
            toast.error(errorData.error || `Failed to start test (${startResponse.status})`);
            router.push('/student');
            return;
          }
          
          const startData = await startResponse.json();
          if (startData.success) {
            console.log(`✅ Test attempt started: ${startData.attempt.id}`);
            setAttempt(startData.attempt);
            setTimeRemaining(startData.attempt.timeRemaining);
            router.replace(`/student/test/${testId}?attempt=${startData.attempt.id}`);
          } else {
            console.error('❌ Start test returned success=false:', startData.error);
            toast.error(startData.error || 'Failed to start test');
            router.push('/student');
          }
        }
      } catch (error) {
        console.error('Error loading test:', error);
        toast.error('Failed to load test');
        router.push('/student');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [user, testId, attemptIdParam, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !attempt) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeRemaining, attempt]);

  // Auto-save answers and time spent
  useEffect(() => {
    if (!attempt || !test) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        // Calculate totalTimeSpent: initial time limit - remaining time
        const initialTimeLimit = test.totalTimeLimit || 0;
        const totalTimeSpent = Math.max(0, initialTimeLimit - timeRemaining);
        
        await updateTestAttempt(attempt.id, {
          answers: Array.from(answers.values()),
          timeRemaining,
          totalTimeSpent,
          status: 'in-progress',
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [attempt, test, answers, timeRemaining]);

  const currentSectionQuestions = questions.filter(
    q => q.sectionNumber === currentSection
  );

  // Ensure currentQuestionIndex is valid
  const validQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, currentSectionQuestions.length - 1));
  if (validQuestionIndex !== currentQuestionIndex && currentSectionQuestions.length > 0) {
    setCurrentQuestionIndex(validQuestionIndex);
  }

  const currentQuestion = currentSectionQuestions[validQuestionIndex];

  const handleAnswerChange = useCallback((questionId: string, answer: string | number | null) => {
    setAnswers(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      
      newMap.set(questionId, {
        questionId,
        answer,
        timeSpent: existing?.timeSpent || 0,
        skipped: answer === null,
        answeredAt: new Date(),
      });
      
      return newMap;
    });
  }, []);

  const handleNext = () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSection < (test?.sections.length || 0)) {
      setCurrentSection(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
      const prevSectionQuestions = questions.filter(q => q.sectionNumber === currentSection - 1);
      setCurrentQuestionIndex(prevSectionQuestions.length - 1);
    }
  };

  const handleReviewClick = () => {
    setShowReviewModal(true);
  };

  const handleEditQuestion = (questionId: string) => {
    // Find question index and navigate to it
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      const question = questions[questionIndex];
      // Find which section this question belongs to
      const sectionIndex = test?.sections.findIndex(s => 
        questions.filter(q => q.sectionNumber === s.sectionNumber).some(q => q.id === questionId)
      ) ?? -1;
      
      if (sectionIndex !== -1 && test) {
        setCurrentSection(sectionIndex + 1);
        // Find question index within that section
        const sectionQuestions = questions.filter(q => q.sectionNumber === sectionIndex + 1);
        const questionIndexInSection = sectionQuestions.findIndex(q => q.id === questionId);
        if (questionIndexInSection !== -1) {
          setCurrentQuestionIndex(questionIndexInSection);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!attempt || !test) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Calculate totalTimeSpent: initial time limit - remaining time
      const initialTimeLimit = test.totalTimeLimit || 0;
      const totalTimeSpent = Math.max(0, initialTimeLimit - timeRemaining);
      
      // Update answers and totalTimeSpent but NOT status - let the API handle status update
      await updateTestAttempt(attempt.id, {
        answers: Array.from(answers.values()),
        timeRemaining: timeRemaining,
        totalTimeSpent: totalTimeSpent,
      });

      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      console.log(`📤 Submitting test attempt: ${attempt.id}`);
      console.log(`   Total time spent: ${totalTimeSpent} seconds (${Math.round(totalTimeSpent / 60)} minutes)`);
      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          attemptId: attempt.id,
          answers: Array.from(answers.values()),
          totalTimeSpent: totalTimeSpent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Submit test API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
        });
        toast.error(errorData.error || `Failed to submit test (${response.status})`);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Test submitted successfully! Result ID: ${data.result?.id}`);
        console.log(`   Attempt ID: ${attempt.id}`);
        console.log(`   Result attemptId: ${data.result?.attemptId}`);
        
        // Use attemptId from result, or fall back to result ID, or attempt ID
        const resultAttemptId = data.result?.attemptId || data.result?.id || attempt.id;
        console.log(`   Redirecting to results with: ${resultAttemptId}`);
        
        toast.success(data.message || 'Test submitted successfully!');
        router.push(`/student/results/${resultAttemptId}`);
      } else {
        console.error('❌ Submit returned success=false:', data.error);
        toast.error(data.error || 'Failed to submit test');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error('Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">Test not found</p>
          <p className="text-gray-600 mb-4">The test you're looking for doesn't exist or is no longer available.</p>
          <Link href="/student" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading test attempt...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">No questions found</p>
          <p className="text-gray-600 mb-4">This test doesn't have any questions yet.</p>
          <Link href="/student" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    console.error('❌ Current question not found:', {
      currentSection,
      currentQuestionIndex,
      currentSectionQuestions: currentSectionQuestions.length,
      totalQuestions: questions.length,
      sections: test.sections.length,
    });
    
    // Try to find the first available question
    const firstQuestion = questions[0];
    if (firstQuestion) {
      console.log('🔄 Falling back to first question');
      setCurrentSection(firstQuestion.sectionNumber);
      setCurrentQuestionIndex(0);
      // Return loading state while state updates
      return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-lg font-semibold text-gray-700">Loading question...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">Unable to load question</p>
          <p className="text-gray-600 mb-4">There was an issue loading the test question.</p>
          <Link href="/student" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentAnswer = answers.get(currentQuestion.id);
  const answeredCount = Array.from(answers.values()).filter(a => a.answer !== null && !a.skipped).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      {/* Timer Bar */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-20 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Section {currentSection} of {test.sections.length} • {test.sections[currentSection - 1]?.name}
              </p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className={`text-3xl font-bold ${timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-gray-600 font-medium">Time Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {answeredCount}/{totalQuestions}
                </div>
                <div className="text-xs text-gray-600 font-medium">Answered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sticky top-32">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Question Navigation</h3>
              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                {currentSectionQuestions.map((q, idx) => {
                  const answer = answers.get(q.id);
                  const isAnswered = answer && answer.answer !== null && !answer.skipped;
                  const isCurrent = idx === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md scale-105'
                          : isAnswered
                          ? 'bg-green-50 text-green-800 border-2 border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-semibold">Q{q.questionNumber}</span>
                      {isAnswered && !isCurrent && <span className="ml-2">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 mb-6">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                    Question {currentQuestion.questionNumber} of {currentSectionQuestions.length}
                  </span>
                  <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </span>
                </div>
                
                {currentQuestion.passageText && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-l-4 border-indigo-500">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">{currentQuestion.passageText}</p>
                  </div>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-8">
                <p className="text-xl text-gray-900 font-semibold leading-relaxed">{currentQuestion.questionText}</p>
              </div>

              {/* Answer Options */}
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-4 mb-8">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        currentAnswer?.answer === option.id
                          ? 'border-indigo-600 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={currentAnswer?.answer === option.id}
                        onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                        className="mt-1 mr-4 h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-indigo-600 mr-3 text-lg">{option.id}.</span>
                        <span className="text-gray-900 text-lg">{option.text}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'grid-in' && (
                <div className="mb-8">
                  <input
                    type="number"
                    step="any"
                    value={currentAnswer?.answer?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleAnswerChange(currentQuestion.id, value);
                    }}
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                    placeholder="Enter your answer"
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t-2 border-gray-100">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 && currentSection === 1}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
                >
                  ← Previous
                </button>
                
                <button
                  onClick={() => handleAnswerChange(currentQuestion.id, null)}
                  className="px-6 py-3 bg-yellow-100 text-yellow-800 rounded-xl font-semibold hover:bg-yellow-200 transition-all min-h-[44px]"
                >
                  Skip Question
                </button>

                {currentQuestionIndex === currentSectionQuestions.length - 1 && currentSection === test.sections.length ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleReviewClick}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all min-h-[44px]"
                    >
                      Review Answers
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all min-h-[44px]"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Test ✓'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all min-h-[44px]"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {test && (
        <ReviewModal
          questions={questions}
          answers={answers}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onEdit={handleEditQuestion}
          onSubmit={() => {
            setShowReviewModal(false);
            handleSubmit();
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
