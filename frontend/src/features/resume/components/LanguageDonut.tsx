interface LanguageDonutProps {
  languages: { name: string; count: number; color: string }[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3572A5',
  javascript: '#f1e05a',
  typescript: '#2b7489',
  java: '#b07219',
  cpp: '#f34b7d',
  'c++': '#f34b7d',
  c: '#555555',
  go: '#00ADD8',
  rust: '#dea584',
  ruby: '#701516',
  swift: '#F05138',
  kotlin: '#A97BFF',
  csharp: '#178600',
  'c#': '#178600',
  php: '#4F5D95',
};

function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang.toLowerCase()] || '#6366f1';
}

export function LanguageDonut({ languages }: LanguageDonutProps) {
  const total = languages.reduce((s, l) => s + l.count, 0);
  if (total === 0) {
    return <p className="text-gray-500 text-sm">No submissions yet</p>;
  }

  // Build SVG donut segments (pure computation, no mutation)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const segments = languages.map((lang, i) => {
    const pct = lang.count / total;
    const dashLength = pct * circumference;
    const prevOffset = languages.slice(0, i).reduce((sum, prev) => {
      return sum + (prev.count / total) * circumference;
    }, 0);
    return {
      name: lang.name,
      count: lang.count,
      pct: Math.round(pct * 100),
      color: lang.color,
      dashArray: `${dashLength} ${circumference - dashLength}`,
      dashOffset: -prevOffset,
    };
  });

  return (
    <div className="flex items-center gap-6">
      {/* SVG Donut */}
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-300 capitalize">{seg.name}</span>
            <span className="text-gray-500 font-mono">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { getLanguageColor };
