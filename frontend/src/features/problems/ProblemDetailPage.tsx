import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, Database, Award, CheckCircle, Tag as TagIcon, Layout, Terminal, ChevronDown, ChevronUp, Lightbulb, Clock, GripHorizontal, ChevronRight, Play, StickyNote, CloudUpload, Lock, BookOpen } from 'lucide-react';
import { api } from '../../shared/lib/api';
import type { SubmissionResponse, SubmissionResultResponse } from '../../shared/lib/api';
import { safeParseDate } from '../../shared/lib/date';
import { MOCK_PROBLEM_DETAILS } from '../../shared/lib/mockData';
import { Button } from '../../shared/ui/button/Button';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { SplitPane } from './components/SplitPane';
import { CodeEditor } from './components/CodeEditor';
import { TestCasePanel } from './components/TestCasePanel';
import { BestSubmissionDetails } from './components/BestSubmissionDetails';
import { cn } from '../../shared/lib/cn';

export const ProblemDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { error: showToastError, success: showToastSuccess, registerBackgroundSubmission, setActivePageSubmissionId, markSubmissionHandled } = useToast();

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

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionResponse | null>(null);
  const [results, setResults] = useState<SubmissionResultResponse[] | null>(null);
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState(false);
  const [testPanelHeight, setTestPanelHeight] = useState(340);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  // Lifted Editor States & Tab States
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>('cpp');
  const [code, setCode] = useState('');

  // Notes state
  const [notes, setNotes] = useState('');
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = testPanelHeight;
    hasDraggedRef.current = false;

    // Visual feedback for dragging
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isTestPanelCollapsed) {
        const deltaY = moveEvent.clientY - startYRef.current;
        if (deltaY < -10) {
          setIsTestPanelCollapsed(false);
          startYRef.current = moveEvent.clientY;
          startHeightRef.current = 150;
          hasDraggedRef.current = true;
        }
        return;
      }

      const deltaY = moveEvent.clientY - startYRef.current;
      if (Math.abs(deltaY) > 4) {
        hasDraggedRef.current = true;
      }

      const newHeight = startHeightRef.current - deltaY;
      const clampedHeight = Math.max(150, Math.min(newHeight, 600));
      setTestPanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (!hasDraggedRef.current) {
        setIsTestPanelCollapsed(prev => !prev);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [isLoadingLastSub, setIsLoadingLastSub] = useState(false);
  const [lastSubmissionData, setLastSubmissionData] = useState<{ source_code: string; language: string } | null>(null);

  // Helper functions for starter and saved code
  const getStarterCode = (lang: 'python' | 'javascript' | 'cpp' | 'java', templatesList?: any[]) => {
    const list = templatesList || problem?.templates;
    if (!list) return '';
    const found = list.find((t: any) => t.language === lang);
    const defaultCode = lang === 'python'
      ? '# Write your python code here\n'
      : lang === 'javascript'
      ? '// Write your javascript code here\n'
      : lang === 'cpp'
      ? '// Write your C++ code here\n'
      : '// Write your Java code here\n';
    if (found) return found.source_code || found.template_code || defaultCode;
    return defaultCode;
  };

  const getSavedCode = (lang: 'python' | 'javascript' | 'cpp' | 'java', slugStr = slug, templatesList?: any[]) => {
    if (!slugStr) return '';
    const userPrefix = user ? `${user.id}_` : '';
    const draftKey = `draft_${userPrefix}${slugStr}_${lang}`;
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft !== null ? savedDraft : getStarterCode(lang, templatesList || problem?.templates);
  };

  // Sync draft code when problem details load, language changes, or user changes
  useEffect(() => {
    if (problem) {
      setCode(getSavedCode(language, problem.slug, problem.templates));
    }
  }, [problem?.slug, language, user?.id]);

  // Load notes from localStorage when problem changes or user changes
  useEffect(() => {
    if (problem) {
      const userPrefix = user ? `${user.id}_` : '';
      const savedNotes = localStorage.getItem(`notes_${userPrefix}${problem.slug}`);
      setNotes(savedNotes || '');
    }
  }, [problem?.slug, user?.id]);

  // When lastSubmission prop changes (loaded from API), apply it
  useEffect(() => {
    if (lastSubmissionData) {
      const lang = lastSubmissionData.language as 'python' | 'javascript' | 'cpp' | 'java';
      if (['python', 'javascript', 'cpp', 'java'].includes(lang)) {
        setLanguage(lang);
      }
      setCode(lastSubmissionData.source_code);
      if (problem) {
        const userPrefix = user ? `${user.id}_` : '';
        const draftKey = `draft_${userPrefix}${problem.slug}_${lang}`;
        localStorage.setItem(draftKey, lastSubmissionData.source_code);
      }
    }
  }, [lastSubmissionData, problem, user?.id]);

  const handleLanguageChange = (newLang: 'python' | 'javascript' | 'cpp' | 'java') => {
    setLanguage(newLang);
    if (problem) {
      setCode(getSavedCode(newLang, problem.slug, problem.templates));
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (problem) {
      const userPrefix = user ? `${user.id}_` : '';
      const draftKey = `draft_${userPrefix}${problem.slug}_${language}`;
      localStorage.setItem(draftKey, newCode);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset code to template? Your unsaved draft will be lost.')) {
      if (problem) {
        const userPrefix = user ? `${user.id}_` : '';
        const draftKey = `draft_${userPrefix}${problem.slug}_${language}`;
        localStorage.removeItem(draftKey);
        setCode(getStarterCode(language, problem.templates));
      }
    }
  };

  // Fetch user submissions for this problem
  const { data: userSubmissions, isLoading: isLoadingSubmissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['problems', 'detail', slug, 'user-submissions'],
    queryFn: async () => {
      if (!user || !problem) return null;
      return await api.users.getSubmissions(1, 50, problem.id);
    },
    enabled: !!slug && !!user && !!problem,
  });

  // Timer States
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'timer'>('stopwatch');
  const [timerPopoverOpen, setTimerPopoverOpen] = useState(false);
  const [tempHours, setTempHours] = useState(1);
  const [tempMinutes, setTempMinutes] = useState(0);
  const timerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (timerIsActive) {
      intervalId = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds(prev => prev + 1);
        } else {
          setTimerSeconds(prev => {
            if (prev <= 1) {
              setTimerIsActive(false);
              showToastSuccess("Timer finished! Time is up!");
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [timerIsActive, timerMode]);

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
  const [mobileTab, setMobileTab] = useState<'description' | 'submissions' | 'editor'>('description');

  const handleToggleNotes = () => {
    if (isLargeScreen) {
      setActiveTab('description');
    } else {
      setMobileTab('description');
    }
    setIsNotesExpanded(prev => !prev);
    if (!isNotesExpanded) {
      setTimeout(() => {
        const element = document.getElementById('notes-textarea');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLTextAreaElement).focus();
        }
      }, 100);
    }
  };

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
      setActivePageSubmissionId(null);
    };
  }, [setActivePageSubmissionId]);

  // problem query moved to top of component to avoid initialization order error

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

      setActivePageSubmissionId(response.id);
      registerBackgroundSubmission(response.id, problem.title, false);

      const cleanup = pollSubmission(
        response.id,
        false,
        async (finalSub) => {
          setActiveSubmission(finalSub);

          if (finalSub.status !== 'PENDING' && finalSub.status !== 'RUNNING') {
            markSubmissionHandled(response.id);
            // Invalidate user stats and submissions immediately on any terminal status
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            queryClient.invalidateQueries({ queryKey: ['users', 'stats'] });
            queryClient.invalidateQueries({ queryKey: ['user-submissions'] });
            queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'user-submissions'] });

            if (finalSub.status === 'ACCEPTED' && finalSub.score > 0) {
              setIsPolling(false);
              setIsSubmitting(false);
              showToastSuccess("Solution accepted! Score awarded.");
              queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
              queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'best-submission'] });
              navigate(`/problems/${slug}/submissions/${response.id}`);
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
              navigate(`/problems/${slug}/submissions/${response.id}`);
            }
          }
        },
        async () => {
          // Scoring finished completely
          markSubmissionHandled(response.id);
          setIsPolling(false);
          setIsSubmitting(false);
          queryClient.invalidateQueries({ queryKey: ['user-stats'] });
          queryClient.invalidateQueries({ queryKey: ['users', 'stats'] });
          queryClient.invalidateQueries({ queryKey: ['user-submissions'] });
          queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'user-submissions'] });
          queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
          queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug, 'best-submission'] });

          try {
            const resDetails = await api.submissions.getResults(response.id);
            setResults(resDetails);
          } catch (err) {
            console.error("Failed to load results", err);
          }
          navigate(`/problems/${slug}/submissions/${response.id}`);
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

  // Submissions tab layout
  const renderSubmissionsTab = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4 select-none">
          <Terminal className="w-10 h-10 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-300">Sign in to view submissions</h3>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            Log in to your account to view your past submission attempts and run history.
          </p>
          <Link to="/login">
            <Button size="sm" className="text-xs">Sign In</Button>
          </Link>
        </div>
      );
    }

    if (isLoadingSubmissions) {
      return (
        <div className="p-5 space-y-4 select-none">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 w-full bg-dark-hover/40 rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }

    if (!userSubmissions || userSubmissions.items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3 select-none">
          <CheckCircle className="w-9 h-9 text-gray-600 animate-pulse" />
          <h3 className="text-xs font-bold text-gray-400">No submissions yet</h3>
          <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
            Submit your solution to this problem to see your results and score here.
          </p>
        </div>
      );
    }

    const formatSubmissionTime = (dateStr: string) => {
      const d = safeParseDate(dateStr);
      const formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedTime = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else {
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) relative = `${diffDays}d ago`;
      }

      if (relative) {
        return `${formattedDate} ${formattedTime} (${relative})`;
      }
      return `${formattedDate} ${formattedTime}`;
    };

    const toggleSubmissionExpand = (subId: string) => {
      if (expandedSubmissionId === subId) {
        setExpandedSubmissionId(null);
      } else {
        setExpandedSubmissionId(subId);
      }
    };

    return (
      <div className="divide-y divide-dark-border/30 font-sans h-full overflow-y-auto">
        {userSubmissions.items.map((sub) => {
          const isExpanded = expandedSubmissionId === sub.id;
          const isAccepted = sub.status === 'ACCEPTED';

          let statusColor = "text-rose-400 bg-rose-500/5 border-rose-500/10";
          if (isAccepted) {
            statusColor = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
          } else if (sub.status === 'PENDING' || sub.status === 'RUNNING') {
            statusColor = "text-blue-400 bg-blue-500/5 border-blue-500/10";
          } else if (sub.status === 'TIME_LIMIT_EXCEEDED' || sub.status === 'MEMORY_LIMIT_EXCEEDED') {
            statusColor = "text-amber-400 bg-amber-500/5 border-amber-500/10";
          } else if (sub.status === 'COMPILE_ERROR') {
            statusColor = "text-orange-400 bg-orange-500/5 border-orange-500/10";
          }

          return (
            <div key={sub.id} className="transition-all hover:bg-dark-hover/10">
              {/* Submission row summary */}
              <div
                onClick={() => toggleSubmissionExpand(sub.id)}
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide",
                      statusColor
                    )}>
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono font-medium">
                      {sub.language}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {formatSubmissionTime(sub.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div className="space-y-0.5">
                    {isAccepted ? (
                      <div className="text-xs font-mono font-bold text-amber-400">
                        +{sub.score} pts
                      </div>
                    ) : (
                      <div className="text-xs font-mono font-semibold text-gray-500">
                        0 pts
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 font-mono">
                      {sub.runtime_ms !== null ? `${sub.runtime_ms} ms` : '--'}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 text-gray-500 transition-transform",
                    isExpanded && "rotate-90 text-blue-400"
                  )} />
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 animate-fade-in border-t border-dark-border/10 bg-dark-bg/20">
                  <div className="mt-2 space-y-3">
                    {sub.error_message && (
                      <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono whitespace-pre-wrap">
                        {sub.error_message}
                      </div>
                    )}

                    <div className="flex justify-between items-center select-none gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Submitted Code
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCode(sub.source_code);
                            const userPrefix = user ? `${user.id}_` : '';
                            const draftKey = `draft_${userPrefix}${problem.slug}_${sub.language}`;
                            localStorage.setItem(draftKey, sub.source_code);
                            setLanguage(sub.language as any);
                            showToastSuccess("Loaded submission code into editor.");
                            // Scroll or tab to workspace on mobile
                            if (!isLargeScreen) {
                              setMobileTab('editor');
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer"
                        >
                          Load into Editor
                        </button>
                        <Link
                          to={`/problems/${slug}/submissions/${sub.id}`}
                          className="px-2.5 py-1 bg-dark-hover/40 hover:bg-dark-hover text-gray-300 hover:text-white rounded border border-dark-border/80 text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          View Results
                        </Link>
                      </div>
                    </div>

                    <pre className="p-3 bg-dark-bg/60 border border-dark-border/60 rounded-lg overflow-x-auto text-[11px] font-mono text-gray-300 max-h-72 select-text whitespace-pre">
                      {sub.source_code}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Description view layout
  const renderDescription = () => {
    const isHtmlDescription = problem.description.includes('<') && problem.description.includes('>');

    const handleNotesChange = (value: string) => {
      setNotes(value);
      // Debounce save to localStorage
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        const userPrefix = user ? `${user.id}_` : '';
        localStorage.setItem(`notes_${userPrefix}${problem.slug}`, value);
      }, 400);
    };

    return (
      <div className="space-y-4 p-5 select-text overflow-y-auto h-full">
        {/* Title only — difficulty badge is already in the header breadcrumb */}
        <div className="pb-4 border-b border-[#3e3e3e] select-none">
          <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight break-words">
            {problem.title}
          </h1>
        </div>

        {/* Description Body */}
        <div className="space-y-4">
          <div
            className={`text-gray-300 text-sm leading-relaxed font-sans problem-description-content break-words overflow-x-auto ${
              isHtmlDescription ? 'whitespace-normal' : 'whitespace-pre-wrap'
            }`}
            dangerouslySetInnerHTML={{ __html: problem.description }}
          />

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
        <div className="bg-dark-bg/40 border border-dark-border/60 rounded-xl p-4 shadow-sm space-y-3 select-none">
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
          <div className="bg-dark-bg/40 border border-dark-border/60 rounded-xl p-4 shadow-sm space-y-3 select-none">
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

      {/* Hints Section */}
      <div className="bg-[#ffffff08] border border-[#ffffff14] rounded-lg p-4 space-y-3">
        <h2 className="text-[13px] font-medium text-[#eff1f6bf] flex items-center gap-1.5 select-none">
          <Lightbulb className="w-3.5 h-3.5 text-[#ffc01e]" /> Hints
        </h2>
        <div className="flex items-center justify-center py-6 text-[13px] text-[#eff1f680] select-none">
          <div className="flex flex-col items-center gap-2">
            <Lock className="w-5 h-5 text-[#eff1f640]" />
            <span>Coming Soon</span>
            <span className="text-[11px] text-[#eff1f650]">Hints will be available in a future update</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-dark-bg/40 border border-dark-border/60 rounded-xl p-4 shadow-sm space-y-3">
        <button
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          className="w-full text-xs font-extrabold uppercase text-gray-400 border-b border-dark-border pb-1.5 flex items-center justify-between select-none cursor-pointer hover:text-gray-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-blue-400" /> My Notes
          </span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isNotesExpanded && "rotate-180")} />
        </button>
        {isNotesExpanded && (
          <div className="space-y-2 animate-fade-in">
            <textarea
              id="notes-textarea"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write your personal notes, approach ideas, or key observations for this problem..."
              className="w-full min-h-[120px] max-h-[300px] p-3 bg-dark-bg/60 border border-dark-border/60 rounded-lg text-xs text-gray-300 font-sans leading-relaxed resize-y placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            <p className="text-[10px] text-gray-600 select-none">
              Notes are saved automatically to your browser.
            </p>
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
      <div className={isTestPanelCollapsed ? 'flex-1' : 'flex-1 min-h-[200px]'}>
        <CodeEditor
          problemSlug={problem.slug}
          templates={problem.templates}
          code={code}
          onChangeCode={handleCodeChange}
          language={language}
          onChangeLanguage={handleLanguageChange}
          onReset={handleReset}
          onLoadLastSubmission={user ? handleLoadLastSubmission : undefined}
          isLoadingLastSubmission={isLoadingLastSub}
          timerSeconds={timerSeconds}
          timerIsActive={timerIsActive}
          onTimerToggle={() => setTimerIsActive(!timerIsActive)}
          onTimerReset={() => { setTimerIsActive(false); setTimerSeconds(0); }}
          formatTimerTime={formatTimerTime}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onRun={() => handleRun(code, language)}
          onSubmit={() => handleSubmit(code, language)}
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

      {/* Toggle bar / Resize handle for Test Case Panel */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-full px-4 py-1.5 border-t border-dark-border bg-dark-bg/60 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-all select-none group ${
          isTestPanelCollapsed ? 'cursor-pointer' : 'cursor-ns-resize'
        }`}
        title={isTestPanelCollapsed ? 'Show Test Cases' : 'Drag up/down to resize or click to hide'}
      >
        <GripHorizontal className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
        {isTestPanelCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
        )}
        <span className="font-semibold group-hover:text-blue-400 transition-colors">
          {isTestPanelCollapsed ? 'Show Test Cases & Results' : 'Test Cases & Results'}
        </span>
      </div>

      {/* Test Case & Result Panel */}
      {!isTestPanelCollapsed && (
        <div className="overflow-hidden" style={{ height: `${testPanelHeight}px` }}>
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
    <div className={cn("w-full h-[calc(100vh-50px)] flex flex-col p-1.5 overflow-hidden", isResizing && "select-none")}>
      {/* Back button & Control Header */}
      <div className="flex items-center justify-between select-none px-3 py-1.5 bg-[#151515] border border-[#3e3e3e] rounded-lg gap-2 flex-wrap sm:flex-nowrap">
        {/* Left Section: Navigation Breadcrumb with difficulty badge */}
        <div className="flex-1 min-w-0 flex justify-start">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 min-w-0">
            <Link to="/problems" className="inline-flex items-center text-gray-400 hover:text-gray-200 transition-colors shrink-0 font-bold">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Problems
            </Link>
            {problem && (
              <span className={cn(
                "ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider scale-90 select-none shrink-0",
                problem.difficulty.toLowerCase() === 'easy' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                problem.difficulty.toLowerCase() === 'medium' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                problem.difficulty.toLowerCase() === 'hard' && "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {problem.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Center Section: Execution Pill & Note & Timer */}
        {(isLargeScreen || mobileTab === 'editor') && (
          <div className="flex items-center gap-2 shrink-0 justify-center">
            {isRunning ? (
              <button
                disabled
                className="w-[155px] py-1.5 rounded-lg bg-[#282828] border border-[#3e3e3e] text-gray-400 flex items-center justify-center gap-2 text-xs font-semibold select-none cursor-not-allowed"
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse [animation-delay:0.2s]" />
                </div>
                <span>{activeSubmission?.status === 'RUNNING' ? 'Judging...' : 'Pending...'}</span>
              </button>
            ) : isSubmitting ? (
              <button
                disabled
                className="w-[155px] py-1.5 rounded-lg bg-[#282828] border border-emerald-500/30 text-emerald-500 flex items-center justify-center gap-2 text-xs font-bold select-none cursor-not-allowed"
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse [animation-delay:0.2s]" />
                </div>
                <span>{activeSubmission?.status === 'RUNNING' ? 'Judging...' : 'Pending...'}</span>
              </button>
            ) : (
              <>
                {/* Run Code Button */}
                <button
                  onClick={() => handleRun(code, language)}
                  disabled={isRunning || isSubmitting}
                  className={cn(
                    "px-3 py-1.5 rounded-lg bg-[#282828] border border-[#3e3e3e] transition-all cursor-pointer flex items-center justify-center min-w-[38px] gap-1.5 text-xs font-medium",
                    "text-gray-400 hover:text-gray-200 hover:bg-dark-hover active:scale-95"
                  )}
                  title="Run Code"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run</span>
                </button>

                {/* Submit Solution Button */}
                <button
                  onClick={() => handleSubmit(code, language)}
                  disabled={isRunning || isSubmitting}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer bg-[#282828] border border-[#3e3e3e]",
                    "text-emerald-500 hover:text-emerald-400 hover:bg-dark-hover/60 active:scale-95"
                  )}
                  title="Submit Solution"
                >
                  <CloudUpload className="w-4 h-4 text-emerald-500" />
                  <span>Submit</span>
                </button>
              </>
            )}

            {/* Note Button */}
            <button
              onClick={handleToggleNotes}
              className={cn(
                "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center relative",
                notes.trim().length > 0
                  ? "bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20"
                  : "bg-[#282828] border-[#3e3e3e] text-gray-400 hover:text-gray-200 hover:bg-dark-hover"
              )}
              title="Write Notes"
            >
              <StickyNote className="w-4 h-4" />
              {notes.trim().length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Timer Button & Popover */}
            <div
              className="relative inline-block"
              onMouseEnter={() => {
                if (timerTimeoutRef.current) {
                  clearTimeout(timerTimeoutRef.current);
                  timerTimeoutRef.current = null;
                }
                setTimerPopoverOpen(true);
              }}
              onMouseLeave={() => {
                timerTimeoutRef.current = setTimeout(() => {
                  setTimerPopoverOpen(false);
                }, 300);
              }}
            >
              <button
                onClick={() => setTimerIsActive(!timerIsActive)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 bg-[#282828] border-[#3e3e3e] text-xs font-mono select-none",
                  timerIsActive ? "text-emerald-400" : "text-gray-500 hover:text-gray-200"
                )}
                title={timerIsActive ? 'Pause timer' : 'Start timer'}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimerTime(timerSeconds)}</span>
              </button>

              {timerPopoverOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 bg-[#1b1b1b]/95 border border-[#3e3e3e] rounded-xl shadow-2xl p-4 text-white z-50 flex flex-col gap-3.5 backdrop-blur-md animate-scale-in"
                  onMouseEnter={() => {
                    if (timerTimeoutRef.current) {
                      clearTimeout(timerTimeoutRef.current);
                      timerTimeoutRef.current = null;
                    }
                    setTimerPopoverOpen(true);
                  }}
                  onMouseLeave={() => {
                    timerTimeoutRef.current = setTimeout(() => {
                      setTimerPopoverOpen(false);
                    }, 300);
                  }}
                >
                  {/* Tabs: Stopwatch / Timer */}
                  <div className="flex bg-[#282828]/50 border border-white/[0.04] p-0.5 rounded-lg">
                    <button
                      onClick={() => {
                        setTimerIsActive(false);
                        setTimerMode('stopwatch');
                        setTimerSeconds(0);
                      }}
                      className={cn(
                        "flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        timerMode === 'stopwatch'
                          ? "bg-white/[0.08] text-white border border-white/[0.08]"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      <Clock className="w-3 h-3 text-blue-400" />
                      Stopwatch
                    </button>
                    <button
                      onClick={() => {
                        setTimerIsActive(false);
                        setTimerMode('timer');
                        setTimerSeconds(tempHours * 3600 + tempMinutes * 60);
                      }}
                      className={cn(
                        "flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        timerMode === 'timer'
                          ? "bg-white/[0.08] text-white border border-white/[0.08]"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      <Clock className="w-3 h-3 text-orange-400" />
                      Timer
                    </button>
                  </div>

                  {/* Body Content */}
                  {timerMode === 'stopwatch' ? (
                    <div className="flex flex-col items-center py-4 space-y-3.5">
                      {/* Large Stopwatch display */}
                      <span className="text-3xl font-black font-mono tracking-tight text-white select-text">
                        {formatTimerTime(timerSeconds)}
                      </span>

                      {/* Control buttons */}
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => setTimerIsActive(!timerIsActive)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer border transition-all text-center",
                            timerIsActive
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          )}
                        >
                          {timerIsActive ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => {
                            setTimerIsActive(false);
                            setTimerSeconds(0);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-300 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 space-y-3">
                      {/* Setup or countdown */}
                      {!timerIsActive && timerSeconds === tempHours * 3600 + tempMinutes * 60 ? (
                        <div className="flex items-center justify-center gap-3 w-full py-2">
                          {/* Hours Input */}
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={tempHours}
                              onChange={(e) => {
                                const val = Math.min(Math.max(Number(e.target.value), 0), 23);
                                setTempHours(val);
                                setTimerSeconds(val * 3600 + tempMinutes * 60);
                              }}
                              className="w-12 h-10 bg-[#0a0d14] border border-white/[0.06] rounded-lg text-center font-mono font-bold text-lg focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-1">hr</span>
                          </div>

                          <span className="text-gray-500 font-bold mb-4">:</span>

                          {/* Minutes Input */}
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={tempMinutes}
                              onChange={(e) => {
                                const val = Math.min(Math.max(Number(e.target.value), 0), 59);
                                setTempMinutes(val);
                                setTimerSeconds(tempHours * 3600 + val * 60);
                              }}
                              className="w-12 h-10 bg-[#0a0d14] border border-white/[0.06] rounded-lg text-center font-mono font-bold text-lg focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-1">min</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-2 space-y-1">
                          <span className="text-3xl font-black font-mono tracking-tight text-white select-text">
                            {formatTimerTime(timerSeconds)}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            Ticking Down
                          </span>
                        </div>
                      )}

                      {/* Control buttons */}
                      <div className="flex items-center gap-2 w-full pt-1">
                        <button
                          onClick={() => {
                            if (timerSeconds === 0) {
                              setTimerSeconds(tempHours * 3600 + tempMinutes * 60);
                            }
                            setTimerIsActive(!timerIsActive);
                          }}
                          disabled={tempHours === 0 && tempMinutes === 0}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer border transition-all text-center",
                            timerIsActive
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {timerIsActive ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => {
                            setTimerIsActive(false);
                            setTimerSeconds(tempHours * 3600 + tempMinutes * 60);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-300 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Section: Mobile Tabs / Spacer */}
        <div className="flex-1 flex justify-end">
          {!isLargeScreen && (
            <div className="flex bg-[#1a1a1a] p-0.5 rounded-lg border border-[#3e3e3e]">
              <button
                onClick={() => setMobileTab('description')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                  mobileTab === 'description' ? 'bg-[#ffffff14] text-white border border-[#ffffff14]' : 'text-[#eff1f6bf]'
                }`}
              >
                <Layout className="w-3 h-3" /> Info
              </button>
              <button
                onClick={() => {
                  setMobileTab('submissions');
                  if (user) refetchSubmissions();
                }}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                  mobileTab === 'submissions' ? 'bg-[#ffffff14] text-white border border-[#ffffff14]' : 'text-[#eff1f6bf]'
                }`}
              >
                <Terminal className="w-3 h-3" /> Submissions
              </button>
              <button
                onClick={() => setMobileTab('editor')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                  mobileTab === 'editor' ? 'bg-[#ffffff14] text-white border border-[#ffffff14]' : 'text-[#eff1f6bf]'
                }`}
              >
                <Terminal className="w-3 h-3" /> Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 mt-1.5">
        {isLargeScreen ? (
          <SplitPane
          left={
            <div className="flex flex-col h-full overflow-hidden bg-[#1a1a1a]">
              {/* Tab navigation pills at the top of description pane */}
              <div className="flex items-center bg-[#282828] border-b border-[#3e3e3e] select-none h-[38px] px-1">
                <button
                  onClick={() => setActiveTab('description')}
                  className={cn(
                    "px-4 py-2 text-[13px] font-medium transition-all relative cursor-pointer flex items-center gap-1.5",
                    activeTab === 'description'
                      ? "text-white"
                      : "text-[#eff1f6bf] hover:text-white"
                  )}
                >
                  <Layout className="w-3.5 h-3.5" />
                  Description
                  {activeTab === 'description' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />}
                </button>
                <button
                  onClick={() => { setComingSoonFeature('Editorial'); setShowComingSoon(true); }}
                  className="px-4 py-2 text-[13px] font-medium text-[#eff1f6bf] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Editorial
                </button>
                <button
                  onClick={() => { setComingSoonFeature('Solutions'); setShowComingSoon(true); }}
                  className="px-4 py-2 text-[13px] font-medium text-[#eff1f6bf] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Solutions
                </button>
                <button
                  onClick={() => {
                    setActiveTab('submissions');
                    if (user) refetchSubmissions();
                  }}
                  className={cn(
                    "px-4 py-2 text-[13px] font-medium transition-all relative cursor-pointer flex items-center gap-1.5",
                    activeTab === 'submissions'
                      ? "text-white"
                      : "text-[#eff1f6bf] hover:text-white"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Submissions
                  {activeTab === 'submissions' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />}
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'description' ? renderDescription() : renderSubmissionsTab()}
              </div>
            </div>
          }
          right={renderEditorWorkspace()}
          initialLeftWidthPercent={42}
        />
      ) : (
        <div className="border border-dark-border rounded-lg bg-dark-panel overflow-hidden h-full">
          {mobileTab === 'description' ? (
            renderDescription()
          ) : mobileTab === 'submissions' ? (
            renderSubmissionsTab()
          ) : (
            renderEditorWorkspace()
          )}
        </div>
      )}
      </div>
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowComingSoon(false)}>
          <div className="bg-[#282828] border border-[#3e3e3e] rounded-lg p-8 max-w-sm mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#ffffff08] flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#eff1f660]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{comingSoonFeature}</h3>
            <p className="text-[13px] text-[#eff1f6bf] mb-6">This feature is coming soon. Stay tuned for updates!</p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="px-6 py-2 bg-[#ffffff14] hover:bg-[#ffffff1f] text-white text-[13px] font-medium rounded-lg transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
