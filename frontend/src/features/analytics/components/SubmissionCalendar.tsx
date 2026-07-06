import { useMemo } from 'react';

interface Submission {
  id: string;
  status: string;
  created_at: string;
}

interface SubmissionCalendarProps {
  submissions: Submission[];
}

/**
 * GitHub-style contribution heatmap built with pure CSS grid.
 * Shows the last 365 days of submission activity.
 */
export function SubmissionCalendar({ submissions }: SubmissionCalendarProps) {
  const { cells, maxCount, months } = useMemo(() => {
    // Build a map: dateStr → count of submissions
    const countMap: Record<string, number> = {};
    for (const sub of submissions) {
      if (!sub.created_at) continue;
      const d = new Date(sub.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      countMap[key] = (countMap[key] || 0) + 1;
    }

    // Generate last 365 days
    const today = new Date();
    const cells: { date: string; count: number; dayOfWeek: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({ date: key, count: countMap[key] || 0, dayOfWeek: d.getDay() });
    }

    // Detect month labels
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    let weekIdx = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].dayOfWeek === 0 && i > 0) weekIdx++;
      const month = parseInt(cells[i].date.split('-')[1]);
      if (month !== lastMonth) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.push({ label: monthNames[month - 1], weekIndex: weekIdx });
        lastMonth = month;
      }
    }

    const maxCount = Math.max(1, ...cells.map((c) => c.count));
    return { cells, maxCount, months };
  }, [submissions]);

  function getColor(count: number): string {
    if (count === 0) return '#161b22';
    const intensity = count / maxCount;
    if (intensity <= 0.25) return '#0e4429';
    if (intensity <= 0.5) return '#006d32';
    if (intensity <= 0.75) return '#26a641';
    return '#39d353';
  }

  // Group cells into weeks (columns)
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  for (let i = 0; i < cells.length; i++) {
    currentWeek.push(cells[i]);
    if (cells[i].dayOfWeek === 6 || i === cells.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const totalSubs = submissions.length;
  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Submission Activity</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{totalSubs} submissions</span>
          <span>{activeDays} active days</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <div className="flex gap-0.5 mb-1 ml-8">
            {months.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-gray-500"
                style={{
                  position: 'relative',
                  left: `${m.weekIndex * 13}px`,
                  marginRight: i < months.length - 1 ? `${((months[i + 1]?.weekIndex ?? m.weekIndex) - m.weekIndex) * 13 - 24}px` : 0,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[1px] items-start">
            {/* Day labels */}
            <div className="flex flex-col gap-[1px] mr-1 shrink-0">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <div key={i} className="h-[12px] flex items-center">
                  <span className="text-[10px] text-gray-600 w-6 text-right">{label}</span>
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[1px]">
                {/* Pad first week if it doesn't start on Sunday */}
                {wi === 0 &&
                  Array.from({ length: week[0]?.dayOfWeek ?? 0 }).map((_, pi) => (
                    <div key={`pad-${pi}`} className="w-[12px] h-[12px]" />
                  ))}
                {week.map((cell, ci) => (
                  <div
                    key={ci}
                    className="w-[12px] h-[12px] rounded-sm transition-colors duration-200 cursor-default"
                    style={{ backgroundColor: getColor(cell.count) }}
                    title={`${cell.date}: ${cell.count} submission${cell.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-gray-500 mr-1">Less</span>
            {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map((c) => (
              <div key={c} className="w-[12px] h-[12px] rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[10px] text-gray-500 ml-1">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
