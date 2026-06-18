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
  AlertTriangle,
  Zap,
  Timer,
  Sparkles,
  Brain,
  Lock
} from 'lucide-react';
import { api } from '../../shared/lib/api';

import { Button } from '../../shared/ui/button/Button';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';

/* ─────────────────────────────────────────────────
   Inline micro-components for the redesign
───────────────────────────────────────────────── */

/** A thin horizontal rule that matches the card border tone */
const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border-t border-white/[0.06] ${className}`} />
);

/** Stat card used in the four-card row */
interface StatCardProps {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'amber' | 'emerald' | 'blue' | 'neutral';
  children?: React.ReactNode;
  emphasis?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({
  label, icon, value, sub, accent = 'neutral', children, emphasis = false,
}) => {
  const accentRing: Record<string, string> = {
    amber:   'hover:border-amber-500/25',
    emerald: 'hover:border-emerald-500/20',
    blue:    'hover:border-blue-500/20',
    neutral: 'hover:border-white/[0.10]',
  };
  const accentBg: Record<string, string> = {
    amber:   emphasis ? 'bg-amber-500/[0.06]' : '',
    emerald: emphasis ? 'bg-emerald-500/[0.04]' : '',
    blue:    emphasis ? 'bg-blue-500/[0.04]' : '',
    neutral: '',
  };
  return (
    <div
      className={`
        relative flex flex-col justify-between gap-3
        rounded-2xl border border-zinc-800/80 p-5 shadow-sm
        bg-[#131316] ${accentBg[accent]}
        transition-all duration-200
        hover:shadow-md hover:translate-y-[-1px]
        ${accentRing[accent]}
        select-none
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <span className="text-zinc-650">{icon}</span>
      </div>
      {/* Main value */}
      <div className="flex flex-col gap-1">
        <div className="font-mono leading-none">{value}</div>
        {sub && <div className="text-[11px] text-zinc-400 font-medium mt-0.5">{sub}</div>}
        {children}
      </div>
    </div>
  );
};

/** Spec row used in Performance Specs card */
const SpecRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon, label, value,
}) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="flex items-center gap-2 text-xs text-gray-500">
      <span className="text-gray-600">{icon}</span>
      {label}
    </span>
    <span className="text-xs font-mono font-semibold text-gray-300">{value}</span>
  </div>
);


/* ─────────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────────── */
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
    const lastLine = lines[lines.length - 1]?.trim() || raw.trim();
    const colonIdx = lastLine.indexOf(':');
    if (colonIdx > 0 && colonIdx < 60) {
      return {
        name: lastLine.substring(0, colonIdx).trim(),
        detail: lastLine.substring(colonIdx + 1).trim().substring(0, 200),
      };
    }
    return { name: 'Error', detail: lastLine.substring(0, 200) };
  };

  /* ── Loading state ── */
  if (isLoadingSub) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 select-none">
        <div className="relative inline-flex">
          <div className="w-14 h-14 border-[3px] border-blue-500/15 border-t-blue-500/70 rounded-full animate-spin" />
          <Cpu className="absolute inset-0 m-auto w-5 h-5 text-blue-400/70" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-gray-300">Loading Submission Details</p>
          <p className="text-xs text-gray-600">Analyzing evaluation metrics and test results…</p>
        </div>
      </div>
    );
  }

  /* ── Error / not found state ── */
  if (isErrorSub || !submission) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 select-none">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <XCircle className="w-8 h-8 text-rose-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-gray-200">Submission Not Found</p>
          <p className="text-xs text-gray-500 max-w-xs">
            We could not load details for this submission. Please verify the URL or try again.
          </p>
        </div>
        <Link to="/problems">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  /* ── Derived values ── */
  const resultRows = results || [];
  const passedResults = resultRows.filter(r => r.passed).length;
  const failedResults = resultRows.filter(r => !r.passed).length;
  const showResultBreakdown = !isPending && (isLoadingResults || isErrorResults || resultRows.length > 0);

  const isAccepted = submission.status === 'ACCEPTED';
  const isSamplePassed = submission.status === 'SAMPLE_PASSED';
  const isTLE = submission.status === 'TIME_LIMIT_EXCEEDED' || submission.status === 'TLE';
  const isFailing = !isPending && !isAccepted && !isSamplePassed;
  const allTestsPassed = submission.total_count > 0 && submission.passed_count === submission.total_count;

  // Status theme tokens
  type StatusTheme = {
    color: string;
    bgCard: string;
    glowFrom: string;
    glowColor: string;
    icon: React.ReactNode;
    title: string;
    pill: string;
  };

  const theme: StatusTheme = (() => {
    if (isPending) return {
      color: 'text-blue-400',
      bgCard: 'border-blue-500/15 bg-[#161c26]',
      glowFrom: 'from-blue-500/[0.07]',
      glowColor: 'shadow-blue-500/5',
      icon: <div className="w-7 h-7 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />,
      title: 'Evaluating Solution…',
      pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    if (isAccepted) return {
      color: 'text-emerald-400',
      bgCard: 'border-emerald-500/20 bg-[#141f1a]',
      glowFrom: 'from-emerald-500/[0.09]',
      glowColor: 'shadow-emerald-500/5',
      icon: <CheckCircle className="w-7 h-7 text-emerald-400" />,
      title: isScoreSyncing ? 'Accepted — Scoring…' : 'Accepted',
      pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    if (isSamplePassed) return {
      color: 'text-cyan-400',
      bgCard: 'border-cyan-500/20 bg-[#131e20]',
      glowFrom: 'from-cyan-500/[0.07]',
      glowColor: 'shadow-cyan-500/5',
      icon: <CheckCircle className="w-7 h-7 text-cyan-400" />,
      title: 'Sample Cases Passed',
      pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    };
    if (isTLE) return {
      color: 'text-amber-400',
      bgCard: 'border-amber-500/20 bg-[#1f1b14]',
      glowFrom: 'from-amber-500/[0.08]',
      glowColor: 'shadow-amber-500/5',
      icon: <Timer className="w-7 h-7 text-amber-400" />,
      title: 'Time Limit Exceeded',
      pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return {
      color: 'text-rose-400',
      bgCard: 'border-rose-500/20 bg-[#1f1418]',
      glowFrom: 'from-rose-500/[0.09]',
      glowColor: 'shadow-rose-500/5',
      icon: <XCircle className="w-7 h-7 text-rose-400" />,
      title: submission.status.replace(/_/g, ' '),
      pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
  })();

  const scoreBase = problem?.score_base || submission.score || 0;
  const displayScore = isAccepted ? submission.score : 0;
  const testPassPct = submission.total_count > 0
    ? Math.round((submission.passed_count / submission.total_count) * 100)
    : 0;

  /* ─────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────── */
  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-5"
      style={{ fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}
    >

      {/* ── 1. Top header row ── */}
      <div className="flex items-center justify-between select-none">
        <Link
          to={`/problems/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Problem
        </Link>
        <span className="font-mono text-[11px] text-gray-600 tracking-wide">
          #{id?.substring(0, 8).toUpperCase()}
        </span>
      </div>

      {/* ── 2. Hero / Acceptance Banner ── */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border shadow-lg
          ${theme.bgCard} ${theme.glowColor}
          transition-all duration-300
        `}
      >
        {/* Subtle top gradient tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${theme.glowFrom} to-transparent pointer-events-none`}
        />

        <div className="relative px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

            {/* Left: icon + status text */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.07] shadow-inner shrink-0">
                {theme.icon}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                  Submission Status
                </p>
                <h1 className={`text-2xl sm:text-[1.65rem] font-extrabold tracking-tight leading-none ${theme.color}`}>
                  {theme.title}
                </h1>
                {problem?.title && (
                  <p className="text-xs text-gray-600 font-medium mt-1 truncate max-w-xs">
                    {problem.title}
                  </p>
                )}
              </div>
            </div>

            {/* Right: action buttons */}
            {!isPending && (
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <Link to={`/problems/${slug}`}>
                  <Button
                    size="md"
                    variant={isAccepted ? 'secondary' : 'primary'}
                    className="font-semibold text-sm px-4 py-2 rounded-xl"
                  >
                    {isAccepted ? 'Modify Solution' : 'Try Again'}
                  </Button>
                </Link>
                <Link to="/problems">
                  <Button
                    size="md"
                    variant="outline"
                    className="font-semibold text-sm px-4 py-2 rounded-xl"
                  >
                    Explore Catalog
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Error message panel — only when error exists */}
          {submission.error_message && (() => {
            const { name, detail } = parseErrorSummary(submission.error_message);
            const errorText = `${name}: ${detail}`;
            return (
              <div className="mt-5 rounded-xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-black text-rose-400 block">{name}</span>
                    <p className="text-[11px] text-rose-400/70 leading-relaxed break-words select-text">
                      {detail}
                    </p>
                  </div>
                  <button
                    onClick={() => copyErrorToClipboard(errorText)}
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-semibold cursor-pointer mt-0.5"
                    title="Copy error"
                  >
                    {errorCopied ? (
                      <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                    ) : (
                      <><Copy className="w-3 h-3" /><span>Copy</span></>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 3. Stats cards row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* Score Awarded — most prominent */}
        <StatCard
          label="Score Awarded"
          icon={<Award className="w-4 h-4" />}
          accent="amber"
          emphasis
          value={
            <span className="text-3xl font-black text-amber-400">
              +{displayScore}
              <span className="text-sm font-bold text-gray-500 ml-1">pts</span>
            </span>
          }
          sub={isScoreSyncing ? 'Final score syncing…' : `Base: ${scoreBase} pts`}
        />

        {/* Total Points — secondary */}
        <StatCard
          label="Total Points"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="emerald"
          value={
            <span className="text-2xl font-black text-gray-200">
              {userStats?.total_score ?? submission.score ?? 0}
              <span className="text-sm font-bold text-gray-600 ml-1">pts</span>
            </span>
          }
          sub={isScoreSyncing ? 'Ranking update pending' : 'Platform ranking updated'}
        />

        {/* Test Cases — shows status without revealing test case counts */}
        <StatCard
          label="Test Cases"
          icon={
            allTestsPassed
              ? <CheckCircle className="w-4 h-4 text-emerald-500/70" />
              : isTLE
              ? <Timer className="w-4 h-4 text-amber-500/70" />
              : <XCircle className="w-4 h-4 text-rose-500/65" />
          }
          accent={allTestsPassed ? 'emerald' : isTLE ? 'amber' : 'neutral'}
          value={
            allTestsPassed ? (
              <span className="text-xl font-bold text-emerald-400 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                All Passed
              </span>
            ) : isTLE ? (
              <span className="text-xl font-bold text-amber-400 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                Failed (TLE)
              </span>
            ) : isSamplePassed ? (
              <span className="text-xl font-bold text-cyan-400 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                Sample Passed
              </span>
            ) : (
              <span className="text-xl font-bold text-rose-400 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                Failed
              </span>
            )
          }
          sub={
            allTestsPassed
              ? 'Every test case succeeded'
              : isTLE
              ? 'Exceeded time limit'
              : isSamplePassed
              ? 'Failed on evaluation cases'
              : 'One or more cases failed'
          }
        >
          {/* Sleek status bar */}
          <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-550 ${
                allTestsPassed 
                  ? 'bg-emerald-500/80 w-full' 
                  : isTLE 
                  ? 'bg-amber-500/70 w-full' 
                  : isSamplePassed 
                  ? 'bg-cyan-500/70 w-full' 
                  : 'bg-rose-500/70 w-full'
              }`}
            />
          </div>
        </StatCard>

        {/* Execution Speed — with TLE indicator */}
        <StatCard
          label="Speed (Runtime)"
          icon={isTLE ? <Timer className="w-4 h-4 text-amber-500/70" /> : <Clock className="w-4 h-4" />}
          accent={isTLE ? 'amber' : 'blue'}
          emphasis={isTLE}
          value={
            isTLE ? (
              <span className="text-xl font-black text-amber-400 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                TLE
              </span>
            ) : (
              <span className="text-2xl font-black text-blue-400">
                {submission.runtime_ms !== null ? submission.runtime_ms : 'N/A'}
                {submission.runtime_ms !== null && (
                  <span className="text-sm font-bold text-gray-600 ml-1">ms</span>
                )}
              </span>
            )
          }
          sub={
            isTLE
              ? `Exceeded ${problem?.time_limit_ms ?? 2000} ms limit`
              : `Limit: ${problem?.time_limit_ms ?? 2000} ms`
          }
        />
      </div>

      {/* ── 4 + 5. Evaluation Breakdown + Performance Specs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {showResultBreakdown ? (
          <>
            {/* ── 4. Evaluation Breakdown (wide left card) ── */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#131316] overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800/60 bg-black/15 select-none">
                <Cpu className="w-3.5 h-3.5 text-blue-400/70" />
                <h2 className="text-xs font-bold text-zinc-300 tracking-wide">Evaluation Breakdown</h2>
              </div>

              <div className="p-5">
                {isLoadingResults ? (
                  <div className="flex items-center justify-center gap-2.5 py-10 text-xs text-zinc-500 select-none">
                    <div className="w-3.5 h-3.5 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
                    Loading test results…
                  </div>
                ) : isErrorResults ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <p className="text-xs text-amber-300/80">
                      Test result details are unavailable for this submission.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* All passed — clean success state */}
                    {failedResults === 0 ? (
                      <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-emerald-400 leading-none tracking-tight">
                            All Test Cases Passed
                          </div>
                          <div className="text-xs text-zinc-400 font-medium mt-1.5 leading-relaxed">
                            Your solution successfully executed all evaluation test cases within the specified limits.
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Failed state — clean failure state */
                      <div className={`flex items-start gap-4 rounded-xl border p-5 ${
                        isTLE 
                          ? 'border-amber-500/25 bg-amber-500/[0.04]' 
                          : isSamplePassed 
                          ? 'border-cyan-500/20 bg-cyan-500/[0.04]' 
                          : 'border-rose-500/25 bg-rose-500/[0.04]'
                      }`}>
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          isTLE 
                            ? 'bg-amber-500/10' 
                            : isSamplePassed 
                            ? 'bg-cyan-500/10' 
                            : 'bg-rose-500/10'
                        }`}>
                          {isTLE ? (
                            <Timer className="w-5 h-5 text-amber-400" />
                          ) : isSamplePassed ? (
                            <CheckCircle className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className={`text-base font-bold leading-none tracking-tight ${
                            isTLE 
                              ? 'text-amber-400' 
                              : isSamplePassed 
                              ? 'text-cyan-400' 
                              : 'text-rose-400'
                          }`}>
                            {isTLE 
                              ? 'Time Limit Exceeded' 
                              : isSamplePassed 
                              ? 'Hidden Test Cases Failed' 
                              : 'Solution Failed'}
                          </div>
                          <div className="text-xs text-zinc-400 font-medium leading-relaxed pt-0.5">
                            {isTLE 
                              ? 'Your solution was terminated because it exceeded the allowed time limit on one or more test cases. Optimize your algorithm to resolve this.'
                              : isSamplePassed
                              ? 'Your solution successfully passed the public sample test cases but failed to execute correctly on the hidden evaluation test cases.'
                              : 'Your solution produced an incorrect answer, failed during runtime, or caused a system error on one or more test cases.'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. Performance Specs (compact right card) ── */}
            <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#131316] p-5 shadow-sm select-none self-start">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                Performance Specs
              </h3>
              <Divider className="mb-0.5" />
              <div className="divide-y divide-white/[0.04]">
                <SpecRow
                  icon={<Database className="w-3.5 h-3.5 text-zinc-500" />}
                  label="Memory Limit"
                  value={problem?.memory_limit_kb ? `${(problem.memory_limit_kb / 1024).toFixed(0)} MB` : '256 MB'}
                />
                <SpecRow
                  icon={<Clock className="w-3.5 h-3.5 text-zinc-500" />}
                  label="Time Limit"
                  value={problem?.time_limit_ms ? `${problem.time_limit_ms} ms` : '2000 ms'}
                />
                <SpecRow
                  icon={<Code className="w-3.5 h-3.5 text-zinc-500" />}
                  label="Language"
                  value={
                    <span className="text-blue-400 uppercase font-bold font-mono text-xs">
                      {submission.language}
                    </span>
                  }
                />
              </div>
            </div>
          </>
        ) : (
          /* When evaluation breakdown is hidden (e.g. pending), show Performance Specs standalone */
          <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#131316] p-5 shadow-sm select-none self-start">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
              Performance Specs
            </h3>
            <Divider className="mb-0.5" />
            <div className="divide-y divide-white/[0.04]">
              <SpecRow
                icon={<Database className="w-3.5 h-3.5 text-zinc-500" />}
                label="Memory Limit"
                value={problem?.memory_limit_kb ? `${(problem.memory_limit_kb / 1024).toFixed(0)} MB` : '256 MB'}
              />
              <SpecRow
                icon={<Clock className="w-3.5 h-3.5 text-zinc-500" />}
                label="Time Limit"
                value={problem?.time_limit_ms ? `${problem.time_limit_ms} ms` : '2000 ms'}
              />
              <SpecRow
                icon={<Code className="w-3.5 h-3.5 text-zinc-500" />}
                label="Language"
                value={
                  <span className="text-blue-400 uppercase font-bold font-mono text-xs">
                    {submission.language}
                  </span>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* ── AI Insights & Performance Analysis — Coming Soon ── */}
      <div className="rounded-2xl border border-zinc-800 bg-[#131316] overflow-hidden shadow-sm">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-black/15 select-none">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-purple-400/70" />
            <h2 className="text-xs font-bold text-zinc-300 tracking-wide font-semibold">AI Insights & Performance</h2>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-purple-500/20 bg-purple-500/[0.08] text-[9px] font-bold uppercase tracking-widest text-purple-400">
            <Sparkles className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
            Coming Soon
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Time Complexity placeholder */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex items-center gap-3.5 select-none hover:bg-white/[0.02] transition-colors duration-150">
              <div className="p-2 rounded-lg bg-purple-500/[0.06] shrink-0">
                <Clock className="w-4 h-4 text-purple-400/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Time Complexity</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-16 rounded-full bg-white/[0.04] animate-pulse" />
                  <Lock className="w-2.5 h-2.5 text-zinc-650" />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">AI-driven analysis of asymptotic runtime behavior.</p>
              </div>
            </div>

            {/* Space Complexity placeholder */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex items-center gap-3.5 select-none hover:bg-white/[0.02] transition-colors duration-150">
              <div className="p-2 rounded-lg bg-purple-500/[0.06] shrink-0">
                <Database className="w-4 h-4 text-purple-400/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Space Complexity</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-20 rounded-full bg-white/[0.04] animate-pulse" />
                  <Lock className="w-2.5 h-2.5 text-zinc-650" />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Evaluation of peak dynamic memory utilization.</p>
              </div>
            </div>

            {/* Battle & Optimization Summary placeholder */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex items-center gap-3.5 select-none hover:bg-white/[0.02] transition-colors duration-150">
              <div className="p-2 rounded-lg bg-purple-500/[0.06] shrink-0">
                <Cpu className="w-4 h-4 text-purple-400/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Battle & TLE Optimizer</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-24 rounded-full bg-white/[0.04] animate-pulse" />
                  <Lock className="w-2.5 h-2.5 text-zinc-650" />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Overall battle performance summary and TLE bottleneck suggestions.</p>
              </div>
            </div>
          </div>

          {/* Subtle info note */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 select-none">
            <Sparkles className="w-3 h-3 text-purple-500/40 shrink-0" />
            <span>AI integration will provide deep code explanations, optimal solution comparisons, and direct battle insights.</span>
          </div>
        </div>
      </div>

      {/* ── 6. Submitted Code section ── */}
      <div className="rounded-2xl border border-zinc-800 bg-[#131316] overflow-hidden shadow-sm flex flex-col min-h-[420px]">

        {/* Code viewer header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-black/15 select-none">
          <div className="flex items-center gap-2.5">
            <Zap className="w-3.5 h-3.5 text-blue-400/70" />
            <span className="text-xs font-bold text-zinc-300">Submitted Code</span>
            {/* Language pill */}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md border border-blue-500/20 bg-blue-500/[0.08] text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400"
            >
              {submission.language}
            </span>
          </div>

          {submission?.source_code && (
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 transition-colors duration-150 cursor-pointer rounded-lg px-2.5 py-1 hover:bg-white/[0.05]"
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

        {/* Code content */}
        <div className="flex-1 overflow-auto p-5 select-text bg-[#0d0d0f]">
          {submission?.source_code ? (
            <pre className="font-mono text-[12.5px] leading-[1.7] text-zinc-300 whitespace-pre overflow-x-auto select-text">
              <code>{submission.source_code}</code>
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-650 text-xs py-16 gap-2">
              <Code className="w-6 h-6 text-zinc-700" />
              <span>No code content available.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
