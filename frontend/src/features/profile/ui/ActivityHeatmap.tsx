// Phase 5 — ActivityHeatmap: 52-week GitHub-style activity grid shell
// Backend does NOT yet provide per-day activity data.
// This renders a placeholder grid with a clear label.
import React from 'react';
import { cn } from '../../../shared/lib/cn';
import { CalendarDays } from 'lucide-react';

interface ActivityHeatmapProps {
  lastActiveDate?: string | null;
  isLoading?: boolean;
}

const WEEKS = 52;
const DAYS = 7;

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  lastActiveDate,
  isLoading = false,
}) => {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-4">
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
      <div className="overflow-x-auto pb-1">
        {isLoading ? (
          <div className="flex gap-1">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {Array.from({ length: DAYS }).map((_, d) => (
                  <div
                    key={d}
                    className="w-3 h-3 rounded-sm bg-dark-hover animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {Array.from({ length: DAYS }).map((_, d) => (
                  <div
                    key={d}
                    className={cn(
                      'w-3 h-3 rounded-sm border border-dark-border/40',
                      'bg-dark-hover opacity-60',
                    )}
                    title="Activity data coming soon"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice */}
      <p className="text-[11px] text-gray-600 italic">
        Daily activity data coming soon — backend per-day tracking is not yet available.
      </p>
    </div>
  );
};
