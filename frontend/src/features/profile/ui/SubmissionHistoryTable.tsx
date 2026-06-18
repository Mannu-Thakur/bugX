// Phase 5 — SubmissionHistoryTable: GitHub-style submission history
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../shared/lib/cn';
import type { SubmissionSummary } from '../api';
import { safeParseDate } from '../../../shared/lib/date';

interface SubmissionHistoryTableProps {
  items: SubmissionSummary[];
  isLoading: boolean;
  error: unknown;
}

// ─── Status badge config ───
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  ACCEPTED:      { label: 'Accepted',     dot: 'bg-emerald-400', text: 'text-emerald-400' },
  SAMPLE_PASSED: { label: 'Sample Pass',  dot: 'bg-cyan-400',    text: 'text-cyan-400'    },
  WRONG_ANSWER:  { label: 'Wrong Ans.',   dot: 'bg-rose-400',    text: 'text-rose-400'    },
  TIME_LIMIT:    { label: 'TLE',          dot: 'bg-orange-400',  text: 'text-orange-400'  },
  MEMORY_LIMIT:  { label: 'MLE',          dot: 'bg-orange-400',  text: 'text-orange-400'  },
  RUNTIME_ERROR: { label: 'Runtime Err',  dot: 'bg-red-400',     text: 'text-red-400'     },
  COMPILE_ERROR: { label: 'Compile Err',  dot: 'bg-red-400',     text: 'text-red-400'     },
  PENDING:       { label: 'Pending',      dot: 'bg-yellow-400',  text: 'text-yellow-400'  },
  RUNNING:       { label: 'Running',      dot: 'bg-yellow-400',  text: 'text-yellow-400'  },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: 'bg-gray-400', text: 'text-gray-400' };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span className={cn('text-[11px] font-semibold', cfg.text)}>
        {cfg.label}
      </span>
    </span>
  );
};

const LANG_LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JS',
  cpp: 'C++',
  java: 'Java',
};

const LangBadge: React.FC<{ lang: string }> = ({ lang }) => {
  const label = LANG_LABELS[lang.toLowerCase()] ?? lang;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/[0.03] text-gray-400 border border-white/[0.04]">
      {label}
    </span>
  );
};

const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 5 }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-3 rounded bg-white/[0.04] w-full max-w-[80px]" />
      </td>
    ))}
  </tr>
);

const formatDate = (iso: string) => {
  try {
    const d = safeParseDate(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
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
  const thClass = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/[0.04]';
  const tdClass = 'px-4 py-3 text-sm text-gray-300 whitespace-nowrap';
  const colSpan = 5;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Problem</th>
            <th className={thClass}>Language</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Runtime</th>
            <th className={cn(thClass, 'text-right')}>Date</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

          {!isLoading && !!error && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-rose-400/80">
                Failed to load submission history.
              </td>
            </tr>
          )}

          {!isLoading && !error && items.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-gray-600">
                No submissions yet — solve your first problem!
              </td>
            </tr>
          )}

          {!isLoading && !error && items.map((sub) => (
            <tr
              key={sub.id}
              className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors duration-150 group"
            >
              {/* Problem */}
              <td className={tdClass}>
                {sub.problem_slug ? (
                  <Link
                    to={`/problems/${sub.problem_slug}`}
                    className="text-gray-200 hover:text-[#4F7DFF] transition-colors font-medium text-[13px] group-hover:text-[#4F7DFF]"
                  >
                    {sub.problem_title ?? sub.problem_slug}
                  </Link>
                ) : (
                  <span className="text-gray-600 font-mono text-xs" title={`ID: ${sub.problem_id}`}>
                    {sub.problem_id.slice(0, 8)}…
                  </span>
                )}
              </td>

              {/* Language */}
              <td className={tdClass}>
                <LangBadge lang={sub.language} />
              </td>

              {/* Status */}
              <td className={tdClass}>
                <StatusBadge status={sub.status} />
              </td>

              {/* Runtime */}
              <td className={cn(tdClass, 'font-mono text-xs text-gray-500')}>
                {sub.runtime_ms != null ? (
                  <span>{sub.runtime_ms}<span className="text-gray-700 ml-0.5">ms</span></span>
                ) : (
                  <span className="text-gray-700">—</span>
                )}
              </td>

              {/* Date */}
              <td className={cn(tdClass, 'text-xs text-gray-600 text-right')}>
                {formatDate(sub.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
