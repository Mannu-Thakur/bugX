import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Trophy, Clock, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../../shared/lib/cn';
import { useAuth } from '../../auth/useAuth';

interface BattleHeaderProps {
  mode: 'local' | 'invite';
  roomId?: string;
  timeLeft: number;
  isTimeLow: boolean;
  formatTime: (sec: number) => string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onConcede: () => void;
  showProblem: boolean;
  onToggleProblem: () => void;
  showScoreboard: boolean;
  onToggleScoreboard: () => void;
  isFinished?: boolean;
}

export const BattleHeader: React.FC<BattleHeaderProps> = ({
  mode,
  // roomId is passed but unused in header
  timeLeft,
  isTimeLow,
  formatTime,
  soundEnabled,
  onToggleSound,
  onConcede,
  showProblem,
  onToggleProblem,
  showScoreboard,
  onToggleScoreboard,
  isFinished = false,
}) => {
  const { user } = useAuth();
  return (
    <header className="bg-dark-panel/90 backdrop-blur-md border-b border-dark-border px-4 py-3 flex items-center justify-between select-none shrink-0 relative z-10">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <Link to="/battle" onClick={() => sessionStorage.removeItem('battleConfig')}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-dark-border/40 bg-dark-panel/40 text-xs text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors active:scale-95">
            <ArrowLeft className="w-3.5 h-3.5" /> Leave
          </button>
        </Link>

        <button
          onClick={onToggleProblem}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all select-none active:scale-95",
            showProblem
              ? "bg-dark-panel-active border-dark-border text-gray-100"
              : "bg-dark-panel border-dark-border/50 text-gray-400 hover:bg-dark-hover hover:text-gray-200"
          )}
          aria-label="Toggle Problem Panel"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{showProblem ? 'Hide Problem' : 'Show Problem'}</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-semibold text-gray-400 font-sans select-all">
              {user.username}
            </span>
            {mode === 'invite' && (
              <>
                <div className="w-[1px] h-3.5 bg-dark-border mx-1" />
                <button
                  onClick={onToggleScoreboard}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all select-none active:scale-95",
                    showScoreboard
                      ? "bg-dark-panel-active border-dark-border text-gray-100"
                      : "bg-dark-panel border-dark-border/50 text-gray-400 hover:bg-dark-hover hover:text-gray-200"
                  )}
                  aria-label="Toggle Scoreboard Panel"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{showScoreboard ? 'Hide Scores' : 'Show Scores'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center shared Timer */}
      <div className="flex items-center gap-2 select-none">
        <Clock className={cn("w-4 h-4", isTimeLow && !isFinished ? "text-rose-400" : "text-gray-500")} />
        <span className={cn(
          "font-mono font-black text-lg tracking-wider select-none",
          isTimeLow && !isFinished ? "text-rose-450 animate-pulse" : "text-gray-100"
        )}>
          {isFinished ? '00:00' : formatTime(timeLeft)}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSound}
          className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
          title="Toggle Sound Effects"
          aria-label="Toggle Sound Effects"
        >
          {soundEnabled ? <Volume2 className="w-4.5 h-4.5 text-emerald-400" /> : <VolumeX className="w-4.5 h-4.5" />}
        </button>
        
        {!isFinished && (
          <button
            onClick={onConcede}
            className="px-3 py-1.5 text-rose-400/80 hover:text-rose-450 border border-rose-500/15 hover:border-rose-550/30 font-semibold text-xs rounded transition-all active:scale-95"
            aria-label="Concede Match"
          >
            Concede
          </button>
        )}
      </div>
    </header>
  );
};
