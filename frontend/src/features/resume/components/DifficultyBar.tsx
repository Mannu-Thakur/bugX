interface DifficultyBarProps {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export function DifficultyBar({ easy, medium, hard, total }: DifficultyBarProps) {
  const easyPct = total > 0 ? (easy / total) * 100 : 0;
  const medPct = total > 0 ? (medium / total) * 100 : 0;
  const hardPct = total > 0 ? (hard / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-16 shrink-0">Easy</span>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${easyPct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-emerald-400 w-8 text-right">{easy}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-16 shrink-0">Medium</span>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-700"
            style={{ width: `${medPct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-yellow-400 w-8 text-right">{medium}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-16 shrink-0">Hard</span>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-700"
            style={{ width: `${hardPct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-red-400 w-8 text-right">{hard}</span>
      </div>
    </div>
  );
}
