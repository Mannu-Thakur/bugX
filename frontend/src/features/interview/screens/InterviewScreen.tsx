import React, { useState, useRef, useEffect } from 'react';
import { useInterview } from '../InterviewContext';
import { useInterviewAI } from '../useInterviewAI';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerInput } from '../components/AnswerInput';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { InterviewTimer } from '../components/InterviewTimer';
import { ChevronRight, CornerDownRight, ShieldCheck, Star } from 'lucide-react';
import type { InterviewAnswer, AnswerEvaluation, InterviewQuestion } from '../types';
import { useToast } from '../../../shared/ui/toast/ToastProvider';

interface InterviewScreenProps {
  onComplete: (report: any) => void;
}

export const InterviewScreen: React.FC<InterviewScreenProps> = ({ onComplete }) => {
  const {
    session,
    currentQuestionIndex,
    isAiThinking,
    submitAnswer,
    addEvaluation,
    addFollowUpQuestion,
    setIsAiThinking,
    completeInterview
  } = useInterview();

  const { evaluateAnswer, generateFollowUp, generateReport } = useInterviewAI();
  const { error: showToastError } = useToast();

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [currentAnswer, setCurrentAnswer] = useState<InterviewAnswer | null>(null);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [confidence, setConfidence] = useState(70);

  if (!session) return null;

  // Keep a ref to always have the latest session — avoids stale closure
  // when handleNextQuestion fires after async evaluations update state
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });

  const currentQuestion: InterviewQuestion | undefined = session.questions[currentQuestionIndex];
  const totalQuestions = session.questions.length;

  const handleTick = (secs: number) => {
    setDurationSec(secs);
    // Simulate minor confidence fluctuations based on speed/time
    if (secs > 180) {
      setConfidence(prev => Math.max(45, prev - 1));
    }
  };

  const handleAnswerSubmit = async (text: string, method: 'typed' | 'voice') => {
    if (!currentQuestion) return;

    const newAnswer: InterviewAnswer = {
      questionId: currentQuestion.id,
      text,
      method,
      durationSec,
      submittedAt: Date.now()
    };

    submitAnswer(newAnswer);
    setCurrentAnswer(newAnswer);
    setIsAiThinking(true);

    try {
      // 1. Evaluate answer
      const ev = await evaluateAnswer(currentQuestion, newAnswer, session);
      setEvaluation(ev);

      // Adjust mock confidence bar based on AI feedback score
      setConfidence(Math.round(ev.scores.confidence * 10));

      // 2. Add evaluation to context
      addEvaluation(ev);

      // 3. Adaptive check: if it is expert mode or hard mode, and user did really well/poorly, let's insert a follow-up
      if (
        (session.config.difficulty === 'hard' || session.config.difficulty === 'expert') &&
        ev.nextDifficulty !== 'same' &&
        session.questions.length < session.config.questionCount + 2 // cap extra questions
      ) {
        // Generate follow up question in the background
        const followUp = await generateFollowUp(currentQuestion, ev, session.submissionContext);
        addFollowUpQuestion(followUp);
      }
    } catch (err: any) {
      console.error(err);
      showToastError(err.message || 'Failed to evaluate answer. Proceeding to next question.');
      // Fake evaluation to allow continuation
      const fakeEv: AnswerEvaluation = {
        questionId: currentQuestion.id,
        scores: { technicalAccuracy: 5, communication: 5, confidence: 5, problemSolving: 5, optimizationKnowledge: 5, complexityUnderstanding: 5 },
        feedback: 'Evaluation error occurred.',
        expectedDiscussion: 'No feedback generated.',
        score: 5,
        nextDifficulty: 'same'
      };
      setEvaluation(fakeEv);
      addEvaluation(fakeEv);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleNextQuestion = async () => {
    // Clear temporary step states
    setEvaluation(null);
    setCurrentAnswer(null);
    setDurationSec(0);

    // Use the ref to get the LIVE session (avoids stale closure after addEvaluation)
    const liveSession = sessionRef.current;
    const liveTotalQuestions = liveSession.questions.length;

    // If no more questions left, build the final report
    if (currentQuestionIndex >= liveTotalQuestions) {
      setIsAiThinking(true);
      try {
        const report = await generateReport(liveSession);
        completeInterview(report);
        onComplete(report);
      } catch (err: any) {
        console.error(err);
        showToastError('Failed to generate final report. Building base report.');
        // Fallback report
        const fallbackReport = {
          overallScore: 75,
          scores: { technicalAccuracy: 7.5, communication: 7.5, confidence: 7.5, problemSolving: 7.5, optimizationKnowledge: 7.5, complexityUnderstanding: 7.5 },
          strengths: ['Algorithmic correctness'],
          weaknesses: ['Refactoring edge cases'],
          suggestedTopics: ['Dynamic Programming'],
          recommendedProblems: ['Two Sum'],
          badges: [],
          detailedFeedback: [],
          summary: 'Interview finished successfully.'
        };
        completeInterview(fallbackReport);
        onComplete(fallbackReport);
      } finally {
        setIsAiThinking(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto py-4">
      {/* Left Columns (Active Q&A) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Navigation & Progress Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 select-none">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-black text-white/45 uppercase tracking-wider">
              Live Mock Interview loop
            </span>
          </div>
          <div className="flex items-center gap-3">
            <InterviewTimer isActive={!isAiThinking && !evaluation} onTick={handleTick} />
          </div>
        </div>

        {/* Live Active Q&A */}
        {evaluation ? (
          /* Evaluation display card */
          <div className="rounded-2xl border border-[#262835] bg-gradient-to-br from-[#1c1d27] via-[#12131a] to-[#0d0e14] p-5 sm:p-6 space-y-4 shadow-2xl select-none relative overflow-hidden hover:border-[#343647] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Turn Completed
              </span>
              <div className="font-mono text-sm font-black text-emerald-400">
                Score: {evaluation.score}/10
              </div>
            </div>

            <div className="space-y-1 mt-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
                Your Answer
              </span>
              <p className="text-[11px] text-white/60 italic bg-[#08090d]/85 p-2.5 rounded-lg border border-white/[0.04] select-text shadow-inner">
                "{currentAnswer?.text}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
                  Interviewer Feedback
                </span>
                <p className="text-[11px] text-white/80 leading-relaxed select-text bg-[#08090d]/85 p-2.5 rounded-lg border border-white/[0.04] shadow-inner">
                  {evaluation.feedback}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
                  Expected Discussion Points
                </span>
                <p className="text-[11px] text-white/80 leading-relaxed select-text bg-[#08090d]/85 p-2.5 rounded-lg border border-white/[0.04] shadow-inner">
                  {evaluation.expectedDiscussion}
                </p>
              </div>
            </div>

            <button
              onClick={handleNextQuestion}
              className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0d0f14]/80 border border-white/[0.06] hover:bg-[#131316]/80 text-white/80 transition-all select-none flex items-center justify-center gap-1 cursor-pointer"
            >
              {currentQuestionIndex + 1 >= totalQuestions ? 'Finish & Generate Report' : 'Next Question'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Asking Question & input */
          currentQuestion && (
            <div className="space-y-4">
              <QuestionCard
                question={currentQuestion}
                currentIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                isAiThinking={isAiThinking}
              />
              <AnswerInput onSubmit={handleAnswerSubmit} disabled={isAiThinking} />
            </div>
          )
        )}
      </div>

      {/* Right Column (Live stats, waveforms & Q&A archive) */}
      <div className="space-y-4">
        {/* Toggle between Confidence stats and Q&A feed on small layout */}
        <div className="flex sm:hidden border border-white/[0.06] rounded-lg p-0.5 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === 'current' ? 'bg-white/[0.06] text-white/95' : 'text-white/40'
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === 'history' ? 'bg-white/[0.06] text-white/95' : 'text-white/40'
            }`}
          >
            History ({session.answers.length})
          </button>
        </div>

        {/* Confidence Widget */}
        <div className={activeTab === 'current' ? 'block' : 'hidden sm:block'}>
          <ConfidenceMeter value={confidence} isVoiceActive={isAiThinking} />
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className={`rounded-xl border border-white/[0.06] bg-[#0d0f14]/40 p-4.5 space-y-3.5 select-none ${
          activeTab === 'history' ? 'block' : 'hidden sm:block'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              Mock Conversation history
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/[0.02] text-[9px] font-mono font-bold text-white/40">
              {session.answers.length} turns
            </span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {session.answers.length === 0 ? (
              <p className="text-[10px] text-white/30 text-center py-6">
                Waiting for the first answer submission...
              </p>
            ) : (
              session.questions.slice(0, session.answers.length).map((q, idx) => {
                const ans = session.answers[idx];
                const ev = session.evaluations[idx];

                return (
                  <div key={q.id} className="space-y-1.5 border-b border-white/[0.04] pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-start gap-1">
                      <Star className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-white/40 font-bold block">
                          Q{idx + 1}: {q.text.slice(0, 50)}...
                        </span>
                        <div className="flex items-start gap-1 text-[10px] text-white/50 mt-1 pl-2 border-l border-white/[0.06]">
                          <CornerDownRight className="w-2.5 h-2.5 text-white/30 mt-0.5 shrink-0" />
                          <span className="truncate italic">"{ans?.text}"</span>
                        </div>
                        {ev && (
                          <div className="flex items-center gap-1.5 mt-1.5 pl-2">
                            <span className="px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 rounded">
                              Score: {ev.score}/10
                            </span>
                            <span className="text-[9px] text-white/40 truncate max-w-[120px]">
                              {ev.feedback}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
