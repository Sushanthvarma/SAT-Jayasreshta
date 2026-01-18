/**
 * Review Modal Component
 * Allows students to review all answers before submission
 */

'use client';

import { useState } from 'react';
import { Question, StudentAnswer } from '@/lib/types/test';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  questions: Question[];
  answers: Map<string, StudentAnswer>;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (questionId: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export default function ReviewModal({
  questions,
  answers,
  isOpen,
  onClose,
  onEdit,
  onSubmit,
  isSubmitting = false,
}: ReviewModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const answeredCount = Array.from(answers.values()).filter(a => a.answer !== null && !a.skipped).length;
  const unansweredCount = questions.length - answeredCount;
  const allAnswered = unansweredCount === 0;

  const getOptionLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const handleSubmitClick = () => {
    if (!allAnswered) {
      toast.error(`Please answer all ${unansweredCount} remaining questions before submitting.`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    onSubmit();
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Review Your Answers</h2>
                <p className="text-indigo-100">
                  {answeredCount} of {questions.length} questions answered
                  {unansweredCount > 0 && (
                    <span className="text-yellow-200 ml-2">
                      ({unansweredCount} unanswered)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close review"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {questions.map((question, index) => {
                const answer = answers.get(question.id);
                const isAnswered = answer && answer.answer !== null && !answer.skipped;
                const answerIndex = answer?.answer as number | null;
                const correctAnswerIndex = typeof question.correctAnswer === 'number'
                  ? question.correctAnswer
                  : question.options?.findIndex(opt => opt.id === question.correctAnswer) ?? -1;

                return (
                  <div
                    key={question.id}
                    className={`
                      p-4 rounded-xl border-2 transition-all
                      ${isAnswered
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-300 animate-pulse'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-lg text-gray-700">
                            Question {index + 1}
                          </span>
                          {!isAnswered && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                              UNANSWERED
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{question.questionText}</p>
                      </div>
                      <button
                        onClick={() => {
                          onEdit(question.id);
                          onClose();
                        }}
                        className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Answer Display */}
                    {isAnswered && answerIndex !== null && question.options && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Your Answer:</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {getOptionLabel(answerIndex)}. {question.options[answerIndex]?.text}
                        </p>
                      </div>
                    )}

                    {!isAnswered && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          ⚠️ You haven't answered this question yet. Click "Edit" to answer it.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {unansweredCount > 0 ? (
                  <span className="text-red-600 font-semibold">
                    Please answer all {unansweredCount} remaining questions
                  </span>
                ) : (
                  <span className="text-green-600 font-semibold">
                    ✓ All questions answered! Ready to submit.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSubmitClick}
                  disabled={!allAnswered || isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Submit Your Test?</h3>
            <p className="text-gray-700 mb-6">
              Once you submit, you won't be able to change your answers. Are you sure you're ready?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
