import React, { useState } from 'react';
import { Swords, Copy, Check, ChevronRight } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import type { BattlePlayerState } from '../types/battle.types';

interface BattleWaitingScreenProps {
  roomId: string;
  players: BattlePlayerState[];
  maxPlayers: number;
  myPlayerIndex: number | null;
  onStartRoom: () => void;
  isHost: boolean;
}

const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', dot: 'bg-amber-500' },
];

export const BattleWaitingScreen: React.FC<BattleWaitingScreenProps> = ({
  roomId,
  players,
  maxPlayers,
  myPlayerIndex: _myPlayerIndex,
  onStartRoom,
  isHost,
}) => {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/battle/${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Please select and copy the link manually.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-250 flex flex-col items-center justify-center p-6 select-none relative">
      {/* Dynamic background highlights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4F7DFF]/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#7A5FFF]/2 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-md w-full z-10 space-y-8 bg-[#0b0e14]/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8">
        {/* Title Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 flex items-center justify-center animate-pulse">
            <Swords className="w-5 h-5 text-[#4F7DFF]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-150 tracking-tight">Waiting for Competitors</h2>
            <p className="text-xs text-gray-500">
              Lobby status: pending · {players.length} / {maxPlayers} joined
            </p>
          </div>
        </div>

        {/* Participant list */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block border-b border-white/5 pb-1">
            Combatants List
          </label>
          <div className="divide-y divide-white/[0.03]">
            {players.map((p) => {
              const color = PLAYER_COLORS[p.player_index % PLAYER_COLORS.length];
              const isPlayerHost = p.player_index === 0;

              return (
                <div key={p.player_index} className="flex justify-between items-center py-2.5">
                  <span className={cn("text-xs font-bold flex items-center gap-2", color.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", p.is_active ? color.dot : "bg-gray-600")} />
                    {p.username}
                    {isPlayerHost && (
                      <span className="text-[8px] bg-[#4F7DFF]/10 border border-[#4F7DFF]/20 text-[#7fa8ff] px-1.5 py-0.2 rounded font-black uppercase select-none">
                        Host
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                    p.is_active
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-white/5 text-gray-500"
                  )}>
                    {p.is_active ? 'Ready' : 'Connecting'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Share Invite Code */}
        <div className="space-y-2 bg-[#0c0f16]/60 p-4 rounded-xl border border-white/[0.03]">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Share Invite Link</label>
            <span className="text-[9px] font-mono text-gray-600 select-all">Code: {roomId.slice(0, 8)}</span>
          </div>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 battle-input font-mono text-[10px]"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-dark-bg border border-dark-border hover:border-[#4F7DFF]/30 rounded-xl text-xs font-semibold transition-all text-gray-400 hover:text-gray-200 flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Panel */}
        <div className="pt-2">
          {isHost ? (
            <div className="space-y-3 w-full">
              <button
                onClick={onStartRoom}
                disabled={players.length < 2}
                className="battle-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
              >
                Start Match
                <ChevronRight className="w-4 h-4" />
              </button>
              {players.length < 2 && (
                <p className="text-[10px] text-gray-550 text-center animate-pulse">
                  Invite at least one competitor to begin the battle.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2 py-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DFF] animate-pulse" />
              Waiting for Host to start the battle...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
