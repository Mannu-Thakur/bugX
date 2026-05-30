import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Globe2,
  Link as LinkIcon,
  Mail,
  ShieldCheck,
  Terminal,
  User,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useUserStats, useUserSubmissions } from '../profile/hooks';
import { ScoreSummary } from './ui/ScoreSummary';
import { ActivityHeatmap } from './ui/ActivityHeatmap';
import { SubmissionHistoryTable } from './ui/SubmissionHistoryTable';
import { ProgressLineChart } from './ui/ProgressLineChart';
import { cn } from '../../shared/lib/cn';

const LIMIT = 20;

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: submissionsPage, isLoading: subsLoading, error: subsError } = useUserSubmissions(page, LIMIT);

  if (!user) return <Navigate to="/login" replace />;

  const totalPages = submissionsPage?.pages ?? 1;
  const items = submissionsPage?.items ?? [];

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatUrl = (href: string) => {
    try {
      const parsed = new URL(href);
      return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
      return href;
    }
  };

  const detailRows = [
    { label: 'Email', value: user.email, icon: <Mail className="w-4 h-4 text-gray-500" /> },
    { label: 'Joined', value: joinDate, icon: <Calendar className="w-4 h-4 text-gray-500" /> },
    {
      label: 'Role',
      value: user.role === 'ADMIN' ? 'Administrator' : 'Member',
      icon: <ShieldCheck className="w-4 h-4 text-gray-500" />,
    },
    { label: 'Username', value: user.username, icon: <User className="w-4 h-4 text-gray-500" /> },
  ];

  const socialLinks = [
    { label: 'LeetCode', href: user.leetcodeUrl, icon: <Code2 className="w-4 h-4 text-orange-300" /> },
    { label: 'GitHub', href: user.githubUrl, icon: <Terminal className="w-4 h-4 text-gray-300" /> },
    { label: 'LinkedIn', href: user.linkedinUrl, icon: <LinkIcon className="w-4 h-4 text-blue-300" /> },
    { label: 'Portfolio', href: user.portfolioUrl, icon: <Globe2 className="w-4 h-4 text-emerald-300" /> },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
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
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-dark-panel" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white">{user.username}</h1>
            {user.role === 'ADMIN' && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4">Profile Details</h2>
          <dl className="divide-y divide-dark-border">
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <dt className="flex items-center gap-2 text-sm text-gray-500">
                  {row.icon}
                  {row.label}
                </dt>
                <dd className="min-w-0 text-right text-sm font-medium text-gray-200 truncate">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-dark-panel border border-dark-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4">Social Profiles</h2>
          <div className="divide-y divide-dark-border">
            {socialLinks.map((link) => (
              <div key={link.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 inline-flex items-center gap-1.5 text-right text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    <span className="truncate">{formatUrl(link.href)}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm text-gray-600">Not added</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-4">
        <ProgressLineChart submissions={items} stats={stats} isLoading={statsLoading || subsLoading} />
        <ScoreSummary stats={stats} isLoading={statsLoading} />
      </div>

      <ActivityHeatmap
        lastActiveDate={stats?.last_active_date}
        submissionActivity={stats?.submission_activity}
        isLoading={statsLoading}
      />

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
