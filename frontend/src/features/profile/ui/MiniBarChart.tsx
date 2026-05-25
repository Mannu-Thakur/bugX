// Phase 5 — MiniBarChart: generic reusable vertical bar chart (pure CSS/div)
import React from 'react';
import { cn } from '../../../shared/lib/cn';

export interface MiniBarChartItem {
  label: string;
  value: number;
  color?: string; // tailwind bg class e.g. 'bg-blue-500'
}

interface MiniBarChartProps {
  data: MiniBarChartItem[];
  maxValue?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  maxValue,
  height = 80,
  showLabels = true,
  className,
}) => {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('flex items-end gap-1.5', className)} style={{ height }}>
      {data.map((item, idx) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={idx} className="flex flex-col items-center flex-1 gap-1" style={{ height }}>
            <div className="flex-1 w-full flex items-end">
              <div
                className={cn('w-full rounded-t transition-all duration-500', item.color ?? 'bg-blue-500')}
                style={{ height: `${pct}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            {showLabels && (
              <span className="text-[9px] text-gray-500 truncate w-full text-center">{item.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
