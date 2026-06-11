import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Award,
  Code,
  ArrowLeft,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../shared/lib/api';
import { Badge } from '../../shared/ui/badge/Badge';
import { Button } from '../../shared/ui/button/Button';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export const SubmissionResultPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success: showToastSuccess } = useToast();

  const [copied, setCopied] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);

  // Poll submission details in case we were redirected while it's still running
  const { data: submission, isLoading: isLoadingSub, isError: isErrorSub } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
      if (!id) throw new Error('No submission ID provided');
      return await api.submissions.get(id);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'PENDING' || data.status === 'RUNNING')) {
        return 1000;
      }
      if (data && data.status === 'ACCEPTED' && !data.run_samples_only && data.score === 0) {
        return 1000;
      }
      return false;
    },
  });

  const isPending = submission?.status === 'PENDING' || submission?.status === 'RUNNING';
  const isScoreSyncing = submission?.status === 'ACCEPTED' && !submission.run_samples_only && submission.score === 0;

  // Query user stats to show their total score
  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api.users.getStats(),
    enabled: !!user,
  });

  // Fetch problem details to show the problem title, score_base, etc.
  const { data: problem } = useQuery({
    queryKey: ['problems', 'detail', slug],
    queryFn: () => api.problems.get(slug || ''),
    enabled: !!slug,
  });

  const { data: results = [], isLoading: isLoadingResults, isError: isErrorResults } = useQuery({
    queryKey: ['submissions', id, 'results'],
    queryFn: async () => {
      if (!id) throw new Error('No submission ID provided');
      return await api.submissions.getResults(id);
    },
    enabled: !!id && !!submission && !isPending,
    retry: 1,
  });

  // Refresh user stats when submission resolves to ACCEPTED
  useEffect(() => {
    if (submission && submission.status === 'ACCEPTED' && !isScoreSyncing) {
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
    }
  }, [submission, isScoreSyncing, refetchStats, queryClient, slug]);

  const copyToClipboard = () => {
    if (submission?.source_code) {
      navigator.clipboard.writeText(submission.source_code);
      setCopied(true);
      showToastSuccess('Code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyErrorToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setErrorCopied(true);
    showToastSuccess('Error copied to clipboard.');
    setTimeout(() => setErrorCopied(false), 2000);
  };

  /** Extract a short error name and description from the raw error message. */
  const parseErrorSummary = (raw: string): { name: string; detail: string } => {
    const lines = raw.trim().split('\n').filter(Boolean);
    // Try to find the last meaningful error line (often the actual exception)
    const lastLine = lines[lines.length - 1]?.trim() || raw.trim();
    // Common patterns: "ErrorType: message" or "subprocess.TimeoutExpired: ..."
    const colonIdx = lastLine.indexOf(':');
    if (colonIdx > 0 && colonIdx < 60) {
      return {
        name: lastLine.substring(0, colonIdx).trim(),
        detail: lastLine.substring(colonIdx + 1).trim().substring(0, 200),
      };
    }
    return { name: 'Error', detail: lastLine.substring(0, 200) };
  };

  if (isLoadingSub) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 select-none">
        <div className="relative inline-flex">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <Cpu className="absolute inset-0 m-auto w-6 h-6 text-blue-400 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-gray-200">Loading Submission Details...</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Analyzing evaluation metrics and test results.
        </p>
      </div>
    );
  }

  if (isErrorSub || !submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 select-none">
        <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-200">Submission Not Found</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          We could not load details for this submission. Please verify the URL or try again.
        </p>
        <Link to="/problems">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const resultRows = results || [];
  const passedResults = resultRows.filter(r => r.passed).length;
  const failedResults = resultRows.filter(r => !r.passed).length;
  const showResultBreakdown = !isPending && (isLoadingResults || isErrorResults || resultRows.length > 0);

  // Determine themes based on submission status
  let statusColor: string;
  let statusBg: string;
  let statusGlow: string;
  let statusIcon: React.ReactNode;
  let statusTitle = submission.status.replace('_', ' ');

  if (isPending) {
    statusColor = 'text-blue-400 animate-pulse';
    statusBg = 'bg-blue-500/5 border-blue-500/10';
    statusGlow = 'from-blue-500/5 to-transparent';
    statusIcon = <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />;
    statusTitle = 'Evaluating Solution...';
  } else if (submission.status === 'ACCEPTED') {
    statusColor = 'text-emerald-400';
    statusBg = 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5';
    statusGlow = 'from-emerald-500/15 to-transparent';
    statusIcon = <CheckCircle className="w-8 h-8 text-emerald-400" />;
    statusTitle = isScoreSyncing ? 'Accepted - Scoring...' : 'Accepted';
  } else if (submission.status === 'SAMPLE_PASSED') {
    statusColor = 'text-cyan-400';
    statusBg = 'bg-cyan-500/10 border-cyan-500/20';
    statusGlow = 'from-cyan-500/10 to-transparent';
    statusIcon = <CheckCircle className="w-8 h-8 text-cyan-400" />;
    statusTitle = 'Sample Cases Passed';
  } else {
    // Failing states
    statusColor = 'text-rose-400';
    statusBg = 'bg-rose-500/10 border-rose-500/20';
    statusGlow = 'from-rose-500/15 to-transparent';
    statusIcon = <XCircle className="w-8 h-8 text-rose-400" />;
  }

  // Points breakdown calculation
  const scoreBase = problem?.score_base || submission.score || 0;
  const isAccepted = submission.status === 'ACCEPTED';
  const displayScore = isAccepted ? submission.score : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Back button */}
      <div className="flex items-center justify-between select-none">
        <Link to={`/problems/${slug}`} className="inline-flex items-center text-xs text-gray-400 hover:text-gray-200 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Problem
        </Link>
        <span className="text-xs text-gray-500 font-mono">
          Submission ID: {id?.substring(0, 8)}...
        </span>
      </div>

      {/* Main Results Card */}
      <div className={`relative overflow-hidden rounded-2xl border ${statusBg} p-6 md:p-8 transition-all duration-300`}>
        {/* Color Gradient Glow */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${statusGlow} pointer-events-none`} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-2xl shadow-inner">
              {statusIcon}
            </div>
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">SUBMISSION STATUS</span>
              <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${statusColor} capitalize mt-0.5`}>
                {statusTitle}
              </h1>
            </div>
          </div>

          {!isPending && (
            <div className="flex items-center gap-3">
              <Link to={`/problems/${slug}`}>
                <Button size="lg" variant={isAccepted ? "secondary" : "primary"} className="font-bold">
                  {isAccepted ? "Modify Solution" : "Try Again"}
                </Button>
              </Link>
              <Link to="/problems">
                <Button size="lg" variant="outline" className="font-bold">
                  Explore Catalog
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Error message — short name + description, copiable */}
        {submission.error_message && (() => {
          const { name, detail } = parseErrorSummary(submission.error_message);
          const errorText = `${name}: ${detail}`;
          return (
            <div className="mt-6 bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-black text-rose-500 text-sm block">{name}</span>
                  <p className="text-rose-400/80 mt-1 leading-relaxed break-words select-text">{detail}</p>
                </div>
                <button
                  onClick={() => copyErrorToClipboard(errorText)}
                  className="shrink-0 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors font-semibold cursor-pointer mt-0.5"
                  title="Copy error"
                >
                  {errorCopied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Core Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Points Awarded */}
        <div className="bg-dark-panel border border-dark-border hover:border-dark-border-hover rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between transition-colors select-none">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Score Awarded</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              +{displayScore} <span className="text-xs font-bold text-gray-500">pts</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-medium">
              {isScoreSyncing ? 'Final score syncing...' : `Base score: ${scoreBase} pts`}
            </div>
          </div>
        </div>

        {/* Total Points Till Now */}
        <div className="bg-dark-panel border border-dark-border hover:border-dark-border-hover rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between transition-colors select-none">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Points</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-200 font-mono">
              {userStats?.total_score ?? submission.score ?? 0} <span className="text-xs font-bold text-gray-500">pts</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-medium">
              {isScoreSyncing ? 'Ranking update pending' : 'Platform ranking updated'}
            </div>
          </div>
        </div>

        {/* Test Cases Passed */}
        <div className="bg-dark-panel border border-dark-border hover:border-dark-border-hover rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between transition-colors select-none">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Test Cases</span>
            <span className="text-[10px] font-mono font-bold">{submission.passed_count}/{submission.total_count}</span>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-200 font-mono">
              {submission.total_count > 0
                ? `${Math.round((submission.passed_count / submission.total_count) * 100)}%`
                : '0%'}
            </div>
            {/* Tiny progress bar */}
            <div className="w-full bg-dark-bg/60 h-1.5 rounded-full overflow-hidden mt-2 border border-dark-border/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isAccepted ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${submission.total_count > 0 ? (submission.passed_count / submission.total_count) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Execution Speed */}
        <div className="bg-dark-panel border border-dark-border hover:border-dark-border-hover rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between transition-colors select-none">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Speed (Runtime)</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              {submission.runtime_ms !== null ? `${submission.runtime_ms} ms` : 'N/A'}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-medium">
              Limit: {problem?.time_limit_ms ?? 2000} ms
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Breakdown and Performance Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {showResultBreakdown ? (
          <>
            {/* Left column - Evaluation Breakdown */}
            <div className="lg:col-span-8 bg-dark-panel border border-dark-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-dark-border bg-dark-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-gray-200">Evaluation Breakdown</h2>
                </div>
              </div>

              <div className="p-5">
                {isLoadingResults ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400 select-none">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading test results...
                  </div>
                ) : isErrorResults ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Test result details are unavailable for this submission.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Passed */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-black font-mono text-emerald-400">{passedResults}</div>
                        <div className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider">Passed</div>
                      </div>
                    </div>
                    {/* Failed */}
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-center gap-3">
                      <div className="p-2 bg-rose-500/10 rounded-xl">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-black font-mono text-rose-400">{failedResults}</div>
                        <div className="text-[10px] font-bold text-rose-400/60 uppercase tracking-wider">Failed</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Performance Specs */}
            <div className="lg:col-span-4 bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm space-y-4 select-none">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2">
                Performance Specs
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Memory Limit
                  </span>
                  <span className="text-gray-300 font-mono font-medium">
                    {problem?.memory_limit_kb ? `${(problem.memory_limit_kb / 1024).toFixed(0)} MB` : '256 MB'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Time Limit
                  </span>
                  <span className="text-gray-300 font-mono font-medium">
                    {problem?.time_limit_ms ? `${problem.time_limit_ms} ms` : '2000 ms'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> Language
                  </span>
                  <span className="text-blue-400 font-semibold font-mono uppercase">
                    {submission.language}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* When there is no evaluation breakdown (e.g. pending), render Performance Specs as a smaller card */
          <div className="lg:col-span-4 bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm space-y-4 select-none">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2">
              Performance Specs
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Memory Limit
                </span>
                <span className="text-gray-300 font-mono font-medium">
                  {problem?.memory_limit_kb ? `${(problem.memory_limit_kb / 1024).toFixed(0)} MB` : '256 MB'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time Limit
                </span>
                <span className="text-gray-300 font-mono font-medium">
                  {problem?.time_limit_ms ? `${problem.time_limit_ms} ms` : '2000 ms'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" /> Language
                </span>
                <span className="text-blue-400 font-semibold font-mono uppercase">
                  {submission.language}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submitted Code Viewer - alone below all */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden shadow-sm flex flex-col h-full min-h-[450px]">
        {/* Code Viewer Header */}
        <div className="bg-dark-bg px-4 py-3 flex items-center justify-between border-b border-dark-border select-none">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-200">Submitted Code</span>
            <Badge variant="default" className="text-[9px] px-1.5 py-0 font-mono uppercase bg-dark-panel">
              {submission.language}
            </Badge>
          </div>

          {submission?.source_code && (
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors font-semibold cursor-pointer"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Code Content */}
        <div className="flex-1 bg-dark-panel/30 overflow-auto p-4 select-text">
          {submission?.source_code ? (
            <pre className="font-mono text-xs leading-relaxed text-gray-300 whitespace-pre overflow-x-auto select-text">
              <code>{submission.source_code}</code>
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs py-16">
              <span>No code content available.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
