// Phase 5 — ActivityHeatmap: 52-week calendar grid based on actual submission stats
import React from 'react';
import { cn } from '../../../shared/lib/cn';
import { CalendarDays } from 'lucide-react';

interface ActivityHeatmapProps {
  lastActiveDate?: string | null;
  submissionActivity?: Record<string, number> | null;
  isLoading?: boolean;
}

const WEEKS = 52;
const DAYS = 7;

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  lastActiveDate,
  submissionActivity,
  isLoading = false,
}) => {
  // Generate date grid for the last 52 weeks (starting from 364 days ago)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (WEEKS * DAYS) + 1);

  const formatYYYYMMDD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-dark-input opacity-40 hover:opacity-100 border border-dark-border/10';
    if (count === 1) return 'bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30';
    if (count === 2) return 'bg-emerald-500/40 border border-emerald-500/50 hover:bg-emerald-500/50';
    if (count === 3) return 'bg-emerald-500/70 border border-emerald-500/80 hover:bg-emerald-500/80';
    return 'bg-emerald-500 border border-emerald-400 hover:bg-emerald-400';
  };

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-200 tracking-wide">Activity Heatmap</h3>
        </div>
        {lastActiveDate && !isLoading && (
          <span className="text-xs text-gray-500">
            Last active:{' '}
            <span className="text-gray-400 font-medium">
              {new Date(lastActiveDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex gap-1">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {Array.from({ length: DAYS }).map((_, d) => (
                  <div
                    key={d}
                    className="w-3.5 h-3.5 rounded-sm bg-dark-hover animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {Array.from({ length: DAYS }).map((_, d) => {
                  const cellDate = new Date(startDate.getTime());
                  cellDate.setDate(startDate.getDate() + (w * 7) + d);
                  const dateStr = formatYYYYMMDD(cellDate);
                  const count = submissionActivity?.[dateStr] ?? 0;
                  
                  const dateLabel = cellDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={d}
                      className={cn(
                        'w-3.5 h-3.5 rounded-sm transition-all duration-150 cursor-pointer',
                        getHeatmapColor(count)
                      )}
                      title={`${count} submission${count !== 1 ? 's' : ''} on ${dateLabel}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-dark-border/40">
        <div>
          Total submissions in past year:{' '}
          <span className="text-gray-300 font-semibold font-mono">
            {submissionActivity ? Object.values(submissionActivity).reduce((a, b) => a + b, 0) : 0}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-dark-input opacity-40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
