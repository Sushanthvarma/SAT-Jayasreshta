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
        
        const response = await fetch(`/api/tests/${params.id}?includeQuestions=true`);
        const data = await response.json();
        
        if (!data.success) {
          toast.error('Failed to load test');
          router.push('/student');
          return;
        }
        
        setTest(data.test);
        setQuestions(data.questions || []);
        
        if (attemptIdParam) {
          const existingAttempt = await getTestAttempt(attemptIdParam);
          if (existingAttempt) {
            setAttempt(existingAttempt);
            setCurrentSection(existingAttempt.currentSection);
            
            const answersMap = new Map<string, StudentAnswer>();
            existingAttempt.answers.forEach(answer => {
              answersMap.set(answer.questionId, answer);
            });
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
          }
        } else {
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
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [attempt, answers, timeRemaining]);

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

  const handleSubmit = async () => {
    if (!attempt || !test) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await updateTestAttempt(attempt.id, {
        answers: Array.from(answers.values()),
        status: 'submitted',
        submittedAt: new Date(),
        timeRemaining: 0,
      });

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading test...</p>
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
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all min-h-[44px]"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Test ✓'}
                  </button>
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
    </div>
  );
}
