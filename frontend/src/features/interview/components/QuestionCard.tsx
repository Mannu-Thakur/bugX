import React, { useState } from 'react';
import { Volume2, HelpCircle, Brain } from 'lucide-react';
import type { InterviewQuestion } from '../types';

interface QuestionCardProps {
  question: InterviewQuestion;
  currentIndex: number;
  totalQuestions: number;
  isAiThinking: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  isAiThinking
}) => {
  const [showHint, setShowHint] = useState(false);

  const speakQuestion = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question.text);
      utterance.rate = 0.95; // slightly slower for professional feel
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="rounded-2xl border border-[#262835] bg-gradient-to-br from-[#1c1d27] via-[#12131a] to-[#0d0e14] p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden select-none hover:border-[#343647] transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded border border-indigo-500/25 bg-indigo-500/10 text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
            {question.category.replace('_', ' ')}
          </span>
          {question.isFollowUp && (
            <span className="px-2 py-0.5 rounded border border-purple-500/25 bg-purple-500/10 text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">
              Follow-Up
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-white/30 font-mono">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Question Text */}
      <div className="relative min-h-[70px] flex items-center">
        {isAiThinking ? (
          <div className="flex items-center gap-3 text-white/40">
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500/15 border-t-indigo-500/60 rounded-full animate-spin" />
              <Brain className="absolute w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white/60">Interviewer is thinking...</span>
              <span className="text-[10px] text-white/30">Formulating adaptive follow-up question</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-4 w-full">
            <h2 className="text-base sm:text-lg font-bold text-white/90 leading-relaxed tracking-tight">
              {question.text}
            </h2>
            <button
              onClick={speakQuestion}
              className="p-1.5 rounded-lg border border-white/[0.06] bg-[#131316]/50 hover:bg-[#131316]/80 text-white/40 hover:text-white/80 transition-all shrink-0 cursor-pointer"
              title="Speak Question"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hint drawer */}
      {!isAiThinking && question.hint && (
        <div className="border-t border-white/[0.06] pt-3 relative">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHint(!showHint)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showHint ? 'Hide Hint' : 'Need a hint?'}
            </button>
          </div>
          {showHint && (
            <p className="mt-2 text-xs text-white/70 leading-relaxed bg-[#08090d]/85 p-3.5 rounded-xl border border-white/[0.04] select-text shadow-inner">
              {question.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
