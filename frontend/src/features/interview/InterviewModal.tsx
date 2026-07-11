import React, { useState, useEffect } from 'react';
import { useInterview } from './InterviewContext';
import { useInterviewAI } from './useInterviewAI';
import { ModePickerScreen } from './screens/ModePickerScreen';
import { InterviewScreen } from './screens/InterviewScreen';
import { ReportScreen } from './screens/ReportScreen';
import { X, AlertCircle } from 'lucide-react';
import type { SubmissionContext, InterviewConfig } from './types';
import { useToast } from '../../shared/ui/toast/ToastProvider';

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionContext: SubmissionContext;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({
  isOpen,
  onClose,
  submissionContext
}) => {
  const {
    phase,
    session,
    setPhase,
    startSession,
    resetSession
  } = useInterview();

  const { generateQuestions } = useInterviewAI();
  const { error: showToastError } = useToast();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartInterview = async (config: InterviewConfig) => {
    setLocalLoading(true);
    setPhase('generating');
    try {
      const questions = await generateQuestions(config, submissionContext);
      startSession(config, submissionContext, questions);
    } catch (err: any) {
      console.error(err);
      showToastError(err.message || 'Failed to assemble interview questions. Ensure your AI keys are set up.');
      setPhase('mode_picking');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCloseAttempt = () => {
    if (phase === 'interviewing' || phase === 'evaluating') {
      setShowExitConfirm(true);
    } else {
      resetSession();
      onClose();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    resetSession();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="relative w-full max-w-5xl bg-[#07090e] border border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header close action */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-900 bg-black/10 select-none">
          <span className="font-mono text-[10px] text-zinc-600 tracking-wider">
            bugX AI Interviewer v1.0
          </span>
          <button
            onClick={handleCloseAttempt}
            className="p-1 rounded-lg text-zinc-550 hover:text-zinc-300 hover:bg-white/[0.03] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#07090e] relative">
          {phase === 'generating' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center select-none">
              <div className="relative">
                <div className="w-14 h-14 border-2 border-indigo-500/15 border-t-indigo-500/80 rounded-full animate-spin" />
                <div className="absolute inset-0 m-auto w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-350">Assembling Interview panel</p>
                <p className="text-xs text-zinc-550 max-w-xs">
                  Reviewing code logic, parsing runtime and constraints to prepare custom follow-ups...
                </p>
              </div>
            </div>
          )}

          {(phase === 'idle' || phase === 'mode_picking') && (
            <ModePickerScreen onStart={handleStartInterview} isLoading={localLoading} />
          )}

          {(phase === 'interviewing' || phase === 'evaluating') && (
            <InterviewScreen onComplete={() => {}} />
          )}

          {phase === 'complete' && session?.report && (
            <ReportScreen
              report={session.report}
              onRetry={() => setPhase('mode_picking')}
              onClose={() => {
                resetSession();
                onClose();
              }}
            />
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#0d0f14] p-5 space-y-4 shadow-xl select-none text-center">
            <div className="p-2 bg-rose-500/10 rounded-full w-fit mx-auto">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-200">Quit Interview loop?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Exiting will end the current session and discard all your progress. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/10 transition-all cursor-pointer"
              >
                Quit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
