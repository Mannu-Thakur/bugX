import React from 'react';
import type { EvalScores } from '../types';

interface RadarChartProps {
  scores: EvalScores;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 300 }) => {
  const axes: Array<{ key: keyof EvalScores; label: string }> = [
    { key: 'technicalAccuracy', label: 'Technical' },
    { key: 'communication', label: 'Communication' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'problemSolving', label: 'Problem Solving' },
    { key: 'optimizationKnowledge', label: 'Optimization' },
    { key: 'complexityUnderstanding', label: 'Complexity' },
  ];

  const totalAxes = axes.length;
  const center = size / 2;
  const radius = size * 0.35; // leave room for labels

  // Calculate coordinates for a given index and value (0-10)
  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    // value is scaled to 0-10, so divide by 10
    const distance = (value / 10) * radius;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  // Generate web background polygons (grids)
  const grids = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale, gIdx) => {
    const points = Array.from({ length: totalAxes }, (_, idx) => {
      const { x, y } = getCoordinates(idx, scale * 10);
      return `${x},${y}`;
    }).join(' ');

    return (
      <polygon
        key={gIdx}
        points={points}
        className="stroke-zinc-800 fill-transparent"
        strokeWidth="1"
      />
    );
  });

  // Axis lines
  const axisLines = Array.from({ length: totalAxes }, (_, idx) => {
    const start = { x: center, y: center };
    const end = getCoordinates(idx, 10);
    return (
      <line
        key={idx}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        className="stroke-zinc-800"
        strokeWidth="1"
      />
    );
  });

  // User score points polygon
  const scorePoints = axes.map((axis, idx) => {
    const scoreVal = scores[axis.key] ?? 5;
    const { x, y } = getCoordinates(idx, scoreVal);
    return `${x},${y}`;
  }).join(' ');

  // Labels
  const labels = axes.map((axis, idx) => {
    const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
    // Push labels slightly outside the max radius
    const labelRadius = radius + 22;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);

    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
    if (Math.cos(angle) > 0.1) textAnchor = 'start';
    if (Math.cos(angle) < -0.1) textAnchor = 'end';

    let dy = '0.35em';
    if (Math.sin(angle) > 0.8) dy = '0.8em';
    if (Math.sin(angle) < -0.8) dy = '-0.2em';

    return (
      <text
        key={idx}
        x={x}
        y={y}
        textAnchor={textAnchor}
        dy={dy}
        className="fill-zinc-400 font-sans font-bold text-[10px] uppercase tracking-wider"
      >
        {axis.label}
      </text>
    );
  });

  return (
    <div className="flex items-center justify-center p-2">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grids */}
        {grids}

        {/* Axis lines */}
        {axisLines}

        {/* Labels */}
        {labels}

        {/* Scores Area */}
        <polygon
          points={scorePoints}
          className="fill-indigo-500/25 stroke-indigo-400"
          strokeWidth="2"
        />

        {/* Interactive points */}
        {axes.map((axis, idx) => {
          const scoreVal = scores[axis.key] ?? 5;
          const { x, y } = getCoordinates(idx, scoreVal);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="4"
              className="fill-indigo-300 stroke-zinc-950"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
};
