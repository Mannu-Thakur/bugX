import React, { useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';
import type { LeaderboardEntry } from '../../shared/lib/api';
import { useAuth } from '../auth/useAuth';
import { DataTable } from '../../shared/ui/table/DataTable';
import type { Column } from '../../shared/ui/table/DataTable';
import { Badge } from '../../shared/ui/badge/Badge';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export const LeaderboardPage: React.FC = () => {
  const [period, setPeriod] = useState<'ALL' | 'WEEK'>('ALL');
  const toast = useToast();
  const { user } = useAuth();

  const handlePeriodChange = (mode: 'ALL' | 'WEEK') => {
    setPeriod(mode);
    toast.info(`Switched view to ${mode === 'ALL' ? 'All-Time' : 'Weekly'} leaderboard.`);
  };

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', period.toLowerCase()],
    queryFn: async () => {
      try {
        return await api.leaderboard.get(period === 'WEEK' ? 'week' : 'all');
      } catch {
        return [];
      }
    },
    staleTime: 30000, // Cache for 30s before considering stale
    retry: 0,
  });

  const columns: Column<LeaderboardEntry>[] = [
    {
      key: 'rank',
      header: 'Rank',
      className: 'w-[15%] text-center',
      render: (u) => {
        if (u.rank === 1) return <Badge variant="warning">🏆 1st</Badge>;
        if (u.rank === 2) return <Badge variant="default">🥈 2nd</Badge>;
        if (u.rank === 3) return <Badge variant="info">🥉 3rd</Badge>;
        return <span className="text-gray-500 font-mono font-medium">{u.rank}</span>;
      }
    },
    {
      key: 'username',
      header: 'Coder',
      className: 'w-[50%] font-semibold text-gray-200',
      render: (u) => {
        const isSelf = user && user.username === u.username;
        return (
          <span className={isSelf ? 'text-blue-400 font-bold flex items-center gap-1.5' : ''}>
            {u.username}
            {isSelf && (
              <span className="text-[9px] px-1 py-0.2 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 font-normal">
                You
              </span>
            )}
          </span>
        );
      }
    },
    {
      key: 'solved',
      header: 'Solved',
      className: 'w-[20%] font-mono text-gray-400',
    },
    {
      key: 'score',
      header: 'Total Score',
      className: 'w-[15%] text-right font-mono text-emerald-400 font-bold',
      render: (u) => `${u.score} pts`
    }
  ];

  const firstPlace = entries[0];
  const secondPlace = entries[1];
  const thirdPlace = entries[2];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-dark-border pb-4 select-none">
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-500" />
          Global Leaderboard
        </h1>
        <p className="text-xs text-gray-500 mt-1 leading-normal">
          Compare scores with top developer compilers. High score recomputed from DB using live execution runtimes.
        </p>
      </div>

      {/* Segmented Period Selection controls */}
      <div className="flex justify-between items-center bg-dark-panel p-3.5 rounded-lg border border-dark-border select-none">
        <div className="flex gap-1 bg-dark-bg p-1 rounded-md border border-dark-border">
          <button
            onClick={() => handlePeriodChange('ALL')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
              period === 'ALL' 
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All-Time
          </button>
          <button
            onClick={() => handlePeriodChange('WEEK')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
              period === 'WEEK' 
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Weekly Focus
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Cache TTL: 60s. Active scores sync instantly.</span>
        </div>
      </div>

      {/* Podium Display or Podium Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2 animate-pulse select-none">
          {/* 2nd Place Skeleton */}
          <div className="bg-dark-panel border border-dark-border/40 p-5 h-44 rounded-lg flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-dark-hover"></div>
            <div className="w-24 h-4 bg-dark-hover rounded"></div>
            <div className="w-16 h-3 bg-dark-hover rounded"></div>
            <div className="w-16 h-5 bg-dark-hover rounded-full"></div>
          </div>
          {/* 1st Place Skeleton */}
          <div className="bg-dark-panel border border-dark-border/40 p-6 h-48 rounded-lg flex flex-col items-center justify-center gap-2.5">
            <div className="w-14 h-14 rounded-full bg-dark-hover"></div>
            <div className="w-28 h-4 bg-dark-hover rounded"></div>
            <div className="w-20 h-3 bg-dark-hover rounded"></div>
            <div className="w-20 h-5 bg-dark-hover rounded-full"></div>
          </div>
          {/* 3rd Place Skeleton */}
          <div className="bg-dark-panel border border-dark-border/40 p-5 h-44 rounded-lg flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-dark-hover"></div>
            <div className="w-24 h-4 bg-dark-hover rounded"></div>
            <div className="w-16 h-3 bg-dark-hover rounded"></div>
            <div className="w-16 h-5 bg-dark-hover rounded-full"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2 select-none">
          {/* 2nd Place Podium */}
          <div className="bg-dark-panel border border-dark-border/60 p-5 rounded-lg flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group hover:border-gray-500 transition-colors">
            <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-gray-500">#2 Rank</div>
            <div className="w-12 h-12 rounded-full bg-dark-hover flex items-center justify-center text-xl shadow border border-dark-border text-gray-400">🥈</div>
            {secondPlace ? (
              <>
                <div>
                  <h4 className="font-semibold text-gray-200 truncate max-w-[150px]">{secondPlace.username}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{secondPlace.solved} solved</p>
                </div>
                <Badge>{secondPlace.score} pts</Badge>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-semibold text-gray-600">—</h4>
                  <p className="text-xs text-gray-600 mt-0.5">0 solved</p>
                </div>
                <Badge variant="default">—</Badge>
              </>
            )}
          </div>

          {/* 1st Place Podium */}
          <div className="bg-blue-950/20 border border-blue-500/20 p-6 rounded-lg flex flex-col items-center justify-center text-center gap-2.5 relative overflow-hidden group hover:border-blue-500/40 transition-colors shadow-glow-primary">
            <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-blue-400">#1 Champion</div>
            <div className="w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center text-2xl shadow-lg border border-blue-500/30 text-amber-400">🏆</div>
            {firstPlace ? (
              <>
                <div>
                  <h4 className="font-bold text-gray-100 text-base truncate max-w-[160px]">{firstPlace.username}</h4>
                  <p className="text-xs text-blue-300 font-medium mt-0.5">{firstPlace.solved} solved</p>
                </div>
                <Badge variant="warning">{firstPlace.score} pts</Badge>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-gray-600 text-base">—</h4>
                  <p className="text-xs text-gray-600 mt-0.5">0 solved</p>
                </div>
                <Badge variant="default">—</Badge>
              </>
            )}
          </div>

          {/* 3rd Place Podium */}
          <div className="bg-dark-panel border border-dark-border/60 p-5 rounded-lg flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group hover:border-gray-500 transition-colors">
            <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-gray-500">#3 Rank</div>
            <div className="w-12 h-12 rounded-full bg-dark-hover flex items-center justify-center text-xl shadow border border-dark-border text-gray-400">🥉</div>
            {thirdPlace ? (
              <>
                <div>
                  <h4 className="font-semibold text-gray-200 truncate max-w-[150px]">{thirdPlace.username}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{thirdPlace.solved} solved</p>
                </div>
                <Badge>{thirdPlace.score} pts</Badge>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-semibold text-gray-600">—</h4>
                  <p className="text-xs text-gray-600 mt-0.5">0 solved</p>
                </div>
                <Badge variant="default">—</Badge>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ranks Table */}
      <DataTable 
        columns={columns} 
        data={entries} 
        loading={isLoading}
        emptyMessage="No ranks recorded yet. Be the first to solve a problem!"
      />

    </div>
  );
};
