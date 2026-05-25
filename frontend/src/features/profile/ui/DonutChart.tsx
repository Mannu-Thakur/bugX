// Phase 5 — DonutChart: pure SVG donut chart
import React from 'react';

export interface DonutSegment {
  value: number;
  color: string; // hex or CSS color
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 120,
  thickness = 24,
  centerLabel,
}) => {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0; // track cumulative dash offset rotation

  const paths = segments.map((seg, idx) => {
    const ratio = total > 0 ? seg.value / total : 0;
    const dash = ratio * circumference;
    const gap = circumference - dash;
    // rotate so each segment starts after the previous
    const rotation = (offset / circumference) * 360 - 90;
    offset += dash;
    return (
      <circle
        key={idx}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={0}
        transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
        opacity={ratio === 0 ? 0 : 1}
      />
    );
  });

  // Empty state: single grey ring
  const isEmpty = total === 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-0">
        {isEmpty ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#2d3748"
            strokeWidth={thickness}
          />
        ) : (
          paths
        )}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-gray-200 text-center leading-tight">{centerLabel}</span>
        </div>
      )}
    </div>
  );
};
