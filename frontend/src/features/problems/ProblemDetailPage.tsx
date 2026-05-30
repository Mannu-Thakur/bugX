import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Shield, Database, Award, CheckCircle, Tag as TagIcon, Layout, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../shared/lib/api';
import type { SubmissionResponse, SubmissionResultResponse } from '../../shared/lib/api';
import { MOCK_PROBLEM_DETAILS } from '../../shared/lib/mockData';
import { Badge } from '../../shared/ui/badge/Badge';
import { Button } from '../../shared/ui/button/Button';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { SplitPane } from './components/SplitPane';
import { CodeEditor } from './components/CodeEditor';
import { TestCasePanel } from './components/TestCasePanel';
import { BestSubmissionDetails } from './components/BestSubmissionDetails';

export const ProblemDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { error: showToastError, success: showToastSuccess } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionResponse | null>(null);
  const [results, setResults] = useState<SubmissionResultResponse[] | null>(null);
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState(false);
  const [isLoadingLastSub, setIsLoadingLastSub] = useState(false);
  const [lastSubmissionData, setLastSubmissionData] = useState<{ source_code: string; language: string } | null>(null);

  // Timer States
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsActive, setTimerIsActive] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (timerIsActive) {
      intervalId = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [timerIsActive]);

  const formatTimerTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');
    
    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  // Responsive state
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [mobileTab, setMobileTab] = useState<'description' | 'editor'>('description');

  const pollingCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  // Fetch Problem details
  const { data: problem, isLoading, isError, error } = useQuery({
    queryKey: ['problems', 'detail', slug],
    queryFn: async () => {
      try {
        return await api.problems.get(slug || '');
      } catch {
        // Offline fallback
        const mock = MOCK_PROBLEM_DETAILS[slug || ''];
        if (mock) return mock;
        throw new Error('Problem not found');
      }
    },
    enabled: !!slug,
    retry: 0,
  });

  // Fetch best submission
  const { data: bestSubmission } = useQuery({
    queryKey: ['problems', 'detail', slug, 'best-submission'],
    queryFn: async () => {
      try {
        return await api.problems.getBestSubmission(slug || '');
      } catch (err: unknown) {
        const errorObj = err as { status?: number };
        if (errorObj?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!slug && !!user,
    retry: (failureCount, error: unknown) => {
      const errorObj = error as { status?: number };
      if (errorObj?.status === 404) return false;
      return failureCount < 3;
    },
  });

  // Polling loop
  const pollSubmission = (
    id: string,
    isRunOnly: boolean,
    onTerminal: (sub: SubmissionResponse) => void,
    onScoreUpdated?: () => void
  ) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let scorePollingCount = 0;

    const check = async () => {
      try {
        const sub = await api.submissions.get(id);
        
        if (sub.status === 'PENDING' || sub.status === 'RUNNING') {
          timeoutId = setTimeout(check, 1500);
        } else {
          // Status is terminal
          if (!isRunOnly && sub.status === 'ACCEPTED' && sub.score === 0) {
            scorePollingCount++;
            if (scorePollingCount < 30) {
              onTerminal(sub); // Let user see progress
              timeoutId = setTimeout(check, 2000);
              return;
            }
          }
          
          onTerminal(sub);
          if (onScoreUpdated && sub.status === 'ACCEPTED') {
            onScoreUpdated();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
        timeoutId = setTimeout(check, 2000);
      }
    };

    timeoutId = setTimeout(check, 1000);
    return () => clearTimeout(timeoutId);
  };

  const handleLoadLastSubmission = async () => {
    if (!user || !slug) return;
    setIsLoadingLastSub(true);
    try {
      const lastSub = await api.problems.getLastSubmission(slug);
      setLastSubmissionData({ source_code: lastSub.source_code, language: lastSub.language });
      showToastSuccess('Last submission loaded into editor.');
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 404) {
        showToastError('No previous submissions found for this problem.');
      } else {
        showToastError(errorObj?.message || 'Failed to load last submission.');
      }
    } finally {
      setIsLoadingLastSub(false);
    }
  };

  const handleRun = async (code: string, language: string) => {
    if (!user) {
      showToastError("Please log in to run your code.");
      return;
    }
    if (!problem) return;

    setIsRunning(true);
    setIsPolling(true);
    setResults(null);
    setActiveSubmission(null);

    // Switch tab on mobile to display results
    if (!isLargeScreen) {
      setMobileTab('editor');
    }

    try {
      const response = await api.submissions.create({
        problem_id: problem.id,
        language,
        source_code: code,
        run_samples_only: true,
      });

      const cleanup = pollSubmission(response.id, true, async (finalSub) => {
        setActiveSubmission(finalSub);
        setIsPolling(false);
        setIsRunning(false);

        try {
          const resDetails = await api.submissions.getResults(response.id);
          setResults(resDetails);
        } catch (err) {
          console.error("Failed to load results", err);
        }
      });

      pollingCleanupRef.current = cleanup;
    } catch (err: unknown) {
      setIsRunning(false);
      setIsPolling(false);
      const errorObj = err as { code?: string; status?: number; message?: string };
      if (errorObj?.code === 'RATE_LIMIT' || errorObj?.status === 429) {
        showToastError("Too many requests. Please wait before trying again.");
      } else {
        showToastError(errorObj?.message || "Failed to initiate test run.");
      }
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    if (!user) {
      showToastError("Please log in to submit your solution.");
      return;
    }
    if (!problem) return;

    setIsSubmitting(true);
    setIsPolling(true);
    setResults(null);
    setActiveSubmission(null);

    if (!isLargeScreen) {
      setMobileTab('editor');
    }

    try {
      const response = await api.submissions.create({
        problem_id: problem.id,
        language,
        source_code: code,
        run_samples_only: false,
      });

      const cleanup = pollSubmission(
        response.id,
        false,
        async (finalSub) => {
          setActiveSubmission(finalSub);
          
          if (finalSub.status !== 'PENDING' && finalSub.status !== 'RUNNING') {
            if (finalSub.status === 'ACCEPTED' && finalSub.score > 0) {
              setIsPolling(false);
              setIsSubmitting(false);
              showToastSuccess("Solution accepted! Score awarded.");
              queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
              queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'best-submission'] });
            } else if (finalSub.status !== 'ACCEPTED') {
              setIsPolling(false);
              setIsSubmitting(false);
              showToastError(`Submission failed: ${finalSub.status.replace('_', ' ')}`);
              try {
                const resDetails = await api.submissions.getResults(response.id);
                setResults(resDetails);
              } catch (err) {
                console.error("Failed to load results", err);
              }
            }
          }
        },
        async () => {
          // Scoring finished completely
          setIsPolling(false);
          setIsSubmitting(false);
          queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
          queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'best-submission'] });

          try {
            const resDetails = await api.submissions.getResults(response.id);
            setResults(resDetails);
          } catch (err) {
            console.error("Failed to load results", err);
          }
        }
      );

      pollingCleanupRef.current = cleanup;
    } catch (err: unknown) {
      setIsSubmitting(false);
      setIsPolling(false);
      const errorObj = err as { code?: string; status?: number; message?: string };
      if (errorObj?.code === 'RATE_LIMIT' || errorObj?.status === 429) {
        showToastError("Too many requests. Please wait before trying again.");
      } else {
        showToastError(errorObj?.message || "Failed to submit solution.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-pulse">
        <div className="h-6 w-24 bg-dark-hover rounded" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 bg-dark-hover rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-dark-hover rounded" />
            <div className="h-5 w-24 bg-dark-hover rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-dark-hover rounded" />
          <div className="h-4 w-full bg-dark-hover rounded" />
          <div className="h-4 w-5/6 bg-dark-hover rounded" />
        </div>
      </div>
    );
  }

  if (isError || !problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <span className="text-4xl">404</span>
        <h2 className="text-2xl font-bold text-gray-200">Problem Not Found</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          {error instanceof Error ? error.message : "The problem could not be found or has not been published yet."}
        </p>
        <Link to="/problems">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  // Description view layout
  const renderDescription = () => {
    const isHtmlDescription = problem.description.includes('<') && problem.description.includes('>');
    return (
      <div className="space-y-6 p-6 select-text overflow-y-auto h-full">
        {/* Header Info */}
        <div className="space-y-3 pb-6 border-b border-dark-border select-none">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant={problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'}>
              {problem.difficulty}
            </Badge>
            <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {problem.acceptance_rate ? problem.acceptance_rate.toFixed(1) : '0.0'}% Acceptance
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight break-words">
            {problem.title}
          </h1>
        </div>

        {/* Description Body */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm space-y-6 overflow-hidden">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-200 border-b border-dark-border pb-2 select-none flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded-full" />
              Description
            </h2>
            <div 
              className={`text-gray-300 text-sm leading-relaxed font-sans problem-description-content break-words overflow-x-auto ${
                isHtmlDescription ? 'whitespace-normal' : 'whitespace-pre-wrap'
              }`}
              dangerouslySetInnerHTML={{ __html: problem.description }}
            />
          </div>

        {/* Dynamic Examples from Sample Test Cases if not already embedded in description */}
        {!problem.description.toLowerCase().includes('example 1') && 
         !problem.description.toLowerCase().includes('example:') && 
         problem.sample_test_cases && 
         problem.sample_test_cases.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-dark-border">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider select-none">Examples</h3>
            <div className="space-y-3.5">
              {problem.sample_test_cases.map((tc, index) => (
                <div key={tc.id} className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border/80 space-y-2.5 overflow-hidden">
                  <div className="text-xs font-bold text-gray-400 select-none">Example {index + 1}</div>
                  <div className="font-mono text-xs space-y-1.5 pl-3 border-l-2 border-blue-500 min-w-0">
                    <div className="break-all whitespace-pre-wrap">
                      <span className="text-gray-500 font-bold">Input: </span>
                      <span className="text-gray-300">{tc.input}</span>
                    </div>
                    <div className="break-all whitespace-pre-wrap">
                      <span className="text-gray-500 font-bold">Output: </span>
                      <span className="text-gray-300">{tc.expected_output}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {problem.constraints && (
          <div className="pt-4 border-t border-dark-border">
            <h3 className="text-xs font-bold text-gray-300 mb-2 select-none flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
              Constraints
            </h3>
            <div className="text-gray-400 text-xs font-mono bg-dark-bg p-3 rounded-lg border border-dark-border leading-normal whitespace-pre-wrap break-words overflow-x-auto">
              {problem.constraints}
            </div>
          </div>
        )}
      </div>

      {/* Best submission (if exists) */}
      <BestSubmissionDetails bestSubmission={bestSubmission} />

      {/* Execution specs & Tags grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specs */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 shadow-sm space-y-3 select-none">
          <h2 className="text-xs font-extrabold uppercase text-gray-400 border-b border-dark-border pb-1.5">Execution Specs</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Limit
              </span>
              <span className="text-gray-300 font-mono font-medium">{problem.time_limit_ms} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Memory Limit
              </span>
              <span className="text-gray-300 font-mono font-medium">{(problem.memory_limit_kb / 1024).toFixed(0)} MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Visibility
              </span>
              <span className="text-emerald-400 font-medium font-sans">Public (Published)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Base Score
              </span>
              <span className="text-amber-400 font-mono font-bold">{problem.score_base} pts</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="bg-dark-panel border border-dark-border rounded-xl p-4 shadow-sm space-y-3 select-none">
            <h2 className="text-xs font-extrabold uppercase text-gray-400 border-b border-dark-border pb-1.5 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5" /> Tags
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <Link
                  key={t.id}
                  to={`/problems?tag=${encodeURIComponent(t.name)}`}
                  className="text-[10px] px-2.5 py-1 bg-dark-bg hover:bg-dark-hover rounded-md border border-dark-border text-gray-400 hover:text-gray-200 transition-colors font-semibold"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

  // Editor and TestCase layout
  const renderEditorWorkspace = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Code Editor */}
      <div className={isTestPanelCollapsed ? 'flex-1' : 'flex-1 min-h-[400px]'}>
        <CodeEditor
          problemSlug={problem.slug}
          templates={problem.templates}
          onRun={handleRun}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onLoadLastSubmission={user ? handleLoadLastSubmission : undefined}
          isLoadingLastSubmission={isLoadingLastSub}
          lastSubmission={lastSubmissionData}
        />
      </div>

      {/* Guest warning banner */}
      {!user && (
        <div className="p-3 bg-amber-500/10 border-t border-b border-amber-500/25 flex flex-col sm:flex-row justify-between items-center gap-2 select-none">
          <span className="text-xs text-amber-400 font-medium">You are in preview mode. Log in to execute your code.</span>
          <Link to="/login">
            <Button size="sm" variant="secondary" className="text-xs h-7 py-0">Sign In</Button>
          </Link>
        </div>
      )}

      {/* Toggle bar for Test Case Panel */}
      <button
        onClick={() => setIsTestPanelCollapsed(!isTestPanelCollapsed)}
        className="w-full px-4 py-1.5 border-t border-dark-border bg-dark-bg/60 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-all select-none cursor-pointer group"
        title={isTestPanelCollapsed ? 'Show Test Cases' : 'Hide Test Cases'}
      >
        {isTestPanelCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
        )}
        <span className="font-semibold group-hover:text-blue-400 transition-colors">
          {isTestPanelCollapsed ? 'Show Test Cases & Results' : 'Hide Test Cases'}
        </span>
      </button>

      {/* Test Case & Result Panel */}
      {!isTestPanelCollapsed && (
        <div className="h-[340px] border-t border-dark-border">
          <TestCasePanel
            testCases={problem.sample_test_cases.map(tc => ({
              id: tc.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_sample: tc.is_sample,
            }))}
            submission={activeSubmission}
            results={results}
            isPolling={isPolling}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full px-2 py-2 space-y-2">
      {/* Back button header with sleek Coding Timer */}
      <div className="flex items-center justify-between select-none flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link to="/problems" className="inline-flex items-center text-xs text-gray-400 hover:text-gray-200 font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Catalog
          </Link>
          
          {/* Coding Timer */}
          <div className="flex items-center gap-2 bg-dark-panel border border-dark-border px-3 py-1 rounded-full shadow-inner select-none font-sans text-xs">
            <div className="flex items-center gap-1 border-r border-dark-border/60 pr-2">
              <span className={`relative flex h-1.5 w-1.5 ${timerIsActive ? 'animate-pulse' : ''}`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timerIsActive ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${timerIsActive ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">Stopwatch</span>
            </div>
            
            <span className={`font-mono font-black tracking-widest text-xs ${timerIsActive ? 'text-emerald-400' : 'text-gray-400'}`}>
              {formatTimerTime(timerSeconds)}
            </span>
            
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-dark-border/60 text-[10px]">
              <button
                type="button"
                onClick={() => setTimerIsActive(!timerIsActive)}
                className="hover:text-emerald-400 font-black uppercase tracking-wider transition-colors cursor-pointer select-none px-1 py-0.5 rounded hover:bg-dark-hover"
                title={timerIsActive ? 'Pause' : 'Start'}
              >
                {timerIsActive ? 'Pause' : 'Start'}
              </button>
              <span className="text-dark-border/60 font-sans">|</span>
              <button
                type="button"
                onClick={() => {
                  setTimerIsActive(false);
                  setTimerSeconds(0);
                }}
                className="hover:text-rose-400 font-black uppercase tracking-wider transition-colors cursor-pointer select-none px-1 py-0.5 rounded hover:bg-dark-hover"
                title="Reset"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Tab Control */}
        {!isLargeScreen && (
          <div className="flex bg-dark-bg p-0.5 rounded-lg border border-dark-border">
            <button
              onClick={() => setMobileTab('description')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                mobileTab === 'description' ? 'bg-dark-hover text-blue-400' : 'text-gray-400'
              }`}
            >
              <Layout className="w-3.5 h-3.5" /> Description
            </button>
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                mobileTab === 'editor' ? 'bg-dark-hover text-blue-400' : 'text-gray-400'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Workspace
            </button>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      {isLargeScreen ? (
        <SplitPane
          left={renderDescription()}
          right={renderEditorWorkspace()}
          initialLeftWidthPercent={42}
        />
      ) : (
        <div className="border border-dark-border rounded-lg bg-dark-panel overflow-hidden h-[calc(100vh-115px)]">
          {mobileTab === 'description' ? renderDescription() : renderEditorWorkspace()}
        </div>
      )}
    </div>
  );
};
