// Phase 5 — StatsCards: KPI grid for the profile page
import React from 'react';
import { Trophy, Star, CheckCircle2, Zap, Flame } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { UserStats } from '../api';

interface StatsCardsProps {
  stats: UserStats | null | undefined;
  isLoading: boolean;
}

const SkeletonCard: React.FC = () => (
  <div className="bg-dark-panel border border-dark-border rounded-xl p-5 animate-pulse flex flex-col gap-3">
    <div className="w-8 h-8 rounded-lg bg-dark-hover" />
    <div className="w-16 h-8 rounded bg-dark-hover" />
    <div className="w-24 h-4 rounded bg-dark-hover" />
  </div>
);

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const s = stats ?? {
    total_solved: 0, easy_solved: 0, medium_solved: 0, hard_solved: 0,
    total_score: 0, current_streak: 0, best_streak: 0, last_active_date: null,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        label="Total Solved"
        value={s.total_solved}
        icon={<Trophy className="w-4 h-4" />}
        accent="emerald"
      />
      <MetricCard
        label="Total Score"
        value={s.total_score.toLocaleString()}
        icon={<Star className="w-4 h-4" />}
        accent="amber"
      />
      <MetricCard
        label="Easy Solved"
        value={s.easy_solved}
        icon={<CheckCircle2 className="w-4 h-4" />}
        accent="emerald"
      />
      <MetricCard
        label="Medium Solved"
        value={s.medium_solved}
        icon={<Zap className="w-4 h-4" />}
        accent="amber"
      />
      <MetricCard
        label="Hard Solved"
        value={s.hard_solved}
        icon={<Flame className="w-4 h-4" />}
        accent="rose"
      />
      <MetricCard
        label="Current Streak"
        value={`${s.current_streak}d`}
        icon={<Flame className="w-4 h-4" />}
        subLabel={`Best: ${s.best_streak}d`}
        accent="violet"
      />
    </div>
  );
};
