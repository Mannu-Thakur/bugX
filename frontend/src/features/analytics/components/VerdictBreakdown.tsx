interface Submission {
  id: string;
  status: string;
  runtime_ms: number | null;
  memory_kb?: number | null;
}

interface VerdictBreakdownProps {
  submissions: Submission[];
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  accepted:        { label: 'Accepted',         color: '#10b981', bg: 'bg-emerald-500/10' },
  wrong_answer:    { label: 'Wrong Answer',     color: '#ef4444', bg: 'bg-red-500/10' },
  runtime_error:   { label: 'Runtime Error',    color: '#f59e0b', bg: 'bg-yellow-500/10' },
  time_limit:      { label: 'Time Limit',       color: '#f97316', bg: 'bg-orange-500/10' },
  compilation_error: { label: 'Compile Error',  color: '#8b5cf6', bg: 'bg-purple-500/10' },
  compile_error:   { label: 'Compile Error',    color: '#8b5cf6', bg: 'bg-purple-500/10' },
  memory_limit:    { label: 'Memory Limit',     color: '#ec4899', bg: 'bg-pink-500/10' },
  pending:         { label: 'Pending',          color: '#6b7280', bg: 'bg-gray-500/10' },
};

export function VerdictBreakdown({ submissions }: VerdictBreakdownProps) {
  const verdicts: { key: string; label: string; count: number; color: string; bg: string }[] = [];
  const countMap: Record<string, number> = {};

  for (const sub of submissions) {
    const status = sub.status || 'pending';
    countMap[status] = (countMap[status] || 0) + 1;
  }

  for (const [key, count] of Object.entries(countMap)) {
    const cfg = VERDICT_CONFIG[key] || { label: key.replace(/_/g, ' '), color: '#6b7280', bg: 'bg-gray-500/10' };
    verdicts.push({ key, count, ...cfg });
  }

  verdicts.sort((a, b) => b.count - a.count);
  const total = submissions.length || 1;

  // Avg runtime/memory for accepted
  const acceptedSubs = submissions.filter((s) => s.status === 'accepted');
  const avgRuntime = acceptedSubs.length > 0
    ? Math.round(acceptedSubs.reduce((s, sub) => s + (sub.runtime_ms || 0), 0) / acceptedSubs.length)
    : 0;
  const avgMemory = acceptedSubs.length > 0
    ? Math.round(acceptedSubs.reduce((s, sub) => s + (sub.memory_kb || 0), 0) / acceptedSubs.length)
    : 0;

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-5 uppercase tracking-wider">Verdict Breakdown</h3>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        {verdicts.map((v) => (
          <div
            key={v.key}
            className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(v.count / total) * 100}%`,
              backgroundColor: v.color,
              minWidth: v.count > 0 ? '4px' : '0',
            }}
            title={`${v.label}: ${v.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {verdicts.map((v) => (
          <div key={v.key} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${v.bg}`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
              <span className="text-xs capitalize" style={{ color: v.color }}>{v.label}</span>
            </div>
            <span className="text-xs font-mono font-semibold" style={{ color: v.color }}>{v.count}</span>
          </div>
        ))}
      </div>

      {/* Runtime/Memory averages */}
      {acceptedSubs.length > 0 && (
        <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-400">Avg runtime: <span className="text-indigo-400 font-mono">{avgRuntime}ms</span></span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-400">Avg memory: <span className="text-purple-400 font-mono">{Math.round(avgMemory / 1024 * 10) / 10}MB</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
