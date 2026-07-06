import React from 'react';
import { cn } from '../../shared/lib/cn';

interface Suggestion {
  icon: string;
  label: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  { icon: '🐛', label: 'Debug my code', prompt: '/debug' },
  { icon: '💡', label: 'Give me a hint', prompt: '/hint' },
  { icon: '⏱️', label: 'Analyze complexity', prompt: '/complexity' },
  { icon: '🚀', label: 'Optimize my solution', prompt: '/optimize' },
  { icon: '📖', label: 'Explain line by line', prompt: 'Explain my code line by line in detail.' },
  { icon: '🧪', label: 'Generate test cases', prompt: 'Generate 5 edge case test cases for this problem including their expected outputs.' },
  { icon: '🔍', label: 'Why am I getting TLE?', prompt: 'Why is my solution getting Time Limit Exceeded? Identify the bottleneck and suggest how to fix it.' },
  { icon: '🔥', label: 'Find the bug', prompt: 'Find the bug in my code. Do not give the full solution, just point out what is wrong.' },
];

interface XEmptyStateProps {
  onSuggestion: (prompt: string) => void;
  isCompact?: boolean;
  isIconOnly?: boolean;
}

export const XEmptyState: React.FC<XEmptyStateProps> = ({
  onSuggestion,
  isCompact = false,
  isIconOnly = false,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-4 select-none", isIconOnly ? "py-4" : "py-8")}>
      {/* X Logo */}
      <div className={cn("relative", isIconOnly ? "mb-3" : "mb-5")}>
        <div className={cn("rounded-2xl bg-gradient-to-br from-orange-600/35 to-amber-600/20 border border-orange-500/25 flex items-center justify-center shadow-lg", isIconOnly ? "w-10 h-10" : "w-14 h-14")}>
          <span className={cn("font-black text-white tracking-tighter", isIconOnly ? "text-lg" : "text-2xl")} style={{ fontFamily: "'Inter', sans-serif" }}>X</span>
        </div>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#141416] flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
        </span>
      </div>

      <h2 className="text-[15px] font-bold text-white mb-1.5">X is ready</h2>
      {!isIconOnly && (
        <p className="text-xs text-gray-500 text-center max-w-[200px] leading-relaxed mb-6">
          Your AI coding companion. Ask anything about the problem, your code, or errors.
        </p>
      )}

      {/* Suggestion grid */}
      {!isIconOnly && (
        <div className={cn("grid gap-2 w-full max-w-xs", isCompact ? "grid-cols-1" : "grid-cols-2")}>
          {(isCompact ? SUGGESTIONS.slice(0, 4) : SUGGESTIONS).map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestion(s.prompt)}
              className="x-suggestion-card group text-left p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-orange-500/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm block leading-none">{s.icon}</span>
                <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors leading-tight block truncate">{s.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
