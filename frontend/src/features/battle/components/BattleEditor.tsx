import React, { useState } from 'react';
import { Terminal, ChevronUp, ChevronDown, Award } from 'lucide-react';
import { CodeEditor } from '../../problems/components/CodeEditor';
import { TestCasePanel } from '../../problems/components/TestCasePanel';
import { api } from '../../../shared/lib/api';
import type { SubmissionResponse, SubmissionResultResponse } from '../../../shared/lib/api';

interface Template {
  language: string;
  source_code?: string;
  template_code?: string;
}

interface TestCase {
  id: string;
  input: string | null;
  expected_output: string | null;
  is_sample: boolean;
}

interface BattleEditorProps {
  slug: string;
  problemId: string;
  code: string;
  language: 'python' | 'javascript' | 'cpp' | 'java';
  onChangeCode: (code: string) => void;
  onChangeLanguage: (lang: 'python' | 'javascript' | 'cpp' | 'java') => void;
  templates: Template[];
  testCases: TestCase[];
  isSolved: boolean;
  attempts: number;
  myPlayerIndex: number;
  battleId?: string;
  onSolve?: (score: number) => void;
  soundEnabled?: boolean;
  isFinished?: boolean;
}

export const BattleEditor: React.FC<BattleEditorProps> = ({
  slug,
  problemId,
  code,
  language,
  onChangeCode,
  onChangeLanguage,
  templates,
  testCases,
  isSolved,
  attempts,
  // myPlayerIndex is passed but unused in render
  battleId,
  onSolve,
  soundEnabled = true,
  isFinished = false,
}) => {
  const [consoleHeight, setConsoleHeight] = useState(260);
  const [showConsole, setShowConsole] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [results, setResults] = useState<SubmissionResultResponse[] | null>(null);

  // Play audio helper
  const playSound = (type: 'submit' | 'success' | 'fail') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'submit') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('AudioContext trigger failed', e);
    }
  };

  const handleConsoleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startHeight = consoleHeight;
    const startY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      setConsoleHeight(Math.max(120, Math.min(500, startHeight - (moveEvent.clientY - startY))));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const pollSubmission = (subId: string, isSubmitFlow: boolean) => {
    let attemptsCount = 0;
    const interval = setInterval(() => {
      attemptsCount++;
      if (attemptsCount > 40) {
        clearInterval(interval);
        setIsRunning(false);
        setIsSubmitting(false);
        setIsPolling(false);
        alert('Code execution timed out.');
        return;
      }

      api.submissions.get(subId)
        .then(sub => {
          setSubmission(sub);
          if (sub.status !== 'PENDING' && sub.status !== 'RUNNING') {
            clearInterval(interval);
            api.submissions.getResults(subId)
              .then(resList => {
                setResults(resList);
                setIsRunning(false);
                setIsSubmitting(false);
                setIsPolling(false);

                const passed = sub.status === 'ACCEPTED' || sub.status === 'SAMPLE_PASSED';
                if (passed) {
                  playSound('success');
                  if (isSubmitFlow && onSolve) {
                    // Trigger solve callback
                    onSolve(sub.score || 100);
                  }
                } else {
                  playSound('fail');
                }
              })
              .catch(err => {
                console.error('Error fetching results:', err);
                setIsRunning(false);
                setIsSubmitting(false);
                setIsPolling(false);
              });
          }
        })
        .catch(err => {
          console.error('Error polling submission:', err);
          clearInterval(interval);
          setIsRunning(false);
          setIsSubmitting(false);
          setIsPolling(false);
        });
    }, 1000);
  };

  const handleRun = () => {
    if (isRunning || isSubmitting || isFinished) return;
    setIsRunning(true);
    setIsPolling(true);
    setResults(null);
    setSubmission(null);
    setShowConsole(true);
    playSound('submit');

    api.submissions.create({
      problem_id: problemId,
      language: language,
      source_code: code,
      run_samples_only: true,
      battle_id: battleId,
    })
      .then(res => {
        pollSubmission(res.id, false);
      })
      .catch(err => {
        console.error('Run failed:', err);
        setIsRunning(false);
        setIsPolling(false);
        alert(err.message || 'Failed to submit execution job.');
      });
  };

  const handleSubmit = () => {
    if (isRunning || isSubmitting || isFinished) return;
    setIsSubmitting(true);
    setIsPolling(true);
    setResults(null);
    setSubmission(null);
    setShowConsole(true);
    playSound('submit');

    api.submissions.create({
      problem_id: problemId,
      language: language,
      source_code: code,
      run_samples_only: false,
      battle_id: battleId,
    })
      .then(res => {
        pollSubmission(res.id, true);
      })
      .catch(err => {
        console.error('Submission failed:', err);
        setIsSubmitting(false);
        setIsPolling(false);
        alert(err.message || 'Failed to submit solution.');
      });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden min-w-0">
      {/* Editor Main Section */}
      <div className="flex-1 min-h-0 relative">
        <CodeEditor
          problemSlug={slug}
          templates={templates}
          code={code}
          onChangeCode={onChangeCode}
          language={language}
          onChangeLanguage={onChangeLanguage}
          onReset={() => {
            const startTpl = templates.find(t => t.language === language);
            onChangeCode(startTpl?.template_code || startTpl?.source_code || '');
          }}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onRun={handleRun}
          onSubmit={handleSubmit}
          focusMode={true}
          isFinished={isFinished}
          hideHints={true}
        />

        {/* Glow-indicator for solve state */}
        {isSolved && (
          <div className="absolute top-2 right-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-black select-none pointer-events-none z-10 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
            <Award className="w-4.5 h-4.5 animate-bounce" /> SOLVED
          </div>
        )}
      </div>

      {/* Resizing divider */}
      {showConsole && (
        <div
          onMouseDown={handleConsoleResize}
          className="h-[4px] bg-dark-border hover:bg-[#4F7DFF]/40 cursor-ns-resize transition-all shrink-0 z-20"
        />
      )}

      {/* Terminal & Outputs */}
      {showConsole ? (
        <div
          style={{ height: `${consoleHeight}px` }}
          className="bg-dark-panel flex flex-col shrink-0 overflow-hidden relative select-text"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-dark-border bg-dark-bg/25 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#4F7DFF]" />
              <span className="text-xs font-black tracking-wider text-gray-300">CONSOLE OUTPUT</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase select-none">
                Attempts: {attempts}
              </span>
              <button
                onClick={() => setShowConsole(false)}
                className="p-1 rounded hover:bg-dark-hover text-gray-400 hover:text-gray-250 transition-colors"
                title="Collapse Panel"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Test cases panel */}
          <div className="flex-1 min-h-0">
            <TestCasePanel
              testCases={testCases.map((tc, index) => ({
                id: tc.id || String(index),
                input: tc.input,
                expected_output: tc.expected_output,
                is_sample: tc.is_sample ?? true,
              }))}
              submission={submission}
              results={results}
              isPolling={isPolling}
              onCollapse={() => setShowConsole(false)}
              onMaximize={() => setConsoleHeight(consoleHeight >= 450 ? 260 : 480)}
            />
          </div>
        </div>
      ) : (
        <div className="bg-dark-panel border-t border-dark-border px-3 py-2 flex items-center justify-between select-none shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 tracking-wider">CONSOLE OUTPUT COLLAPSED</span>
          </div>
          <button
            onClick={() => setShowConsole(true)}
            className="p-1 rounded bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-250 transition-all active:scale-95"
            title="Expand Panel"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
