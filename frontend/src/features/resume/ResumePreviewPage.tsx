import { useRef, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { FEATURES } from '../../shared/config/features';
import { Button } from '../../shared/ui/button/Button';
import { useResumeData } from './hooks/useResumeData';
import { ResumeSection } from './components/ResumeSection';
import { DifficultyBar } from './components/DifficultyBar';
import { LanguageDonut, getLanguageColor } from './components/LanguageDonut';

/* ─── Icons (inline SVG) ────────────────────────────────── */

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m4 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4m0 0h6" />
  </svg>
);
const IconCode = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);
const IconTrophy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14l-1.405 8.431A5 5 0 0112.69 16H11.31a5 5 0 01-4.905-4.569L5 3zm3 18h8m-4-4v4" />
  </svg>
);
const IconFire = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);
const IconPrint = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);
const IconStar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

/* ─── Loading shimmer ────────────────────────────────────── */

function LoadingShimmer() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-8 space-y-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-white/[0.04]" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-white/[0.04] rounded" />
            <div className="h-4 w-24 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white/[0.04] rounded-lg" />)}
        </div>
        <div className="h-32 bg-white/[0.04] rounded-lg" />
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export function ResumePreviewPage() {
  const { user } = useAuth();
  const { stats, submissions, isLoading, isError } = useResumeData();
  const resumeRef = useRef<HTMLDivElement>(null);

  // Derive language breakdown from submissions
  const languageBreakdown = useMemo(() => {
    if (!submissions?.length) return [];
    const counts: Record<string, number> = {};
    for (const sub of submissions) {
      if (sub.language) {
        counts[sub.language] = (counts[sub.language] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: getLanguageColor(name) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [submissions]);

  // Acceptance rate
  const acceptanceRate = useMemo(() => {
    if (!submissions?.length) return 0;
    const accepted = submissions.filter((s) => s.status === 'accepted').length;
    return Math.round((accepted / submissions.length) * 100);
  }, [submissions]);

  /* Guard: feature flag */
  if (!FEATURES.RESUME_EXPORT) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Resume export is currently disabled.</p>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) return <LoadingShimmer />;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400">Failed to load resume data. Please try again.</p>
      </div>
    );
  }

  const displayName = user.fullName || user.username;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Resume Preview</h1>
          <p className="text-sm text-gray-500 mt-1">Your coding profile at a glance</p>
        </div>
        <Button variant="primary" size="md" onClick={handlePrint}>
          <span className="flex items-center gap-2">
            <IconPrint />
            Print / Save PDF
          </span>
        </Button>
      </div>

      {/* ─── Resume Card ────────────────────────────────── */}
      <div
        ref={resumeRef}
        id="resume-preview"
        className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 space-y-8 overflow-hidden print:bg-white print:text-black print:rounded-none print:border-gray-300"
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4F7DFF] via-[#7A5FFF] to-[#4F7DFF] opacity-60 rounded-t-2xl print:hidden" />

        {/* Header */}
        <div className="flex items-start gap-5 pb-6 border-b border-white/[0.06] print:border-gray-300">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F7DFF] to-[#7A5FFF] flex items-center justify-center text-white text-2xl font-bold shrink-0 ring-1 ring-white/[0.06] shadow-lg shadow-black/20 print:shadow-none">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-100 print:text-black">
              {displayName}
            </h1>
            <p className="text-gray-500 text-sm font-mono print:text-gray-600">@{user.username}</p>
            {user.bio && (
              <p className="text-gray-400 text-sm mt-2 leading-relaxed print:text-gray-700">{user.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#4F7DFF]/10 text-[#4F7DFF] rounded-full text-xs font-medium print:bg-blue-50 print:text-blue-700">
                <IconChart />
                Score: {stats?.total_score ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium print:bg-emerald-50 print:text-emerald-700">
                <IconFire />
                Streak: {stats?.current_streak ?? 0}d (best: {stats?.best_streak ?? 0}d)
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <ResumeSection title="Problem Solving Stats" icon={<IconChart />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Solved', value: stats?.total_solved ?? 0, accent: 'text-[#4F7DFF] print:text-blue-700' },
              { label: 'Easy', value: stats?.easy_solved ?? 0, accent: 'text-emerald-400 print:text-emerald-700' },
              { label: 'Medium', value: stats?.medium_solved ?? 0, accent: 'text-amber-400 print:text-yellow-700' },
              { label: 'Hard', value: stats?.hard_solved ?? 0, accent: 'text-rose-400 print:text-red-700' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 text-center print:bg-gray-50 print:border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold print:text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 font-mono ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <DifficultyBar
            easy={stats?.easy_solved ?? 0}
            medium={stats?.medium_solved ?? 0}
            hard={stats?.hard_solved ?? 0}
            total={stats?.total_solved ?? 0}
          />
        </ResumeSection>

        {/* Acceptance Rate */}
        <ResumeSection title="Performance" icon={<IconTrophy />}>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={acceptanceRate >= 70 ? '#10b981' : acceptanceRate >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${(acceptanceRate / 100) * 263.89} 263.89`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-100 print:text-black">{acceptanceRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-300 print:text-gray-700">Acceptance Rate</p>
              <p className="text-xs text-gray-500 mt-1">
                {submissions?.filter((s) => s.status === 'accepted').length ?? 0} accepted out of {submissions?.length ?? 0} submissions
              </p>
            </div>
          </div>
        </ResumeSection>

        {/* Languages */}
        <ResumeSection title="Languages Used" icon={<IconCode />}>
          {languageBreakdown.length > 0 ? (
            <LanguageDonut languages={languageBreakdown} />
          ) : (
            <p className="text-gray-500 text-sm">No submissions yet</p>
          )}
        </ResumeSection>

        {/* Top Submissions */}
        <ResumeSection title="Notable Submissions" icon={<IconStar />}>
          {submissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {submissions
                .filter((s) => s.status === 'accepted')
                .slice(0, 10)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/[0.04] bg-white/[0.015] text-sm print:bg-gray-50 print:border-gray-200"
                  >
                    <span className="text-gray-300 truncate print:text-gray-700">{s.problem_title || 'Problem'}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ml-2 bg-white/[0.04] text-gray-400 font-mono print:bg-gray-100 print:text-gray-600">
                      {s.language}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No accepted submissions yet</p>
          )}
        </ResumeSection>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.06] text-center print:border-gray-300">
          <p className="text-xs text-gray-600 print:text-gray-400">
            Generated from bugX · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
