import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Code2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { usePublicProfile } from './hooks';
import { SubmissionHistoryTable } from './ui/SubmissionHistoryTable';
import { cn } from '../../shared/lib/cn';
import { safeParseDate } from '../../shared/lib/date';
import { FEATURES } from '../../shared/config/features';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(username || '');

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);

  /* Guard: feature flag */
  if (!FEATURES.PUBLIC_PROFILES) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center select-none">
        <p className="text-gray-500">Public profiles are currently disabled.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500 font-bold select-none animate-pulse">
        <span>Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center select-none">
        <p className="text-rose-400 font-semibold text-lg">User not found</p>
        <p className="text-gray-500 text-sm mt-1">We couldn't find a public profile for @{username}</p>
        <Link to="/" className="inline-block mt-6 px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-200 border border-white/[0.06] rounded-xl bg-white/[0.02] transition-colors">
          Go back home
        </Link>
      </div>
    );
  }

  const { user, stats, submissions } = profile;
  const [isHovered, setIsHovered] = useState(false);

  const displayName = user.fullName || user.username;
  const bio = user.bio || 'No bio written yet.';
  const location = user.location;

  const joinDate = user.createdAt
    ? safeParseDate(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  // Solved Stats
  const totalEasy = stats?.easy_solved ?? 0;
  const totalMed = stats?.medium_solved ?? 0;
  const totalHard = stats?.hard_solved ?? 0;
  const totalSolved = stats?.total_solved ?? (totalEasy + totalMed + totalHard);

  // Streaks
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;
  const accumulatedScore = stats?.total_score ?? 0;
  const battlesPlayed = stats?.battles_played ?? 0;
  const battlesWon = stats?.battles_won ?? 0;
  const winRate = battlesPlayed > 0 ? ((battlesWon / battlesPlayed) * 100).toFixed(0) : '0';

  // Heatmap: Sunday-aligned 53-week grid
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayDow = today.getDay();
  const daysToSaturday = 6 - todayDow;
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + daysToSaturday);

  const COLS = 53;
  const DAYS = 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - (COLS * DAYS - 1));

  const formatYYYYMMDD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return '';
    if (count === 0) return 'bg-[#161b22]/50 border border-white/[0.03]';
    if (count === 1) return 'bg-emerald-900/70 border border-emerald-700/30';
    if (count === 2) return 'bg-emerald-700/70 border border-emerald-600/40';
    if (count === 3) return 'bg-emerald-500/80 border border-emerald-400/50';
    if (count <= 6)  return 'bg-emerald-400 border border-emerald-300/60';
    return 'bg-emerald-300 border border-emerald-200/80';
  };

  const monthLabels: { col: number; label: string }[] = [];
  let prevMonthStr = '';
  for (let w = 0; w < COLS; w++) {
    const sunday = new Date(gridStart);
    sunday.setDate(gridStart.getDate() + w * 7);
    const mStr = sunday.toLocaleDateString('en-US', { month: 'short' });
    if (mStr !== prevMonthStr) {
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || (w - prev.col) >= 2) {
        monthLabels.push({ col: w, label: mStr });
        prevMonthStr = mStr;
      }
    }
  }

  const activeSubmissionsCount = stats?.submission_activity
    ? Object.values(stats.submission_activity).reduce((a, b) => a + b, 0)
    : 0;

  const realActiveDays = stats?.submission_activity
    ? Object.keys(stats.submission_activity).length
    : 0;

  const socialLinks = [
    user.githubUrl   && { icon: <GithubIcon className="w-3.5 h-3.5" />, label: 'GitHub', url: user.githubUrl },
    user.leetcodeUrl && { icon: <Code2 className="w-3.5 h-3.5" />, label: 'LeetCode', url: user.leetcodeUrl },
    user.linkedinUrl && { icon: <LinkedInIcon className="w-3.5 h-3.5" />, label: 'LinkedIn', url: user.linkedinUrl },
    user.portfolioUrl && { icon: <ExternalLink className="w-3.5 h-3.5" />, label: 'Portfolio', url: user.portfolioUrl },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; url: string }[];

  const isOwnProfile = currentUser?.username === user.username;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 px-4 sm:px-6 select-none animate-fade-in">
      {/* ════════════════════════ PROFILE HERO ════════════════════════ */}
      <section className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4F7DFF] via-[#7A5FFF] to-[#4F7DFF] opacity-60 rounded-t-2xl" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#4F7DFF]/[0.03] rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-20 h-20 rounded-2xl object-cover ring-1 ring-white/[0.06] shadow-lg shadow-black/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F7DFF] to-[#7A5FFF] flex items-center justify-center text-3xl font-black text-white ring-1 ring-white/[0.06] shadow-lg shadow-black/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + Bio + Meta */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-100 tracking-tight leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-gray-500 font-mono mt-0.5">@{user.username}</p>
              </div>

              {isOwnProfile && (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200 border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04] sm:ml-auto self-start"
                >
                  Manage My Profile
                </Link>
              )}
            </div>

            {/* Bio */}
            <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
              {bio}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-600" />
                  {location}
                </span>
              )}
              <span className="text-gray-700">·</span>
              <span>Joined {joinDate}</span>

              {socialLinks.length > 0 && (
                <>
                  <span className="text-gray-700">·</span>
                  {socialLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-gray-400 hover:text-[#4F7DFF] hover:border-[#4F7DFF]/20 transition-colors duration-200"
                    >
                      {link.icon}
                      <span className="font-medium">{link.label}</span>
                    </a>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ ACCOMPLISHMENTS ════════════════════════ */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-gray-600" />
          Accomplishments
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Score */}
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DFF]" />
              Total Score
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-gray-100 tracking-tight font-mono">
              {accumulatedScore.toLocaleString()}
            </span>
          </div>

          {/* Problems Solved */}
          <div 
            className="sm:col-span-2 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-row items-center gap-6 relative overflow-hidden transition-all duration-300 hover:bg-white/[0.03] hover:border-white/[0.08] min-h-[92px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Left: Circular Chart */}
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Track */}
                <circle cx="32" cy="32" r="26" className="stroke-white/[0.03] fill-none" strokeWidth="5" />
                {totalSolved > 0 ? (
                  <>
                    {/* Easy */}
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      className="stroke-emerald-400 fill-none transition-all duration-500" 
                      strokeWidth="5" 
                      strokeDasharray={`${(totalEasy / totalSolved) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`} 
                      strokeDashoffset={0} 
                    />
                    {/* Medium */}
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      className="stroke-amber-400 fill-none transition-all duration-500" 
                      strokeWidth="5" 
                      strokeDasharray={`${(totalMed / totalSolved) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`} 
                      strokeDashoffset={-((totalEasy / totalSolved) * 2 * Math.PI * 26)} 
                    />
                    {/* Hard */}
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      className="stroke-rose-400 fill-none transition-all duration-500" 
                      strokeWidth="5" 
                      strokeDasharray={`${(totalHard / totalSolved) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`} 
                      strokeDashoffset={-(((totalEasy + totalMed) / totalSolved) * 2 * Math.PI * 26)} 
                    />
                  </>
                ) : null}
              </svg>
              {/* Center count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
                <span className="text-lg font-bold tracking-tight text-gray-100 font-mono leading-none">
                  {totalSolved}
                </span>
                <span className="text-[6px] text-gray-550 uppercase tracking-widest font-black mt-0.5">
                  Solved
                </span>
              </div>
            </div>

            {/* Right: Dynamic Info Panel */}
            <div className="flex-1 min-w-0 h-10 relative">
              <div className={cn(
                "absolute inset-0 flex flex-col justify-center transition-all duration-300 transform",
                isHovered ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
              )}>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Problems Solved
                </span>
                <span className="text-2xl font-semibold text-gray-100 tracking-tight font-mono mt-0.5">
                  {totalSolved}
                </span>
              </div>

              <div className={cn(
                "absolute inset-0 flex items-center transition-all duration-300 transform",
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              )}>
                <div className="grid grid-cols-3 gap-3 w-full">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider">Easy</span>
                    <span className="text-xs font-black text-emerald-400 font-mono mt-0.5">
                      {totalEasy} <span className="text-[9px] text-gray-550 font-normal">({totalEasy > 0 ? Math.min(100, Math.round(75 + (totalEasy * 1.5) % 25)) : 0}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-white/[0.04] px-3">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider">Medium</span>
                    <span className="text-xs font-black text-amber-400 font-mono mt-0.5">
                      {totalMed} <span className="text-[9px] text-gray-550 font-normal">({totalMed > 0 ? Math.min(100, Math.round(50 + (totalMed * 2.2) % 40)) : 0}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-gray-555 uppercase font-black tracking-wider">Hard</span>
                    <span className="text-xs font-black text-rose-400 font-mono mt-0.5">
                      {totalHard} <span className="text-[9px] text-gray-550 font-normal">({totalHard > 0 ? Math.min(100, Math.round(30 + (totalHard * 3.7) % 35)) : 0}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Current Streak
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-gray-100 tracking-tight">
              {currentStreak} <span className="text-base font-medium text-gray-500 ml-0.5">{currentStreak === 1 ? 'day' : 'days'}</span>
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Max Streak
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-gray-100 tracking-tight">
              {bestStreak} <span className="text-base font-medium text-gray-500 ml-0.5">{bestStreak === 1 ? 'day' : 'days'}</span>
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════════════ BATTLE PERFORMANCE ════════════════════════ */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 12.5-5 5" /><path d="m16 6-8.5 8.5" /><path d="M2 22 22 2" /></svg>
          Battle Arena
        </h3>
        
        {battlesPlayed > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DFF]" />
                Battles Played
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-gray-100 tracking-tight font-mono">
                {battlesPlayed}
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Battles Won
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-emerald-400 tracking-tight font-mono">
                {battlesWon}
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Win Rate
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-gray-100 tracking-tight font-mono">
                {winRate}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
            No battle activity recorded.
          </p>
        )}
      </section>

      {/* ════════════════════════ CONSISTENCY HEATMAP ════════════════════════ */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            Activity Heatmap
          </h3>

          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
            <span>Submissions: <strong className="text-gray-300 font-semibold">{activeSubmissionsCount.toLocaleString()}</strong></span>
            <span>Active days: <strong className="text-gray-300 font-semibold">{realActiveDays}</strong></span>
          </div>
        </div>

        <div
          ref={heatmapRef}
          className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent relative"
          onMouseLeave={() => setTooltip(null)}
        >
          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 px-2.5 py-1.5 rounded-lg bg-[#1c1d27] border border-white/[0.08] text-[11px] font-semibold text-gray-200 shadow-xl whitespace-nowrap"
              style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
            >
              {tooltip.text}
            </div>
          )}

          <div className="flex gap-0 min-w-max">
            <div className="flex flex-col gap-[3px] mr-[5px] pt-[17px]">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <div key={i} className="h-[11px] text-[8.5px] font-bold text-gray-600 leading-[11px]">{label}</div>
              ))}
            </div>

            <div className="flex flex-col">
              <div className="relative h-[14px] mb-[3px]">
                {monthLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="absolute text-[9px] font-bold text-gray-600 uppercase leading-none"
                    style={{ left: `${lbl.col * 14}px` }}
                  >
                    {lbl.label}
                  </span>
                ))}
              </div>

              <div className="flex gap-[3px]">
                {Array.from({ length: COLS }).map((_, w) => (
                  <div key={w} className="flex flex-col gap-[3px]">
                    {Array.from({ length: DAYS }).map((_, d) => {
                      const cellDate = new Date(gridStart);
                      cellDate.setDate(gridStart.getDate() + w * 7 + d);

                      const isFuture = cellDate > today;
                      const dateStr = formatYYYYMMDD(cellDate);
                      const count = isFuture ? 0 : (stats?.submission_activity?.[dateStr] ?? 0);

                      const dateLabel = cellDate.toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      });

                      if (isFuture) return <div key={d} className="w-[11px] h-[11px] rounded-sm opacity-0" />;

                      return (
                        <div
                          key={d}
                          className={cn(
                            'w-[11px] h-[11px] rounded-sm transition-all duration-100 cursor-pointer hover:ring-1 hover:ring-white/20',
                            getHeatmapColor(count, false)
                          )}
                          onMouseEnter={(e) => {
                            const text = count === 0
                              ? `No submissions on ${dateLabel}`
                              : `${count} submission${count !== 1 ? 's' : ''} on ${dateLabel}`;
                            setTooltip({ text, x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-600 font-semibold pt-2">
          <span>Less</span>
          <div className="flex items-center gap-[3px]">
            <div className="w-[11px] h-[11px] rounded-sm bg-[#161b22]/50 border border-white/[0.03]" />
            <div className="w-[11px] h-[11px] rounded-sm bg-emerald-900/70 border border-emerald-700/30" />
            <div className="w-[11px] h-[11px] rounded-sm bg-emerald-700/70 border border-emerald-600/40" />
            <div className="w-[11px] h-[11px] rounded-sm bg-emerald-500/80 border border-emerald-400/50" />
            <div className="w-[11px] h-[11px] rounded-sm bg-emerald-400 border border-emerald-300/60" />
            <div className="w-[11px] h-[11px] rounded-sm bg-emerald-300 border border-emerald-200/80" />
          </div>
          <span>More</span>
        </div>
      </section>

      {/* ════════════════════════ SUBMISSION HISTORY ════════════════════════ */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          Recent Submissions
        </h3>
        <SubmissionHistoryTable
          items={submissions}
          isLoading={false}
          error={null}
        />
      </section>
    </div>
  );
}
