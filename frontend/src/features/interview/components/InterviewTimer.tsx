import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface InterviewTimerProps {
  isActive: boolean;
  onTick?: (seconds: number) => void;
}

export const InterviewTimer: React.FC<InterviewTimerProps> = ({ isActive, onTick }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1;
          if (onTick) onTick(next);
          return next;
        });
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, onTick]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] select-none transition-all duration-300 ${
      isActive ? 'border-indigo-500/25 bg-indigo-500/[0.01]' : ''
    }`}>
      <Timer className={`w-3.5 h-3.5 text-white/40 ${isActive ? 'animate-pulse text-indigo-400' : ''}`} />
      <span className="font-mono text-xs font-black text-white/80 tracking-wider">
        {formatTime(seconds)}
      </span>
    </div>
  );
};
