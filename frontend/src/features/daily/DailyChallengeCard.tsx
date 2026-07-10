/**
 * DailyChallengeCard — compact, embeddable card for the landing page and problems page.
 *
 * - Shows today's problem with difficulty, tags, acceptance rate, countdown to reset
 * - If logged in: shows solved/unsolved status live (refetches on window focus)
 * - If not logged in: shows the problem with a "Log in to solve" prompt
 * - Feature-flagged: returns null if FEATURES.DAILY_CHALLENGE is false
 * - Zero dependencies beyond React Query + lucide-react (already in the project)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDailyChallenge, useDailyChallengeStatus } from './useDailyChallenge';
import { useUserStats } from '../profile/hooks';
import { FEATURES } from '../../shared/config/features';
import { getToken } from '../../shared/lib/api';
import { cn } from '../../shared/lib/cn';

/* ─── Helpers ───────────────────────────────────────────── */

const DIFF_STYLE: Record<string, { label: string; pill: string; glow: string }> = {
  EASY:   { label: 'Easy',   pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.08)]' },
  MEDIUM: { label: 'Medium', pill: 'bg-amber-500/10  text-amber-400  border-amber-500/20',  glow: 'shadow-[0_0_24px_rgba(245,158,11,0.08)]'  },
  HARD:   { label: 'Hard',   pill: 'bg-rose-500/10   text-rose-400   border-rose-500/20',   glow: 'shadow-[0_0_24px_rgba(239,68,68,0.08)]'   },
};

function useCountdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  });

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/* ─── Skeleton ───────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-white/[0.04] rounded" />
        <div className="h-3 w-16 bg-white/[0.04] rounded" />
      </div>
      <div className="h-5 w-3/4 bg-white/[0.05] rounded" />
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-white/[0.03] rounded-full" />
        <div className="h-5 w-20 bg-white/[0.03] rounded-full" />
      </div>
      <div className="h-9 w-full bg-white/[0.03] rounded-lg" />
    </div>
  );
}

/* ─── Weekly Calendar strip ─── */
function WeeklyCalendarStrip({ solvedToday }: { solvedToday: boolean }) {
  const { data: stats } = useUserStats();
  
  // Last 7 days ending with today
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const formatLocalYYYYMMDD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatLocalYYYYMMDD(new Date());

  return (
    <div className="border-t border-white/[0.04] pt-4 mt-1 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Weekly Tracker</span>
        {solvedToday ? (
          <span className="text-[9px] text-emerald-400 font-semibold">Today's target achieved!</span>
        ) : (
          <span className="text-[9px] text-amber-500 font-semibold animate-pulse">Daily target pending</span>
        )}
      </div>
      <div className="flex justify-between items-center gap-1">
        {days.map((day, idx) => {
          const dateStr = formatLocalYYYYMMDD(day);
          const isToday = dateStr === todayStr;
          const dayName = day.toLocaleDateString('en-US', { weekday: 'narrow' });
          const dayNum = day.getDate();
          
          const hasActivity = (stats?.submission_activity?.[dateStr] ?? 0) > 0;
          const isSolved = isToday ? solvedToday : hasActivity;

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold font-mono border transition-all duration-300",
                  isToday
                    ? isSolved
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-2 ring-emerald-500/10"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 ring-2 ring-amber-500/10 animate-pulse"
                    : isSolved
                      ? "bg-emerald-500/10 text-emerald-500/70 border-emerald-500/20"
                      : "bg-white/[0.02] text-gray-600 border-white/[0.04]"
                )}
                title={isToday ? "Today" : day.toLocaleDateString()}
              >
                {isSolved ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  dayNum
                )}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase",
                isToday ? "text-[#4f7dff]" : "text-gray-600"
              )}>
                {dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Card ──────────────────────────────────────────── */

interface DailyChallengeCardProps {
  /** Compact = smaller padding, used inside sidebars or tighter layouts */
  compact?: boolean;
  className?: string;
}

export function DailyChallengeCard({ compact = false, className }: DailyChallengeCardProps) {
  const countdown = useCountdown();
  const isLoggedIn = !!getToken();

  /* Always call both hooks — the status hook disables itself when not logged in */
  const publicQuery = useDailyChallenge();
  const statusQuery = useDailyChallengeStatus();

  if (!FEATURES.DAILY_CHALLENGE) return null;

  if (publicQuery.isLoading) return <CardSkeleton />;
  if (publicQuery.isError || !publicQuery.data) return null;

  /* Prefer authenticated data when available */
  const data = statusQuery.data ?? publicQuery.data;
  const { problem } = data;
  const solvedToday = !!('solved_today' in data ? (data as Record<string, unknown>).solved_today : false);
  const everSolved  = !!('ever_solved'  in data ? (data as Record<string, unknown>).ever_solved  : false);

  const diff = DIFF_STYLE[problem.difficulty] ?? DIFF_STYLE.EASY;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300',
        'hover:border-white/[0.1]',
        diff.glow,
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4F7DFF] via-[#7A5FFF] to-[#4F7DFF] opacity-60" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Flame icon */}
          <svg
            className={cn(
              "w-4 h-4 transition-colors",
              solvedToday ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" : "text-amber-400"
            )}
            fill={solvedToday ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Daily Challenge</span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="tabular-nums">{countdown}</span>
        </div>
      </div>

      {/* Problem title */}
      <h3 className={cn(
        'font-semibold text-gray-100 leading-snug group-hover:text-white transition-colors mb-3',
        compact ? 'text-sm' : 'text-base',
      )}>
        {problem.title}
      </h3>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Difficulty pill */}
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
          diff.pill,
        )}>
          {diff.label}
        </span>

        {/* Tags */}
        {problem.tags.slice(0, 2).map((tag) => (
          <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.03] border border-white/[0.05] text-gray-500">
            {tag.name}
          </span>
        ))}

        {/* Acceptance rate */}
        {problem.acceptance_rate != null && (
          <span className="ml-auto text-[10px] font-mono text-gray-600">
            {Math.round(problem.acceptance_rate)}% AC
          </span>
        )}
      </div>

      {/* Weekly Tracker */}
      {isLoggedIn && <WeeklyCalendarStrip solvedToday={solvedToday} />}

      {/* Solved state / CTA */}
      {isLoggedIn ? (
        solvedToday ? (
          /* Already solved today */
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-emerald-400">Solved today — great work! 🎉</span>
          </div>
        ) : (
          /* Solve CTA */
          <Link
            to={`/problems/${problem.slug}`}
            className="group/btn flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 hover:bg-[#4F7DFF]/20 hover:border-[#4F7DFF]/40 transition-all duration-200"
          >
            <span className="text-xs font-semibold text-[#4F7DFF]">
              {everSolved ? 'Solve again →' : 'Start solving →'}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono text-gray-600">
              <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              +{problem.score_base} pts
            </div>
          </Link>
        )
      ) : (
        /* Not logged in */
        <Link
          to="/login"
          className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-all duration-200"
        >
          Log in to solve today's challenge
        </Link>
      )}

      {/* Date label */}
      <p className="text-[9px] font-mono text-gray-700 mt-3 text-right">
        {data.date} · Pool: {data.pool_size} problems
      </p>
    </div>
  );
}
