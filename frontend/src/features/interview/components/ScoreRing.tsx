import React from 'react';

interface ScoreRingProps {
  score: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
  textColor?: string;
  glow?: boolean;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  textColor = 'text-white',
  glow = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Determine stroke color based on score
  const getStrokeColor = (val: number) => {
    if (val >= 90) return 'stroke-emerald-400';
    if (val >= 75) return 'stroke-indigo-400';
    if (val >= 60) return 'stroke-amber-400';
    return 'stroke-rose-400';
  };

  const getGlowColor = (val: number) => {
    if (val >= 90) return 'rgba(52, 211, 153, 0.2)';
    if (val >= 75) return 'rgba(129, 140, 248, 0.2)';
    if (val >= 60) return 'rgba(251, 191, 36, 0.2)';
    return 'rgba(248, 113, 113, 0.2)';
  };

  const strokeColor = getStrokeColor(score);
  const glowColor = getGlowColor(score);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-zinc-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Score Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${strokeColor} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            filter: glow ? `drop-shadow(0 0 6px ${glowColor})` : 'none'
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`font-mono text-3xl font-black tracking-tight ${textColor}`}>
          {score}
        </span>
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
          Score
        </span>
      </div>
    </div>
  );
};
