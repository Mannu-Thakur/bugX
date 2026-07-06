import React from 'react';
import { cn } from '../../../shared/lib/cn';
import { BattleEditor } from './BattleEditor';
import type { BattleProblem, BattlePlayerState } from '../types/battle.types';

interface BattleSplitViewProps {
  problem: BattleProblem;
  players: BattlePlayerState[];
  onCodeChange: (playerIdx: number, code: string) => void;
  onLanguageChange: (playerIdx: number, lang: 'python' | 'javascript' | 'cpp' | 'java') => void;
  onSolve: (playerIdx: number, score: number) => void;
  soundEnabled: boolean;
  isFinished?: boolean;
}

export const BattleSplitView: React.FC<BattleSplitViewProps> = ({
  problem,
  players,
  onCodeChange,
  onLanguageChange,
  onSolve,
  soundEnabled,
  isFinished = false,
}) => {
  const p1 = players.find(p => p.player_index === 0);
  const p2 = players.find(p => p.player_index === 1);

  if (!p1 || !p2) return null;

  return (
    <div className="flex-1 flex w-full h-full bg-[#07090e] p-2 gap-2 overflow-hidden select-none">
      {/* Player 1 Pane (Left - Blue theme) */}
      <div className={cn(
        "flex-1 flex flex-col h-full rounded-xl border overflow-hidden transition-all duration-300",
        p1.solved 
          ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
          : "border-blue-500/10 focus-within:border-blue-500/25 focus-within:shadow-[0_0_12px_rgba(59,130,246,0.04)]"
      )}>
        {/* P1 Mini Header */}
        <div className="px-3 py-1.5 bg-blue-950/20 border-b border-white/[0.03] flex justify-between items-center shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
            Player 1: {p1.username}
          </span>
          <span className="text-[10px] font-mono font-bold text-gray-500">
            Score: {p1.score} PTS
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <BattleEditor
            slug={problem.slug}
            problemId={problem.id}
            code={p1.code}
            language={p1.lang}
            onChangeCode={(code) => onCodeChange(0, code)}
            onChangeLanguage={(lang) => onLanguageChange(0, lang)}
            templates={problem.templates}
            testCases={problem.sample_test_cases}
            isSolved={p1.solved}
            attempts={p1.attempts}
            myPlayerIndex={0}
            onSolve={(score) => onSolve(0, score)}
            soundEnabled={soundEnabled}
            isFinished={isFinished}
          />
        </div>
      </div>

      {/* Player 2 Pane (Right - Rose theme) */}
      <div className={cn(
        "flex-1 flex flex-col h-full rounded-xl border overflow-hidden transition-all duration-300",
        p2.solved 
          ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
          : "border-rose-500/10 focus-within:border-rose-500/25 focus-within:shadow-[0_0_12px_rgba(244,63,94,0.04)]"
      )}>
        {/* P2 Mini Header */}
        <div className="px-3 py-1.5 bg-rose-950/20 border-b border-white/[0.03] flex justify-between items-center shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
            Player 2: {p2.username}
          </span>
          <span className="text-[10px] font-mono font-bold text-gray-500">
            Score: {p2.score} PTS
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <BattleEditor
            slug={problem.slug}
            problemId={problem.id}
            code={p2.code}
            language={p2.lang}
            onChangeCode={(code) => onCodeChange(1, code)}
            onChangeLanguage={(lang) => onLanguageChange(1, lang)}
            templates={problem.templates}
            testCases={problem.sample_test_cases}
            isSolved={p2.solved}
            attempts={p2.attempts}
            myPlayerIndex={1}
            onSolve={(score) => onSolve(1, score)}
            soundEnabled={soundEnabled}
            isFinished={isFinished}
          />
        </div>
      </div>
    </div>
  );
};
