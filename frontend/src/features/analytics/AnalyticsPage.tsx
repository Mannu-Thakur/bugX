import { useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { FEATURES } from '../../shared/config/features';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { SolvedByDifficulty } from './components/SolvedByDifficulty';
import { SubmissionCalendar } from './components/SubmissionCalendar';
import { PerformanceTrend } from './components/PerformanceTrend';
import { LanguageBreakdown } from './components/LanguageBreakdown';
import { VerdictBreakdown } from './components/VerdictBreakdown';

/* ─── Stat Card ──────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, subtitle, accent, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 group hover:border-white/[0.08] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
          <p className={`text-3xl font-bold mt-1 font-mono ${accent}`}>{value}</p>
          {subtitle && <p className="text-[10px] text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-white/[0.03] ${accent} opacity-60 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─── Loading shimmer ────────────────────────────────────── */

function LoadingShimmer() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-white/[0.02] rounded-xl border border-white/[0.04]" />)}
      </div>
      <div className="h-48 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
        <div className="h-64 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export function AnalyticsPage() {
  const { user } = useAuth();
  const { stats, submissions, isLoading, isError } = useAnalyticsData();

  // Computed metrics
  const acceptanceRate = useMemo(() => {
    if (!submissions?.length) return 0;
    const accepted = submissions.filter((s) => s.status === 'accepted').length;
    return Math.round((accepted / submissions.length) * 100);
  }, [submissions]);

  const uniqueLanguages = useMemo(() => {
    if (!submissions?.length) return 0;
    return new Set(submissions.map((s) => s.language).filter(Boolean)).size;
  }, [submissions]);

  /* Guard: feature flag */
  if (!FEATURES.ANALYTICS) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Analytics dashboard is currently disabled.</p>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) return <LoadingShimmer />;

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400">Failed to load analytics. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Your coding performance at a glance</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Solved"
          value={stats?.total_solved ?? 0}
          subtitle={`${stats?.easy_solved ?? 0}E · ${stats?.medium_solved ?? 0}M · ${stats?.hard_solved ?? 0}H`}
          accent="text-[#4F7DFF]"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Acceptance Rate"
          value={`${acceptanceRate}%`}
          subtitle={`${submissions?.length ?? 0} total submissions`}
          accent="text-emerald-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label="Current Streak"
          value={`${stats?.current_streak ?? 0}d`}
          subtitle={`Best: ${stats?.best_streak ?? 0} days`}
          accent="text-amber-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          }
        />
        <StatCard
          label="Languages"
          value={uniqueLanguages}
          subtitle="unique languages used"
          accent="text-purple-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />
      </div>

      {/* Submission Calendar — full width */}
      <SubmissionCalendar submissions={submissions ?? []} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolvedByDifficulty
          easy={stats?.easy_solved ?? 0}
          medium={stats?.medium_solved ?? 0}
          hard={stats?.hard_solved ?? 0}
        />
        <VerdictBreakdown submissions={submissions ?? []} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceTrend submissions={submissions ?? []} />
        <LanguageBreakdown submissions={submissions ?? []} />
      </div>

      {/* Score card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Score Overview</h3>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-[#4F7DFF] font-mono">{stats?.total_score ?? 0}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Total Score</p>
          </div>
          <div className="h-12 w-px bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-4xl font-bold text-emerald-400 font-mono">{stats?.total_solved ?? 0}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Problems Solved</p>
          </div>
          {(stats?.battles_played ?? 0) > 0 && (
            <>
              <div className="h-12 w-px bg-white/[0.06]" />
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-400 font-mono">{stats?.battles_won ?? 0}/{stats?.battles_played ?? 0}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">Battles Won</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
