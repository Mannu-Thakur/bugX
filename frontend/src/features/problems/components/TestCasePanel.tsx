import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, XCircle, AlertTriangle, Terminal, Code, Cpu, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import type { SubmissionResponse, SubmissionResultResponse } from '../../../shared/lib/api';
import { AlgorithmVisualizer } from './AlgorithmVisualizer';

interface TestCase {
  id: string;
  input: string | null;
  expected_output: string | null;
  is_sample: boolean;
}

interface TestCasePanelProps {
  testCases: TestCase[];
  submission?: SubmissionResponse | null;
  results?: SubmissionResultResponse[] | null;
  isPolling?: boolean;
  paramNames?: string[];
  onMaximize?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
}

export const TestCasePanel: React.FC<TestCasePanelProps> = ({
  testCases,
  submission,
  results,
  isPolling,
  paramNames = [],
  onMaximize,
  onCollapse,
  isCollapsed = false,
}) => {
  const [activeTab, setActiveTab] = useState<'cases' | 'result' | 'visualizer'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customCases, setCustomCases] = useState<{ id: string; input: string }[]>([]);

  const addCustomCase = () => {
    const newCase = { id: `custom-${Date.now()}`, input: '' };
    setCustomCases(prev => [...prev, newCase]);
    // Switch to the new tab index (sample + firstFailing + existing customs)
    const newIdx = testCases.length + customCases.length + (firstFailingHidden && !testCases.some(tc => tc.id === firstFailingHidden.test_case_id) ? 1 : 0);
    setSelectedCaseIdx(newIdx);
  };

  const updateCustomCase = (id: string, input: string) => {
    setCustomCases(prev => prev.map(c => c.id === id ? { ...c, input } : c));
  };

  const removeCustomCase = (id: string) => {
    setCustomCases(prev => {
      const updated = prev.filter(c => c.id !== id);
      setSelectedCaseIdx(Math.max(0, selectedCaseIdx - 1));
      return updated;
    });
  };

  // Auto-switch to result tab when execution starts
  useEffect(() => {
    if (isPolling) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('result');
    }
  }, [isPolling]);

  // Build display cases: sample test cases + first failing hidden case (if any)
  const firstFailingHidden = results?.find(r => r.is_first_failing_hidden && !r.passed);
  const displayCases: { id: string; input: string | null; expected_output: string | null; is_sample: boolean; label: string; isCustom?: boolean }[] = [
    ...testCases.map((tc, idx) => ({ ...tc, label: `Case ${idx + 1}` })),
  ];
  if (firstFailingHidden && !testCases.some(tc => tc.id === firstFailingHidden.test_case_id)) {
    displayCases.push({
      id: firstFailingHidden.test_case_id,
      input: firstFailingHidden.test_case_input,
      expected_output: firstFailingHidden.expected_output,
      is_sample: false,
      label: 'Failing Hidden Case',
    });
  }
  // Append custom user-added cases
  customCases.forEach((cc, idx) => {
    displayCases.push({
      id: cc.id,
      input: cc.input,
      expected_output: null,
      is_sample: false,
      label: `Custom ${idx + 1}`,
      isCustom: true,
    });
  });

  // Group results into sample and hidden
  const sampleResults = results?.filter(r =>
    testCases.some(tc => tc.id === r.test_case_id)
  ) || [];

  const hiddenResults = results?.filter(r =>
    !testCases.some(tc => tc.id === r.test_case_id)
  ) || [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'SAMPLE_PASSED':
        return 'text-emerald-400 font-extrabold';
      case 'WRONG_ANSWER':
        return 'text-rose-450';
      case 'PENDING':
      case 'RUNNING':
        return 'text-gray-400 animate-pulse';
      case 'COMPILE_ERROR':
      case 'RUNTIME_ERROR':
        return 'text-amber-500/70';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'SAMPLE_PASSED':
        return 'bg-emerald-950/20 border border-emerald-500/20';
      case 'WRONG_ANSWER':
        return 'bg-rose-500/5 border-rose-500/15';
      case 'PENDING':
      case 'RUNNING':
        return 'bg-white/[0.03] border-white/[0.06]';
      case 'COMPILE_ERROR':
      case 'RUNTIME_ERROR':
        return 'bg-amber-500/5 border-amber-500/15';
      default:
        return 'bg-dark-hover border-dark-border';
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text select-text rounded-xl overflow-hidden border border-white/[0.04] shadow-lg">
      {/* Header Tabs */}
      <div className="flex items-center px-4 select-none shrink-0 bg-dark-panel-alt h-[38px] border-b border-dark-border">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('cases')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all',
              activeTab === 'cases'
                ? 'text-dark-text font-bold'
                : 'text-dark-text/50 hover:text-dark-text/80 font-medium'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            Testcase
          </button>

          {/* Pipe separator */}
          <span className="text-dark-border text-xs font-light px-0.5 select-none">|</span>

          <button
            onClick={() => setActiveTab('result')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all',
              activeTab === 'result'
                ? 'text-dark-text font-bold'
                : 'text-dark-text/50 hover:text-dark-text/80 font-medium'
            )}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            {isPolling ? 'Executing...' : 'Test Result'}
            {isPolling && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Pipe separator */}
          <span className="text-dark-border text-xs font-light px-0.5 select-none">|</span>

          <button
            onClick={() => setActiveTab('visualizer')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all',
              activeTab === 'visualizer'
                ? 'text-dark-text font-bold'
                : 'text-dark-text/50 hover:text-dark-text/80 font-medium'
            )}
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
            Visualizer
          </button>
        </div>

        {/* Right Utility Icons */}
        <div className="ml-auto flex items-center gap-1 select-none">
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1 rounded hover:bg-dark-hover text-dark-text/50 hover:text-dark-text transition-colors cursor-pointer"
              title="Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded hover:bg-dark-hover text-dark-text/50 hover:text-dark-text transition-colors cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-dark-bg">
        {activeTab === 'visualizer' ? (
          <AlgorithmVisualizer />
        ) : activeTab === 'cases' ? (
          <div className="space-y-4">
            {/* Case selector */}
            <div className="flex flex-wrap items-center gap-2 select-none">
              {displayCases.map((tc, idx) => {
                const isFailingHidden = !tc.is_sample && firstFailingHidden?.test_case_id === tc.id;
                return (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedCaseIdx(idx)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all',
                      selectedCaseIdx === idx
                        ? isFailingHidden
                          ? 'bg-rose-950/20 text-rose-300'
                          : 'bg-dark-hover text-dark-text font-bold shadow-sm'
                        : isFailingHidden
                          ? 'bg-transparent text-rose-450 hover:text-rose-350'
                          : 'bg-transparent text-dark-text/50 hover:text-dark-text/80'
                    )}
                  >
                    {tc.label}
                  </button>
                );
              })}
              
              {/* Plus Button */}
              <button
                onClick={addCustomCase}
                className="px-2 py-1 rounded-md text-xs font-bold bg-transparent text-dark-text/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer select-none"
                title="Add custom test case"
              >
                +
              </button>
            </div>

            {/* Selected case details */}
            {displayCases[selectedCaseIdx] && (() => {
              const selectedCase = displayCases[selectedCaseIdx];
              const res = results?.find(r => r.test_case_id === selectedCase.id);
              const inputLines = (selectedCase.input || res?.test_case_input || '').split('\n').filter(line => line.trim() !== '');

              // Custom case — show editable textarea
              if (selectedCase.isCustom) {
                const customCase = customCases.find(c => c.id === selectedCase.id);
                return (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-dark-text/50 font-sans font-medium select-none">Custom Input</div>
                      <button
                        onClick={() => removeCustomCase(selectedCase.id)}
                        className="text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors cursor-pointer font-sans select-none"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={customCase?.input ?? ''}
                      onChange={(e) => updateCustomCase(selectedCase.id, e.target.value)}
                      placeholder="Enter your custom input here..."
                      className="w-full min-h-[100px] bg-[#252526] border-none px-3 py-2 rounded-lg text-dark-text font-mono text-xs resize-y placeholder:text-dark-text/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-dark-text/30 font-sans select-none">This custom case is only used for your local Run.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 font-mono text-xs">
                  {/* Vertical layout for parameters */}
                  <div className="space-y-4">
                    {/* Inputs */}
                    {inputLines.map((val, i) => {
                      const paramLabel = paramNames && paramNames[i]
                        ? `${paramNames[i]} =`
                        : (inputLines.length > 1 ? `param_${i + 1} =` : 'input =');
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="text-[12px] text-dark-text/50 font-sans font-medium select-none">{paramLabel}</div>
                          <pre className="bg-[#252526] border-none px-3 py-1.5 rounded-lg text-dark-text font-mono text-xs overflow-auto max-h-24 w-full">
                            {val}
                          </pre>
                        </div>
                      );
                    })}

                    {/* Expected Output */}
                    <div className="space-y-1.5">
                      <div className="text-[12px] text-dark-text/50 font-sans font-medium select-none">Expected Output =</div>
                      <pre className="bg-[#252526] border-none px-3 py-1.5 rounded-lg text-dark-text font-mono text-xs overflow-auto max-h-24 w-full">
                        {selectedCase.expected_output || res?.expected_output || '(hidden)'}
                      </pre>
                    </div>

                    {/* Your Output */}
                    {res && (
                      <div className="space-y-1.5">
                        <div className={cn("text-[12px] font-sans font-medium select-none", res.passed ? "text-emerald-450" : "text-rose-450")}>
                          Your Output {res.passed ? 'OK' : 'Mismatch'} =
                        </div>
                        <pre className="bg-[#252526] border-none px-3 py-1.5 rounded-lg text-dark-text font-mono text-xs overflow-auto max-h-24 w-full">
                          {res.stdout?.trim() || '(no output)'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Stderr / error output */}
                  {res?.stderr && res.stderr.trim() && (
                    <div>
                      <div className="text-[10px] text-amber-500 uppercase font-sans font-bold mb-1 select-none flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Stderr / Error Log
                      </div>
                      <pre className="bg-[#1c1812] p-3 rounded-xl overflow-auto text-amber-200/80 max-h-32 border-none">
                        {res.stderr}
                      </pre>
                    </div>
                  )}

                  {/* Execution stats */}
                  {res && (
                    <div>
                      <div className="text-[10px] text-gray-550 uppercase font-sans font-bold mb-1 select-none">Execution Stats</div>
                      <div className="flex gap-4 text-[11px] text-gray-500 bg-white/[0.015] p-2.5 rounded-lg border-none">
                        <span className="flex items-center gap-1"><Code className="w-3.5 h-3.5 text-gray-600" /> Runtime: {res.runtime_ms} ms</span>
                        <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-gray-600" /> Memory: {res.memory_kb} KB</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            {/* polling or loading state */}
            {isPolling && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 select-none">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs text-gray-400 font-medium">Running tests in Judge0 sandbox...</div>
              </div>
            )}

            {/* Results output */}
            {submission && !isPolling && (
              <div className="space-y-4">
                {/* Result header banner */}
                <div className={cn('p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center', getStatusBg(submission.status))}>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block select-none">Submission Status</span>
                    <span className={cn('text-lg font-black tracking-wide', getStatusColor(submission.status))}>
                      {submission.status.replace('_', ' ')}
                    </span>
                  </div>

                  {submission.status !== 'COMPILE_ERROR' && submission.status !== 'RUNTIME_ERROR' && (
                    <div className="flex gap-4">
                      <div className="text-left font-mono">
                        <span className="block text-[10px] text-gray-550 uppercase font-sans font-bold select-none">Passed Cases</span>
                        <span className="text-sm font-bold text-gray-200">
                          {submission.passed_count} / {submission.total_count}
                        </span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="block text-[10px] text-gray-550 uppercase font-sans font-bold select-none">Score</span>
                        <span className="text-sm font-bold text-amber-400">
                          {submission.score} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pass/Fail Button Window */}
                {results && results.length > 0 && (
                  <div className="bg-white/[0.015] rounded-xl p-4 space-y-2.5 border-none">
                    <div className="flex items-center justify-between select-none">
                      <span className="text-[10px] text-gray-500 uppercase font-sans font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Test Results
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono select-none">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {results.filter(r => r.passed).length} passed
                        </span>
                        <span className="text-gray-700">|</span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <XCircle className="w-3 h-3" />
                          {results.filter(r => !r.passed).length} failed
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {results.map((r, idx) => {
                        const isSample = testCases.some(tc => tc.id === r.test_case_id);
                        const canOpenDetails = isSample || r.is_first_failing_hidden;
                        const hiddenIndex = hiddenResults.findIndex(hr => hr.id === r.id);
                        const caseLabel = isSample
                          ? `Sample ${testCases.findIndex(tc => tc.id === r.test_case_id) + 1}`
                          : `Hidden ${hiddenIndex + 1}`;
                        return (
                          <button
                            key={r.id}
                            disabled={!canOpenDetails}
                            onClick={() => {
                               const caseIdx = displayCases.findIndex(dc => dc.id === r.test_case_id);
                               if (caseIdx >= 0) {
                                 setSelectedCaseIdx(caseIdx);
                                 setActiveTab('cases');
                               }
                            }}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border-none",
                              r.passed
                                ? "bg-emerald-950/20 text-emerald-400/90 hover:bg-emerald-950/40"
                                : "bg-rose-950/20 text-rose-400/90 hover:bg-rose-950/40",
                              canOpenDetails ? "cursor-pointer" : "cursor-default opacity-75"
                            )}
                            title={`${caseLabel}: ${r.passed ? 'Passed' : 'Failed'} (${r.runtime_ms}ms)`}
                          >
                            {r.passed ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-500/70" />
                            )}
                            <span>{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Compilation / Runtime Errors */}
                {submission.error_message && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-amber-500 uppercase font-sans font-bold flex items-center gap-1.5 select-none">
                      <AlertTriangle className="w-3.5 h-3.5" /> Log output
                    </div>
                    <pre className="bg-[#1a0f12] p-4 rounded-xl overflow-auto text-xs font-mono text-rose-200/90 leading-relaxed max-h-60 border-none">
                      {submission.error_message}
                    </pre>
                  </div>
                )}

                {/* Detailed cases summary list */}
                {results && results.length > 0 && (
                  <div className="space-y-2 select-none">
                    <h4 className="text-xs font-bold text-gray-400">Execution Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Sample Results */}
                      {sampleResults.map((r, idx) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            // Switch to test cases tab and select this case
                            const caseIdx = displayCases.findIndex(dc => dc.id === r.test_case_id);
                            if (caseIdx >= 0) {
                              setSelectedCaseIdx(caseIdx);
                              setActiveTab('cases');
                            }
                          }}
                          className="flex items-center justify-between p-3 bg-white/[0.015] rounded-xl text-xs cursor-pointer hover:bg-white/[0.035] transition-colors border-none"
                        >
                          <span className="font-semibold text-gray-300">Sample Case {idx + 1}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 text-[10px]">{r.runtime_ms}ms</span>
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500/70 flex-shrink-0" />
                            )}
                          </span>
                        </div>
                      ))}

                      {/* Hidden Results */}
                      {hiddenResults.map((r, idx) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            if (r.is_first_failing_hidden) {
                              const caseIdx = displayCases.findIndex(dc => dc.id === r.test_case_id);
                              if (caseIdx >= 0) {
                                setSelectedCaseIdx(caseIdx);
                                setActiveTab('cases');
                              }
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 bg-white/[0.015] rounded-xl text-xs border-none",
                            r.is_first_failing_hidden && !r.passed ? "cursor-pointer hover:bg-white/[0.035] bg-rose-950/10 text-rose-300 transition-colors" : ""
                          )}
                        >
                          <span className="font-semibold text-gray-450">
                            Hidden Case {idx + 1}
                            {r.is_first_failing_hidden && !r.passed && (
                              <span className="ml-1.5 text-[10px] text-rose-450 font-normal">(click to view)</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 text-[10px]">{r.runtime_ms}ms</span>
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500/70 flex-shrink-0" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
