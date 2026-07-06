import { useMemo } from 'react';

interface Submission {
  id: string;
  language: string;
  status: string;
}

interface LanguageBreakdownProps {
  submissions: Submission[];
}

const LANG_COLORS: Record<string, string> = {
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

export function LanguageBreakdown({ submissions }: LanguageBreakdownProps) {
  const languages = useMemo(() => {
    const counts: Record<string, { total: number; accepted: number }> = {};
    for (const sub of submissions) {
      if (!sub.language) continue;
      if (!counts[sub.language]) counts[sub.language] = { total: 0, accepted: 0 };
      counts[sub.language].total++;
      if (sub.status === 'accepted') counts[sub.language].accepted++;
    }
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        ...data,
        color: LANG_COLORS[name.toLowerCase()] || '#6366f1',
        rate: data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [submissions]);

  const maxTotal = Math.max(1, ...languages.map((l) => l.total));

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-5 uppercase tracking-wider">Languages</h3>
      {languages.length === 0 ? (
        <p className="text-gray-500 text-sm">No submissions yet</p>
      ) : (
        <div className="space-y-3">
          {languages.map((lang) => (
            <div key={lang.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
                  <span className="text-sm text-gray-300 capitalize">{lang.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">{lang.total} subs</span>
                  <span className="text-emerald-400 font-mono">{lang.rate}% AC</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 group-hover:brightness-125"
                  style={{
                    width: `${(lang.total / maxTotal) * 100}%`,
                    backgroundColor: lang.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
