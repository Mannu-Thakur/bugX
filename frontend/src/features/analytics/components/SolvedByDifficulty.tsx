interface SolvedByDifficultyProps {
  easy: number;
  medium: number;
  hard: number;
}

export function SolvedByDifficulty({ easy, medium, hard }: SolvedByDifficultyProps) {
  const total = easy + medium + hard;
  const easyPct = total > 0 ? (easy / total) * 100 : 0;
  const medPct = total > 0 ? (medium / total) * 100 : 0;
  const hardPct = total > 0 ? (hard / total) * 100 : 0;

  // SVG donut
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { label: 'Easy', value: easy, pct: easyPct, color: '#10b981', offset: 0 },
    { label: 'Medium', value: medium, pct: medPct, color: '#f59e0b', offset: easyPct },
    { label: 'Hard', value: hard, pct: hardPct, color: '#ef4444', offset: easyPct + medPct },
  ];

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-5 uppercase tracking-wider">Solved by Difficulty</h3>
      <div className="flex items-center gap-8">
        {/* Donut */}
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="#1f2937" strokeWidth="14" />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
                strokeDashoffset={-((seg.offset / 100) * circumference)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{total}</span>
            <span className="text-xs text-gray-500">solved</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-4">
          {segments.map((seg) => (
            <div key={seg.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-sm text-gray-300">{seg.label}</span>
                </div>
                <span className="text-sm font-mono font-semibold" style={{ color: seg.color }}>{seg.value}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
