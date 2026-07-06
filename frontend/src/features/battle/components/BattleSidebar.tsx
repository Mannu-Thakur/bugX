import React from 'react';
import { Trophy, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { safeParseDate } from '../../../shared/lib/date';
import type { BattlePlayerState } from '../types/battle.types';

interface BattleSidebarProps {
  players: BattlePlayerState[];
  myPlayerIndex: number | null;
  battleId: string;
  onClose: () => void;
  problemsCount?: number;
}

const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', dot: 'bg-amber-500' },
];

export const BattleSidebar: React.FC<BattleSidebarProps> = ({
  players,
  myPlayerIndex,
  battleId,
  onClose,
  problemsCount,
}) => {
  return (
    <div className="w-[260px] border-l border-dark-border bg-dark-panel flex flex-col h-full overflow-hidden shrink-0 select-none">
      <div className="p-3 border-b border-dark-border select-none bg-dark-bg/25 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-200">
            Live Scoreboard
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-dark-bg hover:bg-dark-hover border-none text-gray-400 hover:text-gray-250 transition-colors"
          aria-label="Close Scoreboard Panel"
        >
          <span className="text-xs font-semibold px-1">Hide</span>
        </button>
      </div>

      {/* List of all players sorted by score desc */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {[...players]
          .sort((a, b) => {
            if (a.solved !== b.solved) return a.solved ? -1 : 1;
            if (b.score !== a.score) return b.score - a.score;
            if (a.solved_at && b.solved_at) {
              const timeA = new Date(a.solved_at).getTime();
              const timeB = new Date(b.solved_at).getTime();
              if (timeA !== timeB) return timeA - timeB;
            } else if (a.solved_at) {
              return -1;
            } else if (b.solved_at) {
              return 1;
            }
            return a.player_index - b.player_index;
          })
          .map((p, idx) => {
            const color = PLAYER_COLORS[p.player_index % PLAYER_COLORS.length];
            const isMe = p.player_index === myPlayerIndex;

            return (
              <div
                key={p.player_index}
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: 'none',
                  borderRadius: '18px',
                  boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)'
                }}
                className={cn(
                  "p-3 flex flex-col gap-1.5 transition-all duration-300",
                  p.solved && "bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.04)]",
                  isMe && "ring-1 ring-[#4F7DFF]/30"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500">#{idx + 1}</span>

                  {/* Solved badge */}
                  {p.solved ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-black select-none uppercase flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> Solved
                    </span>
                  ) : (
                    <span className="text-[8px] bg-amber-500/5 text-amber-500 px-1.5 py-0.2 rounded font-bold select-none uppercase animate-pulse">
                      Coding
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-baseline gap-2">
                  <span className={cn("text-xs font-black truncate max-w-[130px] flex items-center gap-1.5", color.text)}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      p.is_active ? color.dot : "bg-gray-600"
                    )} />
                    {p.username} {isMe && <span className="text-[9px] text-[#4F7DFF] font-bold">(you)</span>}
                  </span>
                  <span className="text-sm font-black text-gray-100 shrink-0">
                    {p.score} <span className="text-[8px] text-gray-500 font-bold">PTS</span>
                  </span>
                </div>

                <div className="flex justify-between text-[8px] text-gray-500 font-bold pt-1 mt-0.5">
                  <span>ATTEMPTS: {p.attempts}</span>
                  {p.solved_at && (
                    <span className="font-mono flex items-center gap-0.5">
                      <Clock className="w-2 h-2 text-gray-500" />
                      {safeParseDate(p.solved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Level status indicators */}
                {problemsCount !== undefined && problemsCount > 1 && (
                  <div className="flex gap-1.5 pt-2 mt-1 border-t border-white/[0.03] select-none">
                    {Array.from({ length: problemsCount }).map((_, idx) => {
                      const state = p.progress?.[idx.toString()];
                      const isActive = p.active_problem_index === idx;
                      const isSolved = state?.solved;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all duration-150",
                            isSolved
                              ? "bg-emerald-550/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                              : isActive
                              ? "bg-[#4F7DFF]/25 border-[#4F7DFF]/50 text-[#4F7DFF] animate-pulse"
                              : "bg-dark-bg/40 border-white/5 text-gray-500"
                          )}
                          title={`Problem ${idx + 1}: ${isSolved ? "Solved" : isActive ? "Solving" : "Not started"}`}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="p-3 border-t border-dark-border bg-dark-bg/20 select-none text-center">
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">
          Lobby ID: {battleId.slice(0, 8)}
        </span>
      </div>
    </div>
  );
};
