// Phase 5 — ScoreSummary: score card with donut chart breakdown
import React from 'react';
import { Star } from 'lucide-react';
import { DonutChart } from './DonutChart';
import type { UserStats } from '../api';

interface ScoreSummaryProps {
  stats: UserStats | null | undefined;
  isLoading?: boolean;
}

export const ScoreSummary: React.FC<ScoreSummaryProps> = ({ stats, isLoading }) => {
  const s = stats ?? {
    total_score: 0, easy_solved: 0, medium_solved: 0, hard_solved: 0, total_solved: 0,
  };

  const segments = [
    { value: s.easy_solved, color: '#10b981', label: 'Easy' },
    { value: s.medium_solved, color: '#f59e0b', label: 'Medium' },
    { value: s.hard_solved, color: '#f43f5e', label: 'Hard' },
  ];

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-gray-200 tracking-wide">Score Summary</h3>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex gap-6 items-center">
          <div className="w-[120px] h-[120px] rounded-full bg-dark-hover" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-8 w-28 rounded bg-dark-hover" />
            <div className="h-4 w-40 rounded bg-dark-hover" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <DonutChart
            segments={segments}
            size={120}
            thickness={22}
            centerLabel={`${s.total_solved}\nsolved`}
          />

          {/* Legend + score */}
          <div className="flex flex-col gap-3 flex-1">
            <div>
              <p className="text-3xl font-extrabold text-amber-300 leading-none">
                {s.total_score.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Score</p>
            </div>

            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Easy', color: 'bg-emerald-500', count: s.easy_solved },
                { label: 'Medium', color: 'bg-amber-500', count: s.medium_solved },
                { label: 'Hard', color: 'bg-rose-500', count: s.hard_solved },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-gray-400 w-14">{label}</span>
                  <span className="text-gray-200 font-semibold">{count}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-600 leading-snug">
              Score = 1 pt (Easy), 3 pts (Medium), 6 pts (Hard) for each accepted solution
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
