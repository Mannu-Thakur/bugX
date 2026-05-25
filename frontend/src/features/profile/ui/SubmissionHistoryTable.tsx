// Phase 5 — SubmissionHistoryTable: paginated submission history
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../shared/lib/cn';
import type { SubmissionSummary } from '../api';

interface SubmissionHistoryTableProps {
  items: SubmissionSummary[];
  isLoading: boolean;
  error: unknown;
}

const STATUS_STYLES: Record<string, string> = {
  ACCEPTED: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  SAMPLE_PASSED: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
  WRONG_ANSWER: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
  TIME_LIMIT: 'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  MEMORY_LIMIT: 'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  RUNTIME_ERROR: 'bg-red-500/15 text-red-400 ring-red-500/30',
  COMPILE_ERROR: 'bg-red-500/15 text-red-400 ring-red-500/30',
  PENDING: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
  RUNNING: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted',
  SAMPLE_PASSED: 'Sample Pass',
  WRONG_ANSWER: 'Wrong Ans.',
  TIME_LIMIT: 'TLE',
  MEMORY_LIMIT: 'MLE',
  RUNTIME_ERROR: 'Runtime Err',
  COMPILE_ERROR: 'Compile Err',
  PENDING: 'Pending',
  RUNNING: 'Running',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1',
      STATUS_STYLES[status] ?? 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
    )}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

const LangBadge: React.FC<{ lang: string }> = ({ lang }) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold',
      lang === 'python'
        ? 'bg-blue-500/15 text-blue-400'
        : 'bg-yellow-500/15 text-yellow-400',
    )}
  >
    {lang === 'python' ? 'PY' : 'JS'}
  </span>
);

const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 rounded bg-dark-hover w-full max-w-[80px]" />
      </td>
    ))}
  </tr>
);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return iso;
  }
};

export const SubmissionHistoryTable: React.FC<SubmissionHistoryTableProps> = ({
  items,
  isLoading,
  error,
}) => {
  const thClass = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500';
  const tdClass = 'px-4 py-3 text-sm text-gray-300 whitespace-nowrap';

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-dark-border bg-dark-hover/50">
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Problem</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Lang</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Score</th>
              <th className={thClass}>Runtime</th>
              <th className={thClass}>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

            {!isLoading && !!error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-rose-400">
                  Failed to load submission history. Please try again.
                </td>
              </tr>
            )}

            {!isLoading && !error && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                  No submissions yet — solve your first problem!
                </td>
              </tr>
            )}

            {!isLoading && !error && items.map((sub, idx) => (
              <tr key={sub.id} className="hover:bg-dark-hover/30 transition-colors duration-100">
                <td className={cn(tdClass, 'text-gray-600 font-mono text-xs')}>{idx + 1}</td>

                {/* Problem link */}
                <td className={tdClass}>
                  {sub.problem_slug ? (
                    <Link
                      to={`/problems/${sub.problem_slug}`}
                      className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                      {sub.problem_title ?? sub.problem_slug}
                    </Link>
                  ) : (
                    <span
                      className="text-gray-500 font-mono text-xs"
                      title={`Problem ID: ${sub.problem_id}`}
                    >
                      {sub.problem_id.slice(0, 8)}…
                    </span>
                  )}
                </td>

                {/* Type */}
                <td className={tdClass}>
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded',
                      sub.run_samples_only
                        ? 'bg-gray-500/15 text-gray-400'
                        : 'bg-blue-500/15 text-blue-400',
                    )}
                  >
                    {sub.run_samples_only ? 'Run' : 'Submit'}
                  </span>
                </td>

                <td className={tdClass}><LangBadge lang={sub.language} /></td>
                <td className={tdClass}><StatusBadge status={sub.status} /></td>

                {/* Score: hide for run-only */}
                <td className={cn(tdClass, 'font-mono text-xs')}>
                  {sub.run_samples_only ? (
                    <span className="text-gray-600">—</span>
                  ) : sub.score > 0 ? (
                    <span className="text-amber-400 font-semibold">{sub.score}</span>
                  ) : (
                    <span className="text-gray-600">0</span>
                  )}
                </td>

                {/* Runtime */}
                <td className={cn(tdClass, 'font-mono text-xs')}>
                  {sub.runtime_ms != null ? (
                    <span>{sub.runtime_ms} ms</span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>

                <td className={cn(tdClass, 'text-xs text-gray-500')}>{formatDate(sub.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
