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

export default function TestTakingPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptIdParam = searchParams.get('attempt');
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load test and questions
  useEffect(() => {
    if (!user) return;

    const loadTest = async () => {
      try {
        setLoading(true);
        
        // Get test details
        const response = await fetch(`/api/tests/${params.id}?includeQuestions=true`);
        const data = await response.json();
        
        if (!data.success) {
          toast.error('Failed to load test');
          router.push('/student');
          return;
        }
        
        setTest(data.test);
        setQuestions(data.questions || []);
        
        // Load or create attempt
        if (attemptIdParam) {
          const existingAttempt = await getTestAttempt(attemptIdParam);
          if (existingAttempt) {
            setAttempt(existingAttempt);
            setCurrentSection(existingAttempt.currentSection);
            
            // Restore answers
            const answersMap = new Map<string, StudentAnswer>();
            existingAttempt.answers.forEach(answer => {
              answersMap.set(answer.questionId, answer);
            });
            setAnswers(answersMap);
            
            // Calculate time remaining
            if (existingAttempt.expiresAt) {
              const expiresAt = existingAttempt.expiresAt instanceof Date 
                ? existingAttempt.expiresAt 
                : new Date(existingAttempt.expiresAt);
              const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
              setTimeRemaining(remaining);
            } else {
              setTimeRemaining(existingAttempt.timeRemaining || 0);
            }
          }
        } else {
          // Start new attempt
          const auth = getAuthInstance();
          const idToken = await getIdToken(auth.currentUser!);
          
          const startResponse = await fetch(`/api/tests/${params.id}/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          const startData = await startResponse.json();
          if (startData.success) {
            setAttempt(startData.attempt);
            setTimeRemaining(startData.attempt.timeRemaining);
            router.replace(`/student/test/${params.id}?attempt=${startData.attempt.id}`);
          } else {
            toast.error('Failed to start test');
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
  }, [user, params.id, attemptIdParam, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !attempt) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
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

  // Auto-save answers
  useEffect(() => {
    if (!attempt || answers.size === 0) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        await updateTestAttempt(attempt.id, {
          answers: Array.from(answers.values()),
          timeRemaining,
          status: 'in-progress',
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [attempt, answers, timeRemaining]);

  // Get current section questions
  const currentSectionQuestions = questions.filter(
    q => q.sectionNumber === currentSection
  );

  const currentQuestion = currentSectionQuestions[currentQuestionIndex];

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
      // Move to next section
      setCurrentSection(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSection > 1) {
      // Move to previous section
      setCurrentSection(prev => prev - 1);
      const prevSectionQuestions = questions.filter(q => q.sectionNumber === currentSection - 1);
      setCurrentQuestionIndex(prevSectionQuestions.length - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attempt || !test) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Final save
      await updateTestAttempt(attempt.id, {
        answers: Array.from(answers.values()),
        status: 'submitted',
        submittedAt: new Date(),
        timeRemaining: 0,
      });

      // Submit to API
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attemptId: attempt.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Test submitted successfully!');
        router.push(`/student/results/${attempt.id}`);
      } else {
        toast.error('Failed to submit test');
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-xl font-semibold text-gray-700">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!user || !test || !attempt || !currentQuestion) {
    return null;
  }

  const currentAnswer = answers.get(currentQuestion.id);
  const answeredCount = Array.from(answers.values()).filter(a => a.answer !== null && !a.skipped).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white border-b-2 shadow-md sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-sm text-gray-600">
                Section {currentSection} of {test.sections.length}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-gray-600">Time Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {answeredCount}/{totalQuestions}
                </div>
                <div className="text-xs text-gray-600">Answered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-3">Question Navigation</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentSectionQuestions.map((q, idx) => {
                  const answer = answers.get(q.id);
                  const isAnswered = answer && answer.answer !== null && !answer.skipped;
                  const isCurrent = idx === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-full p-2 rounded text-left text-sm transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : isAnswered
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Q{q.questionNumber} {isAnswered ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    Question {currentQuestion.questionNumber} of {currentSectionQuestions.length}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {currentQuestion.difficulty}
                  </span>
                </div>
                
                {currentQuestion.passageText && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500">
                    <p className="text-gray-700 whitespace-pre-wrap">{currentQuestion.passageText}</p>
                  </div>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <p className="text-lg text-gray-900 font-medium">{currentQuestion.questionText}</p>
              </div>

              {/* Answer Options */}
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        currentAnswer?.answer === option.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={currentAnswer?.answer === option.id}
                        onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                        className="mr-3 h-5 w-5 text-indigo-600"
                      />
                      <span className="font-medium text-gray-700 mr-2">{option.id}.</span>
                      <span className="text-gray-900">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'grid-in' && (
                <div className="mb-6">
                  <input
                    type="number"
                    step="any"
                    value={currentAnswer?.answer?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleAnswerChange(currentQuestion.id, value);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-indigo-600 focus:outline-none"
                    placeholder="Enter your answer"
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 && currentSection === 1}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => handleAnswerChange(currentQuestion.id, null)}
                  className="px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200 transition-colors min-h-[44px]"
                >
                  Skip Question
                </button>

                {currentQuestionIndex === currentSectionQuestions.length - 1 && currentSection === test.sections.length ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
