import React, { useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';
import type { LeaderboardEntry } from '../../shared/lib/api';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { Link } from 'react-router-dom';

export const LeaderboardPage: React.FC = () => {
  const [period, setPeriod] = useState<'ALL' | 'WEEK'>('ALL');
  const toast = useToast();
  const { user } = useAuth();

  const handlePeriodChange = (mode: 'ALL' | 'WEEK') => {
    setPeriod(mode);
    toast.info(`Switched view to ${mode === 'ALL' ? 'All-Time' : 'Weekly'} leaderboard.`);
  };

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', period.toLowerCase()],
    queryFn: async () => {
      try {
        return await api.leaderboard.get(period === 'WEEK' ? 'week' : 'all');
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    retry: 0,
  });

  const firstPlace = entries[0] || null;
  const secondPlace = entries[1] || null;
  const thirdPlace = entries[2] || null;

  // Find logged in user ranking details
  const currentUserIndex = user ? entries.findIndex(e => e.username === user.username) : -1;
  const currentUserEntry = currentUserIndex !== -1 ? entries[currentUserIndex] : null;

  // Compute competitive target
  let competitorDistanceText = '';
  let competitorTargetName = '';
  if (user && !isLoading) {
    if (currentUserIndex === 0) {
      const challenger = entries[1];
      if (challenger) {
        const lead = entries[0].score - challenger.score;
        competitorDistanceText = `Leading by ${lead} pts`;
        competitorTargetName = challenger.username;
      }
    } else if (currentUserIndex > 0) {
      const target = entries[currentUserIndex - 1];
      const diff = target.score - entries[currentUserIndex].score;
      competitorDistanceText = `${diff} pts behind`;
      competitorTargetName = target.username;
    }
  }

  // Get initials for profile placeholder
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full text-gray-200 font-sans select-none pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">

        {/* ── LEADERBOARD HERO ────────────────────────────── */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-[#4F7DFF] to-[#7A5FFF] opacity-60 rounded-t-2xl" />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 select-none">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9CA3AF]/50">
              Competitive Standings
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-1">
              Global Rankings
            </h1>
            <p className="text-sm text-[#9CA3AF]/70 max-w-md leading-relaxed">
              Compete. Climb. Defend your position.
            </p>
          </div>

          {/* Toggle Period selector */}
          <div className="flex bg-[#0B0E14]/80 p-0.5 rounded-lg border border-white/[0.04] self-start md:self-auto select-none">
            <button
              onClick={() => handlePeriodChange('ALL')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                period === 'ALL'
                  ? 'bg-[#4F7DFF] text-white shadow-[0_2px_10px_rgba(79,125,255,0.2)]'
                  : 'text-[#9CA3AF]/60 hover:text-white'
              }`}
            >
              All-Time
            </button>
            <button
              onClick={() => handlePeriodChange('WEEK')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                period === 'WEEK'
                  ? 'bg-[#4F7DFF] text-white shadow-[0_2px_10px_rgba(79,125,255,0.2)]'
                  : 'text-[#9CA3AF]/60 hover:text-white'
              }`}
            >
              Weekly Focus
            </button>
          </div>
          </div>
        </div>

        {/* ── TOP 3 PODIUM (VISUAL CENTERPIECE) ───────────── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end pb-2 animate-pulse select-none">
            <div className="order-2 sm:order-1 bg-white/[0.02] border border-white/[0.03] rounded-xl h-[180px] sm:h-[210px]"></div>
            <div className="order-1 sm:order-2 bg-white/[0.03] border border-white/[0.04] rounded-2xl h-[210px] sm:h-[240px]"></div>
            <div className="order-3 bg-white/[0.02] border border-white/[0.03] rounded-xl h-[165px] sm:h-[195px]"></div>
          </div>
        ) : entries.length > 0 ? (
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6 items-end select-none">
            
            {/* #2 Challenger Card */}
            {secondPlace ? (
              <div className="order-2 sm:order-1 w-full bg-[#0B0E14]/40 border border-white/[0.04] rounded-xl p-5 flex flex-col justify-between items-center text-center h-[180px] sm:h-[210px] transition-all duration-300 hover:border-white/[0.08] hover:bg-[#0b0e14]/60">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#9CA3AF]/50 uppercase tracking-[0.2em] mb-3">#2 Rank</span>
                  <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-[10px] font-bold text-gray-300 mb-2">
                    {getInitials(secondPlace.username)}
                  </div>
                  <h4 className="font-semibold text-white/95 text-sm tracking-tight w-full break-all px-2">
                    {secondPlace.username}
                  </h4>
                  <p className="text-[10.5px] text-[#9CA3AF]/50 font-mono mt-0.5">{secondPlace.solved} solved</p>
                </div>
                <span className="text-xs font-medium text-white/80 bg-white/[0.03] border border-white/[0.04] px-2.5 py-0.5 rounded-full font-mono">
                  {secondPlace.score.toLocaleString()} pts
                </span>
              </div>
            ) : (
              <div className="order-2 sm:order-1 w-full bg-transparent border border-dashed border-white/[0.04] rounded-xl h-[180px] sm:h-[210px] flex flex-col items-center justify-center text-center opacity-40">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">#2 Rank</span>
                <span className="text-xs text-gray-600">Vacant</span>
              </div>
            )}

            {/* #1 Champion Card (Centered & Elevated) */}
            {firstPlace ? (
              <div className="order-1 sm:order-2 w-full bg-[#0B0E14]/70 border border-[#4F7DFF]/25 shadow-[0_8px_30px_rgba(79,125,255,0.06)] rounded-2xl p-6 flex flex-col justify-between items-center text-center h-[210px] sm:h-[240px] transition-all duration-300 hover:border-[#4F7DFF]/35">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#4F7DFF] uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-[#4F7DFF]" /> #1 Champion
                  </span>
                  <div className="w-12 h-12 rounded-full bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 flex items-center justify-center text-xs font-bold text-[#4F7DFF] mb-2 shadow-[0_0_15px_rgba(79,125,255,0.1)]">
                    {getInitials(firstPlace.username)}
                  </div>
                  <h3 className="font-extrabold text-white text-base tracking-tight w-full break-all px-2 animate-fade-in">
                    {firstPlace.username}
                  </h3>
                  <p className="text-[11px] text-[#9CA3AF]/60 font-mono mt-0.5">{firstPlace.solved} solved</p>
                </div>
                <span className="text-sm font-semibold text-white bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 px-3 py-1 rounded-full font-mono shadow-[0_2px_8px_rgba(79,125,255,0.1)]">
                  {firstPlace.score.toLocaleString()} pts
                </span>
              </div>
            ) : (
              <div className="order-1 sm:order-2 w-full bg-transparent border border-dashed border-[#4F7DFF]/20 rounded-2xl h-[210px] sm:h-[240px] flex flex-col items-center justify-center text-center opacity-40">
                <span className="text-[10px] font-bold text-[#4F7DFF] uppercase tracking-[0.2em] mb-1">#1 Champion</span>
                <span className="text-xs text-gray-600">Vacant</span>
              </div>
            )}

            {/* #3 Challenger Card */}
            {thirdPlace ? (
              <div className="order-3 w-full bg-[#0B0E14]/40 border border-white/[0.03] rounded-xl p-5 flex flex-col justify-between items-center text-center h-[165px] sm:h-[195px] transition-all duration-300 hover:border-white/[0.08] hover:bg-[#0b0e14]/60">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#9CA3AF]/40 uppercase tracking-[0.2em] mb-2.5">#3 Rank</span>
                  <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-[10px] font-bold text-gray-400 mb-2">
                    {getInitials(thirdPlace.username)}
                  </div>
                  <h4 className="font-semibold text-white/90 text-sm tracking-tight w-full break-all px-2">
                    {thirdPlace.username}
                  </h4>
                  <p className="text-[10.5px] text-[#9CA3AF]/50 font-mono mt-0.5">{thirdPlace.solved} solved</p>
                </div>
                <span className="text-xs font-medium text-white/75 bg-white/[0.02] border border-white/[0.04] px-2.5 py-0.5 rounded-full font-mono">
                  {thirdPlace.score.toLocaleString()} pts
                </span>
              </div>
            ) : (
              <div className="order-3 w-full bg-transparent border border-dashed border-white/[0.03] rounded-xl h-[165px] sm:h-[195px] flex flex-col items-center justify-center text-center opacity-40">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1">#3 Rank</span>
                <span className="text-xs text-gray-600">Vacant</span>
              </div>
            )}

          </div>
        ) : null}
        </section>

        {/* ── PERSONAL POSITION DASHBOARD ────────────────── */}
        {!isLoading && (
          user ? (
            <div className="bg-[#0B0E14]/40 border border-white/[0.04] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 select-none transition-all duration-300 hover:border-white/[0.06]">
              {/* Stats Columns */}
              <div className="grid grid-cols-3 gap-6 sm:gap-10">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Your Rank</p>
                  <p className="text-xl font-bold text-white tracking-tight">
                    {currentUserIndex !== -1 ? `#${currentUserIndex + 1}` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Total Score</p>
                  <p className="text-xl font-mono font-bold text-[#4F7DFF] tracking-tight">
                    {currentUserEntry ? currentUserEntry.score.toLocaleString() : '0'} <span className="text-[10px] font-normal text-gray-500">pts</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Solved</p>
                  <p className="text-xl font-mono font-bold text-white tracking-tight">
                    {currentUserEntry ? currentUserEntry.solved : '0'} <span className="text-[10px] font-normal text-gray-500">problems</span>
                  </p>
                </div>
              </div>

              {/* Competitive Context / Next Target */}
              <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-lg text-xs font-medium text-gray-300 sm:self-center">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentUserIndex === 0 ? 'bg-[#4F7DFF] animate-pulse' : 'bg-[#7A5FFF]'}`} />
                <span>
                  {currentUserIndex === 0 ? (
                    competitorTargetName ? (
                      <>
                        Leading by <span className="font-semibold text-white">{entries[0].score - (entries[1]?.score || 0)} pts</span> ahead of <span className="text-[#4F7DFF] font-semibold">{competitorTargetName}</span>
                      </>
                    ) : (
                      "You are leading the board!"
                    )
                  ) : currentUserIndex > 0 ? (
                    <>
                      <span className="font-semibold text-white">{competitorDistanceText}</span> to catch up to <span className="text-[#7A5FFF] font-semibold">{competitorTargetName}</span>
                    </>
                  ) : (
                    "Not on the ladder yet. Solve problems to place!"
                  )}
                </span>
              </div>
            </div>
          ) : (
            /* Premium CTA for logged out users */
            <div className="bg-[#0B0E14]/20 border border-white/[0.04] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none transition-all duration-300 hover:border-white/[0.06]">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white/90">Join the competitive standings</h4>
                <p className="text-xs text-[#9CA3AF]/60">Register or log in to track your score, claim your rank, and challenge top developers.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-medium border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white hover:border-white/20 rounded-md transition duration-300 text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-medium border border-white/10 bg-[#4F7DFF] hover:bg-[#6B8FFF] text-white rounded-md shadow-[0_4px_20px_rgba(79,125,255,0.25)] transition duration-300 text-center"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )
        )}

        {/* ── RANKING TABLE ──────────────────────────────── */}
        {isLoading ? (
          /* Table Loading Skeleton */
          <div className="w-full border border-white/[0.04] bg-white/[0.02] rounded-xl overflow-hidden animate-pulse select-none">
            <div className="h-10 bg-white/[0.02] border-b border-white/[0.04]" />
            <div className="divide-y divide-white/[0.03]">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-16 flex items-center justify-between px-6">
                  <div className="w-8 h-4 bg-white/[0.03] rounded" />
                  <div className="w-1/3 h-4 bg-white/[0.03] rounded" />
                  <div className="w-16 h-4 bg-white/[0.03] rounded" />
                  <div className="w-16 h-4 bg-white/[0.03] rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          /* Empty State */
          <div className="w-full border border-dashed border-white/[0.05] bg-white/[0.01] rounded-2xl p-16 text-center select-none flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-gray-500">
              <Medal className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No Competitors Yet</h3>
              <p className="text-sm text-[#9CA3AF]/60 max-w-sm">
                The board is empty. Be the first to solve a problem and claim the Leaderboard Champion rank!
              </p>
            </div>
            <Link
              to="/problems"
              className="mt-2 inline-flex items-center justify-center px-4 py-2 border border-white/10 bg-[#4F7DFF] hover:bg-[#6B8FFF] text-white rounded-md text-xs font-medium shadow-[0_4px_20px_rgba(79,125,255,0.25)] transition duration-300 text-center"
            >
              Browse Problems
            </Link>
          </div>
        ) : (
          /* Bespoke Premium Table */
          <div className="w-full border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.04] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]/40 select-none">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold text-center w-[12%]">Rank</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold w-[48%]">Developer</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold text-right w-[20%]">Score</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold text-right w-[20%]">Solved</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 divide-y divide-white/[0.03]">
                  {entries.map((entry) => {
                    const isSelf = user && user.username === entry.username;
                    const isTop3 = entry.rank <= 3;
                    return (
                      <tr
                        key={entry.username}
                        className={`group transition-all duration-200 hover:bg-white/[0.015] ${
                          isSelf
                            ? 'bg-[#4F7DFF]/[0.02] border-l-2 border-l-[#4F7DFF]'
                            : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        {/* Rank Column */}
                        <td className="px-4 sm:px-6 py-4 text-center font-mono text-xs select-none">
                          {isTop3 ? (
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[11px] ${
                              entry.rank === 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              entry.rank === 2 ? 'bg-slate-400/10 text-slate-300 border border-slate-400/20' :
                              'bg-amber-700/10 text-amber-600 border border-amber-700/20'
                            }`}>
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]/40 group-hover:text-[#9CA3AF]/70 transition-colors font-medium">
                              {entry.rank}
                            </span>
                          )}
                        </td>

                        {/* Developer (Avatar + Name) */}
                        <td className="px-4 sm:px-6 py-4 font-medium text-white/90">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold select-none shrink-0 ${
                              isSelf ? 'bg-[#4F7DFF]/10 border border-[#4F7DFF]/30 text-[#4F7DFF]' :
                              isTop3 ? 'bg-[#7A5FFF]/5 border border-[#7A5FFF]/15 text-[#7A5FFF]' :
                              'bg-white/[0.02] border border-white/[0.06] text-gray-400'
                            }`}>
                              {getInitials(entry.username)}
                            </div>
                            <span className={`text-sm tracking-tight truncate max-w-[120px] sm:max-w-xs ${
                              isSelf ? 'text-white font-semibold' : 'text-gray-300 group-hover:text-white transition-colors'
                            }`}>
                              {entry.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 rounded text-[#4F7DFF] font-medium leading-none select-none shrink-0">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score (bold white) */}
                        <td className="px-4 sm:px-6 py-4 text-right font-mono text-sm text-white font-semibold">
                          {entry.score.toLocaleString()}
                        </td>

                        {/* Solved */}
                        <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs text-[#9CA3AF]/60">
                          {entry.solved} solved
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>

  );
};
