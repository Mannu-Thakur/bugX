import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, AlertTriangle, Terminal, Code, Cpu } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import type { SubmissionResponse, SubmissionResultResponse } from '../../../shared/lib/api';

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
}

export const TestCasePanel: React.FC<TestCasePanelProps> = ({
  testCases,
  submission,
  results,
  isPolling,
}) => {
  const [activeTab, setActiveTab] = useState<'cases' | 'result'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  // Auto-switch to result tab when execution starts
  useEffect(() => {
    if (isPolling) {
      setActiveTab('result');
    }
  }, [isPolling]);

  // Build display cases: sample test cases + first failing hidden case (if any)
  const firstFailingHidden = results?.find(r => r.is_first_failing_hidden && !r.passed);
  const displayCases: { id: string; input: string | null; expected_output: string | null; is_sample: boolean; label: string }[] = [
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
        return 'text-emerald-400';
      case 'WRONG_ANSWER':
        return 'text-rose-400';
      case 'PENDING':
      case 'RUNNING':
        return 'text-blue-400 animate-pulse';
      case 'COMPILE_ERROR':
      case 'RUNTIME_ERROR':
        return 'text-amber-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'SAMPLE_PASSED':
        return 'bg-emerald-500/10 border-emerald-500/25';
      case 'WRONG_ANSWER':
        return 'bg-rose-500/10 border-rose-500/25';
      case 'PENDING':
      case 'RUNNING':
        return 'bg-blue-500/10 border-blue-500/25';
      case 'COMPILE_ERROR':
      case 'RUNTIME_ERROR':
        return 'bg-amber-500/10 border-amber-500/25';
      default:
        return 'bg-dark-hover border-dark-border';
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel border-t border-dark-border select-text">
      {/* Header Tabs */}
      <div className="flex justify-between items-center px-4 border-b border-dark-border select-none bg-dark-bg/40">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('cases')}
            className={cn(
              'px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'cases'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Test Cases
          </button>
          {(submission || isPolling) && (
            <button
              onClick={() => setActiveTab('result')}
              className={cn(
                'px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5',
                activeTab === 'result'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              {isPolling ? 'Executing...' : 'Result'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'cases' ? (
          <div className="space-y-4">
            {/* Case selector */}
            <div className="flex flex-wrap gap-2 select-none">
              {displayCases.map((tc, idx) => {
                // Check if this specific case passed
                const matchResult = results?.find(r => r.test_case_id === tc.id);
                const isFailingHidden = !tc.is_sample && firstFailingHidden?.test_case_id === tc.id;
                return (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedCaseIdx(idx)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-all',
                      selectedCaseIdx === idx
                        ? isFailingHidden
                          ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                          : 'bg-dark-hover border-blue-500 text-gray-100'
                        : isFailingHidden
                          ? 'bg-rose-500/5 border-rose-500/40 text-rose-400 hover:text-rose-300'
                          : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {matchResult ? (
                      matchResult.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    )}
                    {tc.label}
                  </button>
                );
              })}
            </div>

            {/* Selected case details */}
            {displayCases[selectedCaseIdx] && (() => {
              const selectedCase = displayCases[selectedCaseIdx];
              const res = results?.find(r => r.test_case_id === selectedCase.id);
              return (
                <div className="space-y-3 font-mono text-xs">
                  {/* 3-column layout: Input | Expected Output | Your Output */}
                  <div className={cn("grid gap-3", res ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-sans font-bold mb-1 select-none">Input</div>
                      <pre className="bg-dark-input border border-dark-border p-2.5 rounded-lg overflow-auto text-gray-100 max-h-32">
                        {selectedCase.input || res?.test_case_input || '(hidden)'}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-sans font-bold mb-1 select-none">Expected Output</div>
                      <pre className="bg-dark-input border border-dark-border p-2.5 rounded-lg overflow-auto text-gray-100 max-h-32">
                        {selectedCase.expected_output || res?.expected_output || '(hidden)'}
                      </pre>
                    </div>
                    {res && (
                      <div>
                        <div className={cn(
                          "text-[10px] uppercase font-sans font-bold mb-1 select-none",
                          res.passed ? "text-emerald-500" : "text-rose-500"
                        )}>
                          Your Output {res.passed ? 'OK' : 'Mismatch'}
                        </div>
                        <pre className={cn(
                          "border p-2.5 rounded-lg overflow-auto max-h-32",
                          res.passed
                            ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400"
                            : "bg-rose-500/5 border-rose-500/25 text-rose-400"
                        )}>
                          {res.stdout?.trim() || '(no output)'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Stderr / error output */}
                  {res?.stderr && res.stderr.trim() && (
                    <div>
                      <div className="text-[10px] text-amber-500 uppercase font-sans font-bold mb-1 select-none flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Stderr / Error Log
                      </div>
                      <pre className="bg-[#1f1618] border border-amber-950/40 p-3 rounded-lg overflow-auto text-amber-200 max-h-32">
                        {res.stderr}
                      </pre>
                    </div>
                  )}

                  {/* Execution stats */}
                  {res && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-sans font-bold mb-1 select-none">Execution Stats</div>
                      <div className="flex gap-4 text-[11px] text-gray-400 bg-dark-bg/40 p-2.5 rounded-lg border border-dark-border">
                        <span className="flex items-center gap-1"><Code className="w-3.5 h-3.5 text-blue-400" /> Runtime: {res.runtime_ms} ms</span>
                        <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-blue-400" /> Memory: {res.memory_kb} KB</span>
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
                <div className={cn('p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center', getStatusBg(submission.status))}>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block select-none">Submission Status</span>
                    <span className={cn('text-lg font-black tracking-wide', getStatusColor(submission.status))}>
                      {submission.status.replace('_', ' ')}
                    </span>
                  </div>

                  {submission.status !== 'COMPILE_ERROR' && submission.status !== 'RUNTIME_ERROR' && (
                    <div className="flex gap-4">
                      <div className="text-left font-mono">
                        <span className="block text-[10px] text-gray-500 uppercase font-sans font-bold select-none">Passed Cases</span>
                        <span className="text-sm font-bold text-gray-200">
                          {submission.passed_count} / {submission.total_count}
                        </span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="block text-[10px] text-gray-500 uppercase font-sans font-bold select-none">Score</span>
                        <span className="text-sm font-bold text-amber-400">
                          {submission.score} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pass/Fail Button Window */}
                {results && results.length > 0 && (
                  <div className="bg-dark-bg/60 border border-dark-border rounded-xl p-3 space-y-2">
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
                        <span className="text-dark-border/60">|</span>
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
                              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                              r.passed
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20",
                              canOpenDetails ? "cursor-pointer" : "cursor-default opacity-75"
                            )}
                            title={`${caseLabel}: ${r.passed ? 'Passed' : 'Failed'} (${r.runtime_ms}ms)`}
                          >
                            {r.passed ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
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
                    <pre className="bg-[#1f1618] border border-amber-950/40 p-4 rounded-xl overflow-auto text-xs font-mono text-amber-200 leading-relaxed max-h-60">
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
                          className="flex items-center justify-between p-2.5 bg-dark-bg/60 rounded-lg border border-dark-border text-xs cursor-pointer hover:bg-dark-hover transition-colors"
                        >
                          <span className="font-semibold text-gray-300">Sample Case {idx + 1}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 text-[10px]">{r.runtime_ms}ms</span>
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
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
                            "flex items-center justify-between p-2.5 bg-dark-bg/40 rounded-lg border border-dark-border/60 text-xs",
                            r.is_first_failing_hidden && !r.passed ? "cursor-pointer hover:bg-dark-hover transition-colors border-rose-500/30" : ""
                          )}
                        >
                          <span className="font-semibold text-gray-400">
                            Hidden Case {idx + 1}
                            {r.is_first_failing_hidden && !r.passed && (
                              <span className="ml-1.5 text-[10px] text-rose-400 font-normal">(click to view)</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 text-[10px]">{r.runtime_ms}ms</span>
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
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
