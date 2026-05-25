// Phase 5 — ProfilePage: full user profile with stats, history, analytics
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Calendar, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useUserStats, useUserSubmissions } from '../profile/hooks';
import { StatsCards } from './ui/StatsCards';
import { DifficultyBreakdown } from './ui/DifficultyBreakdown';
import { ScoreSummary } from './ui/ScoreSummary';
import { ActivityHeatmap } from './ui/ActivityHeatmap';
import { SubmissionHistoryTable } from './ui/SubmissionHistoryTable';
import { cn } from '../../shared/lib/cn';

const LIMIT = 20;

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: submissionsPage, isLoading: subsLoading, error: subsError } = useUserSubmissions(page, LIMIT);

  // Auth guard — redirect if not logged in
  if (!user) return <Navigate to="/login" replace />;

  const totalPages = submissionsPage?.pages ?? 1;
  const items = submissionsPage?.items ?? [];

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── User Header ─────────────────────────────────────────────────────── */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-3xl font-extrabold text-white ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10 select-none">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online dot */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-dark-panel" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{user.username}</h1>
            {user.role === 'ADMIN' && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                Admin
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-600" />
              {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-600" />
              Joined {joinDate}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-600" />
              {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats KPI Grid ───────────────────────────────────────────────────── */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* ── Analytics Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DifficultyBreakdown stats={stats} isLoading={statsLoading} />
        <ScoreSummary stats={stats} isLoading={statsLoading} />
      </div>

      {/* ── Activity Heatmap ─────────────────────────────────────────────────── */}
      <ActivityHeatmap
        lastActiveDate={stats?.last_active_date}
        isLoading={statsLoading}
      />

      {/* ── Submission History ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-200">
            Submission History
            {submissionsPage && (
              <span className="ml-2 text-xs font-normal text-gray-500">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <button
              id="profile-subs-prev"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors',
                page <= 1
                  ? 'border-dark-border text-gray-600 cursor-not-allowed'
                  : 'border-dark-border text-gray-300 hover:bg-dark-hover',
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
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors',
                page >= totalPages
                  ? 'border-dark-border text-gray-600 cursor-not-allowed'
                  : 'border-dark-border text-gray-300 hover:bg-dark-hover',
              )}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
