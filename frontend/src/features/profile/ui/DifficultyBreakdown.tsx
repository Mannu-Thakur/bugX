// Phase 5 — DifficultyBreakdown: horizontal CSS bar chart
import React from 'react';
import { cn } from '../../../shared/lib/cn';
import type { UserStats } from '../api';

interface DifficultyBreakdownProps {
  stats: UserStats | null | undefined;
  isLoading: boolean;
}

interface BarProps {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  bgClass: string;
}

const Bar: React.FC<BarProps> = ({ label, count, total, colorClass, bgClass }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-semibold uppercase tracking-wider', colorClass)}>{label}</span>
        <span className="text-gray-400 font-mono">{count} solved</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-dark-hover overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', bgClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-gray-600 font-mono">{pct}%</div>
    </div>
  );
};

export const DifficultyBreakdown: React.FC<DifficultyBreakdownProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 animate-pulse flex flex-col gap-4">
        <div className="w-40 h-5 rounded bg-dark-hover" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-4 w-24 rounded bg-dark-hover" />
            <div className="h-2.5 w-full rounded-full bg-dark-hover" />
          </div>
        ))}
      </div>
    );
  }

  const s = stats ?? { easy_solved: 0, medium_solved: 0, hard_solved: 0, total_solved: 0 };
  const total = s.easy_solved + s.medium_solved + s.hard_solved;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-200 tracking-wide">Difficulty Breakdown</h3>

      {total === 0 ? (
        <p className="text-sm text-gray-500 py-2">No problems solved yet — start coding!</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Bar label="Easy" count={s.easy_solved} total={total} colorClass="text-emerald-400" bgClass="bg-emerald-500" />
          <Bar label="Medium" count={s.medium_solved} total={total} colorClass="text-amber-400" bgClass="bg-amber-500" />
          <Bar label="Hard" count={s.hard_solved} total={total} colorClass="text-rose-400" bgClass="bg-rose-500" />
        </div>
      )}
    </div>
  );
};
