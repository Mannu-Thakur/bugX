import { useMemo } from 'react';

interface Submission {
  id: string;
  status: string;
  created_at: string;
}

interface PerformanceTrendProps {
  submissions: Submission[];
}

/**
 * SVG line chart showing weekly submission trends over the last 12 weeks.
 * Pure SVG — no charting library.
 */
export function PerformanceTrend({ submissions }: PerformanceTrendProps) {
  const { weeks, maxVal, points, acceptedPoints } = useMemo(() => {
    const now = new Date();
    const weekCount = 12;
    const weeks: { label: string; total: number; accepted: number }[] = [];

    for (let w = weekCount - 1; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSubs = submissions.filter((s) => {
        const d = new Date(s.created_at);
        return d >= weekStart && d < weekEnd;
      });

      weeks.push({
        label: `W${weekCount - w}`,
        total: weekSubs.length,
        accepted: weekSubs.filter((s) => s.status === 'accepted').length,
      });
    }

    const maxVal = Math.max(1, ...weeks.map((w) => w.total));

    // Chart dimensions
    const chartW = 480;
    const chartH = 160;
    const padX = 0;
    const padY = 10;

    const stepX = (chartW - padX * 2) / (weeks.length - 1 || 1);

    const toPoint = (val: number, i: number) => ({
      x: padX + i * stepX,
      y: chartH - padY - ((val / maxVal) * (chartH - padY * 2)),
    });

    const points = weeks.map((w, i) => toPoint(w.total, i));
    const acceptedPoints = weeks.map((w, i) => toPoint(w.accepted, i));

    return { weeks, maxVal, points, acceptedPoints };
  }, [submissions]);

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const toAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const path = toPath(pts);
    return `${path} L${pts[pts.length - 1].x},160 L${pts[0].x},160 Z`;
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Weekly Trend</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-400 rounded-full inline-block" />
            <span className="text-gray-500">Total</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full inline-block" />
            <span className="text-gray-500">Accepted</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 480 180" className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = 160 - 10 - pct * 140;
            return (
              <g key={pct}>
                <line x1="0" y1={y} x2="480" y2={y} stroke="#1f2937" strokeWidth="0.5" />
                <text x="480" y={y - 3} fill="#4b5563" fontSize="9" textAnchor="end">
                  {Math.round(pct * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Area fills */}
          <path d={toAreaPath(points)} fill="rgba(99,102,241,0.08)" />
          <path d={toAreaPath(acceptedPoints)} fill="rgba(16,185,129,0.08)" />

          {/* Lines */}
          <path d={toPath(points)} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
          <path d={toPath(acceptedPoints)} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <circle key={`t-${i}`} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
          ))}
          {acceptedPoints.map((p, i) => (
            <circle key={`a-${i}`} cx={p.x} cy={p.y} r="3" fill="#10b981" />
          ))}

          {/* Week labels */}
          {weeks.map((w, i) => {
            const x = (480 / (weeks.length - 1 || 1)) * i;
            return (
              <text key={i} x={x} y="175" fill="#6b7280" fontSize="9" textAnchor="middle">
                {w.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
