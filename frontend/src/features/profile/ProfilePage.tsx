import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Check,
  MapPin,
  Star,
  Swords,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useUserStats, useUserSubmissions } from '../profile/hooks';
import { SubmissionHistoryTable } from './ui/SubmissionHistoryTable';
import { cn } from '../../shared/lib/cn';
import { EditProfileModal } from '../auth/ui/EditProfileModal';

const LIMIT = 10; // Clean 10 items for visual space

// ─── Custom Inline SVGs for Flawless Compilation ───
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



export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: stats } = useUserStats();
  const { data: submissionsPage, isLoading: subsLoading, error: subsError } = useUserSubmissions(page, LIMIT);

  // Local-storage backed interactive profile data (allows custom bio, full name, location!)
  const [fullName, setFullName] = useState(() => {
    return localStorage.getItem('profile_fullname') || 'Mannu Kumar thakur';
  });
  const [bio, setBio] = useState(() => {
    return localStorage.getItem('profile_bio') || 'B.Tech CE | I breathe brackets & bugs | From Brute Force to Optimised one.';
  });
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('profile_location') || 'India';
  });

  const [editOpen, setEditOpen] = useState(false);

  // Sync state reactively when localStorage is updated by EditProfileModal
  useEffect(() => {
    const handleLocalUpdate = () => {
      setFullName(localStorage.getItem('profile_fullname') || 'Mannu Kumar thakur');
      setBio(localStorage.getItem('profile_bio') || 'B.Tech CE | I breathe brackets & bugs | From Brute Force to Optimised one.');
      setLocation(localStorage.getItem('profile_location') || 'India');
    };
    window.addEventListener('profile_local_updated', handleLocalUpdate);
    return () => {
      window.removeEventListener('profile_local_updated', handleLocalUpdate);
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const totalPages = submissionsPage?.pages ?? 1;
  const items = submissionsPage?.items ?? [];

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Solved Stats variables with LeetCode totals
  const totalEasy = stats?.easy_solved ?? 1;
  const totalMed = stats?.medium_solved ?? 2;
  const totalHard = stats?.hard_solved ?? 0;
  const totalSolved = stats?.total_solved ?? (totalEasy + totalMed + totalHard);

  // Donut Arc Maths
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  // Ratio calculations
  const easyRatio = totalEasy / 947;
  const medRatio = totalMed / 2063;
  const hardRatio = totalHard / 938;

  const easyStrokeOffset = circumference - (circumference * easyRatio);
  const medStrokeOffset = circumference - (circumference * medRatio);
  const hardStrokeOffset = circumference - (circumference * hardRatio);

  // ─── Heatmap: Sunday-aligned 53-week grid (matches GitHub contribution graph) ───
  // Today (end anchor)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Saturday of the current week (day 6)
  // JS getDay(): 0=Sun, 1=Mon … 6=Sat
  const todayDow = today.getDay(); // 0–6
  const daysToSaturday = 6 - todayDow; // how many days until this week's Saturday
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + daysToSaturday);

  // The grid covers 53 full Sun-to-Sat columns.
  // gridStart = 53 weeks before gridEnd's Sunday, i.e. 53*7 - 1 days before gridEnd
  const COLS = 53;
  const DAYS = 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - (COLS * DAYS - 1));
  // gridStart is now a Sunday

  const formatYYYYMMDD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Color tiers
  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return ''; // transparent — rendered as invisible
    if (count === 0) return 'bg-[#161b22]/50 border border-white/[0.03]';
    if (count === 1) return 'bg-emerald-900/70 border border-emerald-700/30';
    if (count === 2) return 'bg-emerald-700/70 border border-emerald-600/40';
    if (count === 3) return 'bg-emerald-500/80 border border-emerald-400/50';
    if (count <= 6)  return 'bg-emerald-400 border border-emerald-300/60';
    return 'bg-emerald-300 border border-emerald-200/80'; // 7+ submissions/day
  };

  // Month labels: placed at the Sunday column where a new month starts
  const monthLabels: { col: number; label: string }[] = [];
  let prevMonthStr = '';
  for (let w = 0; w < COLS; w++) {
    const sunday = new Date(gridStart);
    sunday.setDate(gridStart.getDate() + w * 7);
    const mStr = sunday.toLocaleDateString('en-US', { month: 'short' });
    if (mStr !== prevMonthStr) {
      // Only add if there is enough space from the previous label (at least 2 cols gap)
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || (w - prev.col) >= 2) {
        monthLabels.push({ col: w, label: mStr });
        prevMonthStr = mStr;
      }
    }
  }

  // Tooltip state for heatmap cells
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Sum actual database submissions in past year
  const activeSubmissionsCount = stats?.submission_activity 
    ? Object.values(stats.submission_activity).reduce((a, b) => a + b, 0)
    : 0;

  // Real active days (unique days with submission)
  const realActiveDays = stats?.submission_activity
    ? Object.keys(stats.submission_activity).length
    : 0;

  // Real streaks from user stats
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;

  // Real points accumulated
  const accumulatedScore = stats?.total_score ?? 0;

  return (
    <div className="space-y-6 pb-12 select-none">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ══════════════════════ LEFT COLUMN: PROFILE CARD ══════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Main Coder Info Card */}
          <div className="bg-dark-panel border border-white/[0.04] rounded-2xl p-5 relative overflow-hidden flex flex-col items-center sm:items-start text-center sm:text-left gap-4 shadow-xl">
            
            {/* Avatar & Edit button */}
            <div className="relative self-center sm:self-start">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-20 h-20 rounded-2xl object-cover ring-1 ring-white/[0.08] shadow-md shadow-black/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-3xl font-black text-white ring-1 ring-white/[0.08] shadow-md shadow-black/40">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online pulse dot overlay */}
              <span className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-dark-panel"></span>
              </span>
            </div>

            {/* Title / Info block */}
            <div className="space-y-1 w-full">
              <h2 className="text-lg font-bold text-gray-100 flex items-center justify-center sm:justify-start gap-1">
                {fullName}
              </h2>

              <p className="text-xs text-gray-500 font-mono">@{user.username}</p>
            </div>

            {/* Description/Bio */}
            <div className="w-full pt-1.5 text-xs leading-relaxed text-gray-400 font-medium border-t border-white/[0.04]">
              <p className="italic text-gray-400/90 whitespace-pre-wrap">{bio}</p>
            </div>

            {/* Edit Profile trigger */}
            <div className="w-full pt-1">
              <button
                onClick={() => setEditOpen(true)}
                className="w-full py-1.5 bg-[#2cbb5d]/10 hover:bg-[#2cbb5d]/20 text-[#2cbb5d] border border-[#2cbb5d]/20 transition-all rounded-lg text-xs font-semibold text-center cursor-pointer"
              >
                Edit Profile
              </button>
            </div>

            {/* Meta details list (clean platform label links only, no URL text) */}
            <div className="w-full space-y-3 pt-3 border-t border-white/[0.04] text-xs text-gray-400 font-semibold">
              
              {/* Location */}
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-gray-300 font-medium">{location}</span>
              </div>

              {/* GitHub Link */}
              <div className="flex items-center gap-2.5">
                <GithubIcon className="w-4 h-4 text-gray-500 shrink-0" />
                {user.githubUrl ? (
                  <a
                    href={user.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors font-semibold"
                  >
                    GitHub
                  </a>
                ) : (
                  <span className="text-gray-600 font-medium">GitHub</span>
                )}
              </div>

              {/* LeetCode Link */}
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-orange-500/70 shrink-0" />
                {user.leetcodeUrl ? (
                  <a
                    href={user.leetcodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors font-semibold"
                  >
                    LeetCode
                  </a>
                ) : (
                  <span className="text-gray-600 font-medium">LeetCode</span>
                )}
              </div>

              {/* LinkedIn Link */}
              <div className="flex items-center gap-2.5">
                <LinkedInIcon className="w-4 h-4 text-blue-500/70 shrink-0" />
                {user.linkedinUrl ? (
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors font-semibold"
                  >
                    LinkedIn
                  </a>
                ) : (
                  <span className="text-gray-600 font-medium">LinkedIn</span>
                )}
              </div>
            </div>

            {/* Muted Joined Date block */}
            <div className="w-full text-center sm:text-left select-none pt-2.5 border-t border-white/[0.04] mt-1.5 text-[10px] text-gray-500 font-semibold tracking-wide">
              Joined {joinDate}
            </div>

          </div>

        </div>


        {/* ══════════════════════ RIGHT COLUMN: LEETCODE GRIDS ══════════════════════ */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* TOP SECTION: PROBLEMS DIAL & POINTS / STREAKS SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Solved Dial card */}
            <div className="md:col-span-2 bg-dark-panel border border-white/[0.04] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl select-none">
              
              {/* Dial block */}
              <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Track base */}
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="5.5" />
                  
                  {/* Segments: Easy, Medium, Hard mapped proportionally */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#10b981" // Easy
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={easyStrokeOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#f59e0b" // Medium
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={medStrokeOffset}
                    strokeLinecap="round"
                    transform="rotate(35 50 50)"
                  />
                  
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#ef4444" // Hard
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={hardStrokeOffset}
                    strokeLinecap="round"
                    transform="rotate(125 50 50)"
                  />
                </svg>

                {/* Central stats text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pt-0.5">
                  <span className="text-lg font-black text-white font-mono leading-none">{totalSolved}</span>
                  <div className="flex items-center gap-0.5 text-[8.5px] text-emerald-400 font-bold mt-1 uppercase">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Solved
                  </div>
                </div>
              </div>

              {/* Difficulty stats list */}
              <div className="flex-1 w-full space-y-3.5 text-xs select-none">
                
                {/* Easy Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-[11px] font-bold">
                    <span className="text-gray-400">Easy</span>
                    <span className="font-mono text-gray-200">{totalEasy}</span>
                  </div>
                  <div className="h-1.5 bg-[#1c1d24] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${easyRatio * 100}%` }} />
                  </div>
                </div>

                {/* Medium Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-[11px] font-bold">
                    <span className="text-gray-400">Medium</span>
                    <span className="font-mono text-gray-200">{totalMed}</span>
                  </div>
                  <div className="h-1.5 bg-[#1c1d24] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${medRatio * 100}%` }} />
                  </div>
                </div>

                {/* Hard Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-[11px] font-bold">
                    <span className="text-gray-400">Hard</span>
                    <span className="font-mono text-gray-200">{totalHard}</span>
                  </div>
                  <div className="h-1.5 bg-[#1c1d24] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${hardRatio * 100}%` }} />
                  </div>
                </div>

              </div>

            </div>

            {/* Total Points & Achievements Card */}
            <div className="bg-dark-panel border border-white/[0.04] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between select-none">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Points accumulated</span>
                  <h4 className="text-2xl font-black text-amber-400 font-mono mt-1 flex items-baseline gap-1">
                    {accumulatedScore}
                    <span className="text-xs text-gray-400 font-bold uppercase">pts</span>
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow shadow-amber-500/5">
                  <Star className="w-5 h-5 fill-amber-500/20 animate-pulse" />
                </div>
              </div>

              {/* Streaks details */}
              <div className="space-y-2 py-2.5 border-t border-b border-white/[0.04] my-2 text-xs select-none">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    Current Streak
                  </span>
                  <span className="font-mono text-gray-200 font-bold text-sm">
                    {currentStreak} <span className="text-[10px] text-gray-500 font-medium">days</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Max Streak
                  </span>
                  <span className="font-mono text-gray-200 font-bold text-sm">
                    {bestStreak} <span className="text-[10px] text-gray-500 font-medium">days</span>
                  </span>
                </div>
              </div>

              {/* Points calculation subtext */}
              <div className="text-[10px] text-gray-500 font-semibold leading-relaxed select-none">
                Score formula:<br />
                <span className="text-gray-300 font-bold block mt-0.5">Base + speed bonus for each accepted solution</span>
              </div>
            </div>

            {/* Battles Statistics Card */}
            <div className="bg-dark-panel border border-white/[0.04] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between select-none">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Battles Played</span>
                  <h4 className="text-2xl font-black text-blue-400 font-mono mt-1 flex items-baseline gap-1">
                    {stats?.battles_played ?? 0}
                    <span className="text-xs text-gray-400 font-bold uppercase">matches</span>
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow shadow-blue-500/5">
                  <Swords className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              {/* Battle stats details */}
              <div className="space-y-2 py-2.5 border-t border-b border-white/[0.04] my-2 text-xs select-none">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Battles Won
                  </span>
                  <span className="font-mono text-gray-200 font-bold text-sm">
                    {stats?.battles_won ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Win Rate
                  </span>
                  <span className="font-mono text-gray-200 font-bold text-sm">
                    {stats?.battles_played && stats.battles_played > 0
                      ? ((stats.battles_won ?? 0) / stats.battles_played * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
              </div>

              {/* Subtext */}
              <div className="text-[10px] text-gray-500 font-semibold leading-relaxed select-none">
                Win Rate is calculated from successfully solved battle rounds.
              </div>
            </div>

          </div>

          {/* BOTTOM ROW: HEATMAP CALENDAR — Sunday-aligned 53-week grid */}
          <div className="bg-dark-panel border border-white/[0.04] rounded-2xl p-5 flex flex-col gap-3 shadow-xl select-none">
            
            {/* Heatmap header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-200">
                  <span className="text-gray-100 font-black font-mono">
                    {activeSubmissionsCount.toLocaleString()}
                  </span>{' '}submissions in the past one year
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 select-none">
                <span>Total active days: <strong className="text-gray-300 font-mono">{realActiveDays}</strong></span>
                <span>Max streak: <strong className="text-gray-300 font-mono">{bestStreak}</strong></span>
                <div className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-[10px] text-gray-400">Current</div>
              </div>
            </div>

            {/* Grid wrapper: weekday labels + columns */}
            <div
              ref={heatmapRef}
              className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent relative"
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Floating tooltip */}
              {tooltip && (
                <div
                  className="pointer-events-none fixed z-50 px-2.5 py-1.5 rounded-lg bg-[#1c1d27] border border-white/[0.08] text-[11px] font-semibold text-gray-200 shadow-xl whitespace-nowrap"
                  style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
                >
                  {tooltip.text}
                </div>
              )}

              <div className="flex gap-0 min-w-max">
                {/* Weekday labels column */}
                <div className="flex flex-col gap-[3px] mr-[5px] pt-[0px]">
                  {/* 7 rows: Sun Mon Tue Wed Thu Fri Sat — show Mon, Wed, Fri */}
                  {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                    <div
                      key={i}
                      className="h-[11px] text-[8.5px] font-bold text-gray-600 leading-[11px]"
                      style={{ lineHeight: '11px' }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* 53 week columns */}
                <div className="flex flex-col">
                  {/* Month labels row — sits above the grid columns */}
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

                  {/* The actual grid: columns x rows */}
                  <div className="flex gap-[3px]">
                    {Array.from({ length: COLS }).map((_, w) => (
                      <div key={w} className="flex flex-col gap-[3px]">
                        {Array.from({ length: DAYS }).map((_, d) => {
                          // Cell date = gridStart + (w * 7 + d) days
                          const cellDate = new Date(gridStart);
                          cellDate.setDate(gridStart.getDate() + w * 7 + d);

                          const isFuture = cellDate > today;
                          const dateStr = formatYYYYMMDD(cellDate);
                          const count = isFuture ? 0 : (stats?.submission_activity?.[dateStr] ?? 0);

                          const dateLabel = cellDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });

                          if (isFuture) {
                            return (
                              <div
                                key={d}
                                className="w-[11px] h-[11px] rounded-sm opacity-0"
                              />
                            );
                          }

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

            {/* Legend */}
            <div className="flex items-center justify-between text-[10px] text-gray-600 font-semibold pt-1 border-t border-white/[0.04]">
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

          </div>

        </div>

      </div>


      {/* ══════════════════════ BOTTOM BLOCK: SUBMISSION HISTORY ══════════════════════ */}
      <div className="flex flex-col gap-4">
        
        <div className="flex items-center justify-between select-none pt-4 border-t border-white/[0.04]">
          <h2 className="text-base font-bold text-gray-200">
            Recent Submission History
            {submissionsPage && (
              <span className="ml-2 text-xs font-normal text-gray-500 font-mono">
                ({submissionsPage.total} total)
              </span>
            )}
          </h2>
        </div>

        <SubmissionHistoryTable
          items={items}
          isLoading={subsLoading}
          error={subsError}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between select-none mt-2">
            <button
              id="profile-subs-prev"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
                page <= 1
                  ? 'border-white/[0.04] text-gray-600 cursor-not-allowed'
                  : 'border-white/[0.08] text-gray-300 hover:bg-dark-hover',
              )}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <span className="text-xs text-gray-500 font-mono">
              Page {page} of {totalPages}
            </span>

            <button
              id="profile-subs-next"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
                page >= totalPages
                  ? 'border-white/[0.04] text-gray-600 cursor-not-allowed'
                  : 'border-white/[0.08] text-gray-300 hover:bg-dark-hover',
              )}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
};
