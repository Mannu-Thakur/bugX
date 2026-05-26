import React from 'react';
import { Activity, Flame, Star, Trophy } from 'lucide-react';
import type { SubmissionSummary, UserStats } from '../api';

interface ProgressLineChartProps {
  submissions: SubmissionSummary[];
  stats: UserStats | null | undefined;
  isLoading?: boolean;
}

interface Point {
  label: string;
  value: number;
}

const buildPoints = (submissions: SubmissionSummary[], stats: UserStats | null | undefined): Point[] => {
  const chronological = [...submissions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (chronological.length === 0) {
    const fallbackValue = stats?.total_score || stats?.total_solved || 0;
    return [
      { label: 'Start', value: 0 },
      { label: 'Now', value: fallbackValue },
    ];
  }

  let cumulativeScore = 0;
  let cumulativeSolved = 0;

  const scored = chronological.map((submission) => {
    if (submission.status === 'ACCEPTED') {
      cumulativeScore += submission.score || 0;
      cumulativeSolved += 1;
    }

    return {
      label: new Date(submission.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: cumulativeScore,
      solved: cumulativeSolved,
    };
  });

  const hasScore = scored.some((point) => point.score > 0);
  return scored.map((point) => ({
    label: point.label,
    value: hasScore ? point.score : point.solved,
  }));
};

export const ProgressLineChart: React.FC<ProgressLineChartProps> = ({ submissions, stats, isLoading }) => {
  const width = 640;
  const height = 220;
  const padding = 28;
  const points = buildPoints(submissions, stats);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const plotted = points.map((point, index) => {
    const x = padding + (points.length === 1 ? innerWidth : (index / (points.length - 1)) * innerWidth);
    const y = padding + innerHeight - (point.value / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const line = plotted.map((point) => `${point.x},${point.y}`).join(' ');
  const area = [
    `${plotted[0]?.x ?? padding},${height - padding}`,
    ...plotted.map((point) => `${point.x},${point.y}`),
    `${plotted[plotted.length - 1]?.x ?? width - padding},${height - padding}`,
  ].join(' ');

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-200">Progress Tracker</h3>
        </div>
        <span className="text-xs text-gray-500">Recent submissions</span>
      </div>

      {isLoading ? (
        <div className="h-[220px] rounded-lg bg-dark-hover animate-pulse" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-dark-border/60 bg-dark-bg/50">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Recent progress line graph">
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                x2={width - padding}
                y1={padding + innerHeight * ratio}
                y2={padding + innerHeight * ratio}
                stroke="#232329"
                strokeWidth="1"
              />
            ))}
            <polygon points={area} fill="rgba(59, 130, 246, 0.12)" />
            <polyline points={line} fill="none" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {plotted.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#0a0a0c"
                stroke="#93c5fd"
                strokeWidth="3"
              >
                <title>{`${point.label}: ${point.value}`}</title>
              </circle>
            ))}
          </svg>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-dark-border pt-4 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-500">Solved</span>
          <span className="font-semibold text-gray-100">{stats?.total_solved ?? 0}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Star className="w-4 h-4 text-amber-400" />
          <span className="text-gray-500">Score</span>
          <span className="font-semibold text-gray-100">{(stats?.total_score ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="text-gray-500">Streak</span>
          <span className="font-semibold text-gray-100">{stats?.current_streak ?? 0}d</span>
        </div>
      </div>
    </div>
  );
};
