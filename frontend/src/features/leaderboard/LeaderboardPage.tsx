import React, { useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { DataTable } from '../../shared/ui/table/DataTable';
import type { Column } from '../../shared/ui/table/DataTable';
import { Badge } from '../../shared/ui/badge/Badge';
import { useToast } from '../../shared/ui/toast/ToastProvider';

interface RankUser {
  rank: number;
  username: string;
  score: number;
  solvedCount: number;
  streak: number;
}

const mockAllTime: RankUser[] = [
  { rank: 1, username: 'compilers_god', score: 2850, solvedCount: 154, streak: 45 },
  { rank: 2, username: 'binary_wizard', score: 2420, solvedCount: 130, streak: 12 },
  { rank: 3, username: 'coder_mannu', score: 2100, solvedCount: 110, streak: 23 },
  { rank: 4, username: 'stack_overflow_expert', score: 1850, solvedCount: 95, streak: 5 },
  { rank: 5, username: 'lambda_hero', score: 1620, solvedCount: 88, streak: 0 },
];

const mockWeekly: RankUser[] = [
  { rank: 1, username: 'coder_mannu', score: 850, solvedCount: 22, streak: 23 },
  { rank: 2, username: 'compilers_god', score: 620, solvedCount: 18, streak: 45 },
  { rank: 3, username: 'lambda_hero', score: 450, solvedCount: 12, streak: 0 },
  { rank: 4, username: 'binary_wizard', score: 320, solvedCount: 9, streak: 12 },
  { rank: 5, username: 'stack_overflow_expert', score: 100, solvedCount: 3, streak: 5 },
];

export const LeaderboardPage: React.FC = () => {
  const [period, setPeriod] = useState<'ALL' | 'WEEK'>('ALL');
  const toast = useToast();

  const handlePeriodChange = (mode: 'ALL' | 'WEEK') => {
    setPeriod(mode);
    toast.info(`Switched view to ${mode === 'ALL' ? 'All-Time' : 'Weekly'} leaderboard.`);
  };

  const currentData = period === 'ALL' ? mockAllTime : mockWeekly;

  const columns: Column<RankUser>[] = [
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
      className: 'w-[40%] font-semibold text-gray-200',
      render: (u) => (
        <span className={u.username === 'coder_mannu' ? 'text-blue-400 font-bold flex items-center gap-1.5' : ''}>
          {u.username}
          {u.username === 'coder_mannu' && (
            <span className="text-[9px] px-1 py-0.2 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 font-normal">
              You
            </span>
          )}
        </span>
      )
    },
    {
      key: 'solvedCount',
      header: 'Solved',
      className: 'w-[15%] font-mono text-gray-400',
    },
    {
      key: 'streak',
      header: 'Active Streak',
      className: 'w-[15%] font-mono',
      render: (u) => (
        <span className={u.streak > 0 ? 'text-amber-500' : 'text-gray-600'}>
          {u.streak > 0 ? `🔥 ${u.streak} days` : '0 days'}
        </span>
      )
    },
    {
      key: 'score',
      header: 'Total Score',
      className: 'w-[15%] text-right font-mono text-emerald-400 font-bold',
      render: (u) => `${u.score} pts`
    }
  ];

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

      {/* Podium Display mock for top 3 users */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2 select-none">
        {/* 2nd Place Podium */}
        <div className="bg-dark-panel border border-dark-border/60 p-5 rounded-lg flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group hover:border-gray-500 transition-colors">
          <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-gray-500">#2 Rank</div>
          <div className="w-12 h-12 rounded-full bg-dark-hover flex items-center justify-center text-xl shadow border border-dark-border text-gray-400">🥈</div>
          <div>
            <h4 className="font-semibold text-gray-200">{period === 'ALL' ? 'binary_wizard' : 'compilers_god'}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{period === 'ALL' ? '130 solved' : '18 solved'}</p>
          </div>
          <Badge>{period === 'ALL' ? '2420 pts' : '620 pts'}</Badge>
        </div>

        {/* 1st Place Podium */}
        <div className="bg-blue-950/20 border border-blue-500/20 p-6 rounded-lg flex flex-col items-center justify-center text-center gap-2.5 relative overflow-hidden group hover:border-blue-500/40 transition-colors shadow-glow-primary">
          <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-blue-400">#1 Champion</div>
          <div className="w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center text-2xl shadow-lg border border-blue-500/30 text-amber-400">🏆</div>
          <div>
            <h4 className="font-bold text-gray-100 text-base">{period === 'ALL' ? 'compilers_god' : 'coder_mannu'}</h4>
            <p className="text-xs text-blue-300 font-medium mt-0.5">{period === 'ALL' ? '154 solved' : '22 solved'}</p>
          </div>
          <Badge variant="warning">{period === 'ALL' ? '2850 pts' : '850 pts'}</Badge>
        </div>

        {/* 3rd Place Podium */}
        <div className="bg-dark-panel border border-dark-border/60 p-5 rounded-lg flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group hover:border-gray-500 transition-colors">
          <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-gray-500">#3 Rank</div>
          <div className="w-12 h-12 rounded-full bg-dark-hover flex items-center justify-center text-xl shadow border border-dark-border text-gray-400">🥉</div>
          <div>
            <h4 className="font-semibold text-gray-200">{period === 'ALL' ? 'coder_mannu' : 'lambda_hero'}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{period === 'ALL' ? '110 solved' : '12 solved'}</p>
          </div>
          <Badge>{period === 'ALL' ? '2100 pts' : '450 pts'}</Badge>
        </div>
      </div>

      {/* Ranks Table */}
      <DataTable columns={columns} data={currentData} />

    </div>
  );
};
