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
  Timer,
  Sparkles,
  Brain,
  Lock,
  Zap
} from 'lucide-react';
import { api } from '../../shared/lib/api';
import { Button } from '../../shared/ui/button/Button';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useX } from '../x/XContext';
import { getModelById, type ProviderId } from '../x/xModels';
import { cn } from '../../shared/lib/cn';

/* ─────────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────────── */
export const SubmissionResultPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success: showToastSuccess } = useToast();

  const [copied, setCopied] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);

  // AI Insights State
  const { selectedModelId, getEffectiveKey } = useX();
  const [aiInsights, setAiInsights] = useState<{
    timeComplexity: string;
    timeComplexityExplanation: string;
    spaceComplexity: string;
    spaceComplexityExplanation: string;
    summary: string;
    tleOptimizer: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load from local storage on mount/id change
  useEffect(() => {
    if (id) {
      const cached = localStorage.getItem(`ai_insight_${id}`);
      if (cached) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAiInsights(JSON.parse(cached));
        } catch {
          localStorage.removeItem(`ai_insight_${id}`);
        }
      } else {
        setAiInsights(null);
      }
      setAiError(null);
      setAiLoading(false);
    }
  }, [id]);

  const generateAiInsights = async () => {
    if (!id || !submission || !problem) return;
    setAiLoading(true);
    setAiError(null);

    const modelInfo = getModelById(selectedModelId);
    if (!modelInfo) {
      setAiError('Selected AI model is not configured.');
      setAiLoading(false);
      return;
    }

    const { model, provider } = modelInfo;
    const apiKey = getEffectiveKey(provider.id as ProviderId);

    if (!apiKey) {
      setAiError(`No API key available for ${provider.name}. Please configure one in X Settings.`);
      setAiLoading(false);
      return;
    }

    const systemPrompt = `You are an expert algorithm analyzer. Analyze the provided solution code and problem constraints.
Return ONLY a JSON object (no markdown formatting, no other text, just raw JSON) matching this exact TypeScript schema:
{
  "timeComplexity": "O(...)",
  "timeComplexityExplanation": "1 sentence explanation of why.",
  "spaceComplexity": "O(...)",
  "spaceComplexityExplanation": "1 sentence explanation of why.",
  "summary": "2-3 sentences summarizing the solution's performance, correctness, and style.",
  "tleOptimizer": "2 sentences of optimization advice if the code is slow, TLE, or incorrect. If it is already optimal, say 'The solution is already optimal.'"
}`;

    const promptText = `
Problem Title: ${problem.title}
Problem Description:
${problem.description}
Constraints:
${problem.constraints || 'None'}

User's Code (Language: ${submission.language}):
\`\`\`${submission.language}
${submission.source_code}
\`\`\`

Submission Status: ${submission.status}
Runtime: ${submission.runtime_ms !== null ? `${submission.runtime_ms} ms` : 'N/A'}
Error Message: ${submission.error_message || 'None'}
`;

    try {
      let resultText = '';
      if (provider.id === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: 1000,
            messages: [
              { role: 'user', content: `${systemPrompt}\n\nInput context to analyze:\n${promptText}` }
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic error: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        resultText = data.content?.[0]?.text || '';
      } else {
        const response = await fetch(provider.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ],
            max_tokens: 1000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        resultText = data.choices?.[0]?.message?.content || '';
      }

      // Parse JSON (strip codeblock format if the model returns it anyway)
      let cleaned = resultText.trim();
      const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleaned = codeBlockMatch[1];
      }

      const parsed = JSON.parse(cleaned);
      if (
        parsed.timeComplexity &&
        parsed.spaceComplexity &&
        parsed.summary
      ) {
        setAiInsights(parsed);
        localStorage.setItem(`ai_insight_${id}`, JSON.stringify(parsed));
      } else {
        throw new Error('AI response did not match the expected schema.');
      }
    } catch (err: unknown) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  // Poll submission details
  const { data: submission, isLoading: isLoadingSub, isError: isErrorSub } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
      if (!id) throw new Error('No submission ID');
      return await api.submissions.get(id);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'PENDING' || data.status === 'RUNNING')) return 1000;
      if (data && data.status === 'ACCEPTED' && !data.run_samples_only && data.score === 0) return 1000;
      return false;
    },
  });

  const isPending = submission?.status === 'PENDING' || submission?.status === 'RUNNING';
  const isScoreSyncing = submission?.status === 'ACCEPTED' && !submission.run_samples_only && submission.score === 0;

  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api.users.getStats(),
    enabled: !!user,
  });

  const { data: problem } = useQuery({
    queryKey: ['problems', 'detail', slug],
    queryFn: () => api.problems.get(slug || ''),
    enabled: !!slug,
  });

  const { data: results = [], isLoading: isLoadingResults, isError: isErrorResults } = useQuery({
    queryKey: ['submissions', id, 'results'],
    queryFn: async () => {
      if (!id) throw new Error('No submission ID');
      return await api.submissions.getResults(id);
    },
    enabled: !!id && !!submission && !isPending,
    retry: 1,
  });

  useEffect(() => {
    if (submission && submission.status === 'ACCEPTED' && !isScoreSyncing) {
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['problems', 'detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['daily-challenge-status'] });
      queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
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

  /* ── Loading ── */
  if (isLoadingSub) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 select-none">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-blue-500/15 border-t-blue-500/60 rounded-full animate-spin" />
          <Cpu className="absolute inset-0 m-auto w-4 h-4 text-blue-400/60" />
        </div>
        <p className="text-xs text-zinc-500">Loading submission…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (isErrorSub || !submission) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 select-none">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <XCircle className="w-6 h-6 text-rose-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-gray-200">Submission Not Found</p>
          <p className="text-xs text-gray-500">We couldn't load this submission. Please verify the URL.</p>
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
  const failedResults = resultRows.filter(r => !r.passed).length;

  const isAccepted   = submission.status === 'ACCEPTED';
  const isSamplePassed = submission.status === 'SAMPLE_PASSED';
  const isTLE = (submission.status as string) === 'TIME_LIMIT_EXCEEDED'
    || (submission.status as string) === 'TLE'
    || submission.status === 'TIME_LIMIT';

  /* ── Status theme ── */
  type Theme = { color: string; bg: string; border: string; glow: string; icon: React.ReactNode; label: string; pill: string };
  const theme: Theme = (() => {
    if (isPending) return {
      color: 'text-blue-400', bg: 'bg-[#0e1520]', border: 'border-blue-500/15',
      glow: 'from-blue-500/[0.06]',
      icon: <div className="w-5 h-5 border-[1.5px] border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />,
      label: 'Evaluating…',
      pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    if (isAccepted) return {
      color: 'text-emerald-400', bg: 'bg-[#0d1a13]', border: 'border-emerald-500/20',
      glow: 'from-emerald-500/[0.07]',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      label: isScoreSyncing ? 'Accepted — Scoring…' : 'Accepted',
      pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    if (isSamplePassed) return {
      color: 'text-cyan-400', bg: 'bg-[#0c1a1d]', border: 'border-cyan-500/20',
      glow: 'from-cyan-500/[0.06]',
      icon: <CheckCircle className="w-5 h-5 text-cyan-400" />,
      label: 'Sample Cases Passed',
      pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    };
    if (submission.status === 'WRONG_ANSWER' && submission.passed_count > 0) return {
      color: 'text-amber-500', bg: 'bg-[#1a1609]', border: 'border-amber-500/15',
      glow: 'from-amber-500/[0.06]',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      label: 'Partial Accepted',
      pill: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    };
    if (isTLE) return {
      color: 'text-amber-400', bg: 'bg-[#1a1609]', border: 'border-amber-500/20',
      glow: 'from-amber-500/[0.06]',
      icon: <Timer className="w-5 h-5 text-amber-400" />,
      label: 'Time Limit Exceeded',
      pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return {
      color: 'text-rose-400', bg: 'bg-[#1a0d10]', border: 'border-rose-500/20',
      glow: 'from-rose-500/[0.07]',
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
      label: submission.status.replace(/_/g, ' '),
      pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
  })();

  const displayScore = isAccepted ? submission.score : 0;

  /* ─────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────── */
  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4"
      style={{ fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}
    >

      {/* ── Nav row ── */}
      <div className="flex items-center justify-between select-none">
        <Link
          to={`/problems/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Problem
        </Link>
        <span className="font-mono text-[10px] text-zinc-700 tracking-wider">
          #{id?.substring(0, 8).toUpperCase()}
        </span>
      </div>

      {/* ── Status banner ── */}
      <div className={`relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} shadow-sm`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${theme.glow} to-transparent pointer-events-none`} />

        <div className="relative px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/20 border border-white/[0.05] shrink-0">
                {theme.icon}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-0.5">
                  Submission Status
                </p>
                <h1 className={`text-xl font-extrabold tracking-tight leading-none ${theme.color}`}>
                  {theme.label}
                </h1>
                {problem?.title && (
                  <p className="text-[11px] text-zinc-600 mt-1 truncate max-w-[240px]">{problem.title}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isPending && (
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/problems/${slug}`}>
                  <Button size="sm" variant={isAccepted ? 'secondary' : 'primary'} className="text-xs font-semibold px-3 py-1.5 rounded-lg">
                    {isAccepted ? 'Modify' : 'Try Again'}
                  </Button>
                </Link>
                <Link to="/problems">
                  <Button size="sm" variant="outline" className="text-xs font-semibold px-3 py-1.5 rounded-lg">
                    Catalog
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Error detail */}
          {submission.error_message && (() => {
            const { name, detail } = parseErrorSummary(submission.error_message);
            const errorText = `${name}: ${detail}`;
            return (
              <div className="mt-4 rounded-xl border border-rose-500/15 bg-rose-500/[0.05] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-rose-400 block mb-0.5">{name}</span>
                    <p className="text-[11px] text-rose-400/65 leading-relaxed break-words select-text">{detail}</p>
                  </div>
                  <button
                    onClick={() => copyErrorToClipboard(errorText)}
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors font-semibold cursor-pointer mt-0.5"
                  >
                    {errorCopied
                      ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                      : <><Copy className="w-3 h-3" /><span>Copy</span></>
                    }
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Stats row (2-col on mobile, 4-col on sm+) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Score */}
        <div className="rounded-xl border border-zinc-800 bg-[#131316] px-4 py-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Score</span>
            <Award className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <div className="font-mono">
            <span className="text-2xl font-black text-amber-400">+{displayScore}</span>
            <span className="text-xs font-bold text-zinc-600 ml-1">pts</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            {isScoreSyncing ? 'Syncing…' : problem?.difficulty
              ? problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1).toLowerCase()
              : 'Reward'}
          </p>
        </div>

        {/* Total Points */}
        <div className="rounded-xl border border-zinc-800 bg-[#131316] px-4 py-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Total</span>
            <TrendingUp className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <div className="font-mono">
            <span className="text-2xl font-black text-gray-200">
              {userStats?.total_score ?? submission.score ?? 0}
            </span>
            <span className="text-xs font-bold text-zinc-600 ml-1">pts</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            {isScoreSyncing ? 'Updating…' : 'All-time score'}
          </p>
        </div>

        {/* Tests */}
        <div className="rounded-xl border border-zinc-800 bg-[#131316] px-4 py-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Tests</span>
            {isAccepted
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60" />
              : isTLE
              ? <Timer className="w-3.5 h-3.5 text-amber-500/60" />
              : <XCircle className="w-3.5 h-3.5 text-rose-500/60" />
            }
          </div>
          <div>
            <span className={`text-sm font-extrabold ${isAccepted ? 'text-emerald-400' : isTLE ? 'text-amber-400' : isSamplePassed ? 'text-cyan-400' : 'text-rose-400'}`}>
              {isAccepted ? 'All Passed' : isTLE ? 'TLE' : isSamplePassed ? 'Sample OK' : 'Failed'}
            </span>
          </div>
          {/* Mini bar */}
          <div className="w-full h-[3px] rounded-full bg-white/[0.04] overflow-hidden">
            <div className={`h-full rounded-full ${isAccepted ? 'bg-emerald-500/70 w-full' : isTLE ? 'bg-amber-500/60 w-full' : isSamplePassed ? 'bg-cyan-500/60 w-full' : 'bg-rose-500/60 w-1/2'}`} />
          </div>
        </div>

        {/* Runtime */}
        <div className="rounded-xl border border-zinc-800 bg-[#131316] px-4 py-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Runtime</span>
            <Clock className="w-3.5 h-3.5 text-zinc-700" />
          </div>
          <div className="font-mono">
            {isTLE
              ? <span className="text-sm font-extrabold text-amber-400">TLE</span>
              : <><span className="text-2xl font-black text-blue-400">{submission.runtime_ms !== null ? submission.runtime_ms : '—'}</span>
                {submission.runtime_ms !== null && <span className="text-xs font-bold text-zinc-600 ml-1">ms</span>}</>
            }
          </div>
          <p className="text-[10px] text-zinc-600">Limit: {problem?.time_limit_ms ?? 2000} ms</p>
        </div>
      </div>

      {/* ── Result note + perf specs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Result note (spans 2 cols) */}
          <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-[#131316] px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Evaluation</p>
            {isPending ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-3 h-3 border-[1.5px] border-blue-500/60 border-t-transparent rounded-full animate-spin" />
                Running test cases…
              </div>
            ) : isLoadingResults ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-3 h-3 border-[1.5px] border-zinc-600 border-t-transparent rounded-full animate-spin" />
                Loading results…
              </div>
            ) : isErrorResults ? (
              <div className="flex items-center gap-2 text-xs text-amber-400/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Result details unavailable for this submission.
              </div>
            ) : isAccepted && failedResults === 0 ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400 leading-none">All Tests Passed</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Your solution executed correctly on all evaluation cases.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${isTLE ? 'bg-amber-500/10' : isSamplePassed ? 'bg-cyan-500/10' : 'bg-rose-500/10'}`}>
                  {isTLE
                    ? <Timer className="w-4 h-4 text-amber-400" />
                    : isSamplePassed
                    ? <CheckCircle className="w-4 h-4 text-cyan-400" />
                    : <XCircle className="w-4 h-4 text-rose-400" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-bold leading-none ${isTLE ? 'text-amber-400' : isSamplePassed ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {isTLE ? 'Time Limit Exceeded' : isSamplePassed ? 'Hidden Cases Failed' : 'Solution Failed'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isTLE
                      ? 'Exceeded the allowed time limit. Optimize your algorithm.'
                      : isSamplePassed
                      ? 'Passed public samples but failed on hidden evaluation cases.'
                      : 'Incorrect output or runtime error on one or more test cases.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Perf specs */}
          <div className="rounded-xl border border-zinc-800 bg-[#131316] px-5 py-4 select-none">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Specs</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600"><Database className="w-3 h-3" />Memory</span>
                <span className="font-mono font-semibold text-zinc-300">
                  {problem?.memory_limit_kb ? `${(problem.memory_limit_kb / 1024).toFixed(0)} MB` : '256 MB'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600"><Clock className="w-3 h-3" />Time Limit</span>
                <span className="font-mono font-semibold text-zinc-300">
                  {problem?.time_limit_ms ? `${problem.time_limit_ms} ms` : '2000 ms'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600"><Code className="w-3 h-3" />Language</span>
                <span className="font-mono font-bold text-blue-400 uppercase text-[10px]">
                  {submission.language}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* ── AI Insights ── */}
      {aiInsights ? (
        <div className="rounded-xl border border-purple-500/20 bg-[#171221] px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-300">AI Insights &amp; Performance Analysis</p>
                <p className="text-[10px] text-purple-400/60 mt-0.5">
                  Generated using {getModelById(selectedModelId)?.model.displayName || 'X AI'}
                </p>
              </div>
            </div>
            <button
              onClick={generateAiInsights}
              disabled={aiLoading}
              className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Regenerate
            </button>
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed font-sans border-t border-purple-500/10 pt-3 select-text">
            {aiInsights.summary}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-[#131316] px-5 py-4 flex items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/[0.07] shrink-0">
              <Brain className="w-4 h-4 text-purple-400/60" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-400">AI Insights &amp; Performance Analysis</p>
              <p className="text-[10px] text-zinc-650 mt-0.5 truncate max-w-lg">
                {aiError ? (
                  <span className="text-rose-400/80">{aiError}</span>
                ) : (
                  `Analyze complexity, bottlenecks, and optimizations using ${getModelById(selectedModelId)?.model.displayName || 'X AI'}.`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={generateAiInsights}
            disabled={aiLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-[0.97] shrink-0",
              aiLoading
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-500 text-white border-purple-600 hover:border-purple-500 shadow-md shadow-purple-500/10"
            )}
          >
            {aiLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Analyze
              </>
            )}
          </button>
        </div>
      )}

      {/* AI sub-items */}
      {aiInsights ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Time Complexity */}
          <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.02] px-4 py-3 flex flex-col gap-2 hover:bg-purple-500/[0.04] transition-colors duration-150">
            <div className="flex items-center gap-1.5 justify-between select-none">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Time Complexity</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-extrabold text-purple-400 font-mono">
                {aiInsights.timeComplexity}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed mt-1 select-text">
              {aiInsights.timeComplexityExplanation}
            </p>
          </div>

          {/* Space Complexity */}
          <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.02] px-4 py-3 flex flex-col gap-2 hover:bg-purple-500/[0.04] transition-colors duration-150">
            <div className="flex items-center gap-1.5 justify-between select-none">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Space Complexity</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-extrabold text-purple-400 font-mono">
                {aiInsights.spaceComplexity}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed mt-1 select-text">
              {aiInsights.spaceComplexityExplanation}
            </p>
          </div>

          {/* TLE Optimizer */}
          <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.02] px-4 py-3 flex flex-col gap-2 hover:bg-purple-500/[0.04] transition-colors duration-150">
            <div className="flex items-center gap-1.5 select-none">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">TLE Optimizer</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed mt-1 select-text">
              {aiInsights.tleOptimizer}
            </p>
          </div>
        </div>
      ) : aiLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { icon: <Clock className="w-3.5 h-3.5 text-purple-400/50" />, label: 'Time Complexity' },
            { icon: <Database className="w-3.5 h-3.5 text-purple-400/50" />, label: 'Space Complexity' },
            { icon: <Cpu className="w-3.5 h-3.5 text-purple-400/50" />, label: 'TLE Optimizer' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="rounded-xl border border-purple-500/10 bg-purple-500/[0.02] px-4 py-3 flex flex-col gap-2 select-none"
            >
              <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 flex-1 rounded-full bg-purple-500/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-purple-500/20 -translate-x-full animate-pulse" />
                </div>
              </div>
              <p className="text-[9px] text-purple-500/40 leading-relaxed">Analyzing solution...</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { icon: <Clock className="w-3.5 h-3.5 text-purple-400/50" />, label: 'Time Complexity', desc: 'Asymptotic runtime analysis' },
            { icon: <Database className="w-3.5 h-3.5 text-purple-400/50" />, label: 'Space Complexity', desc: 'Peak memory utilization' },
            { icon: <Cpu className="w-3.5 h-3.5 text-purple-400/50" />, label: 'TLE Optimizer', desc: 'Bottleneck suggestions' },
          ].map(({ icon, label, desc }) => (
            <div
              key={label}
              onClick={generateAiInsights}
              className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 flex flex-col gap-2 select-none hover:bg-white/[0.02] hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/[0.02] transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide group-hover:text-purple-400/80 transition-colors">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-white/[0.04] group-hover:bg-purple-500/10 transition-colors" />
                <Lock className="w-2.5 h-2.5 text-zinc-700 group-hover:text-purple-500/40 transition-colors shrink-0" />
              </div>
              <p className="text-[9px] text-zinc-700 leading-relaxed group-hover:text-zinc-500 transition-colors">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Code viewer ── */}
      <div className="rounded-xl border border-zinc-800 bg-[#131316] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800/60 bg-black/15">
          <div className="flex items-center gap-2 select-none">
            <Zap className="w-3.5 h-3.5 text-blue-400/60" />
            <span className="text-xs font-semibold text-zinc-400">Submitted Code</span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/[0.07] text-blue-400">
              {submission.language}
            </span>
          </div>
          {submission?.source_code && (
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-600 hover:text-zinc-200 transition-colors rounded px-2 py-1 hover:bg-white/[0.05] cursor-pointer"
            >
              {copied
                ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                : <><Copy className="w-3 h-3" /><span>Copy</span></>
              }
            </button>
          )}
        </div>

        {/* Code */}
        <div className="overflow-auto p-5 bg-[#0d0d0f] max-h-[480px]">
          {submission?.source_code ? (
            <pre className="font-mono text-[12px] leading-[1.75] text-zinc-300 whitespace-pre overflow-x-auto select-text">
              <code>{submission.source_code}</code>
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-700 text-xs">
              <Code className="w-5 h-5" />
              <span>No code available.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
