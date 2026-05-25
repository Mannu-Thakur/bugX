// Phase 5 — MetricCard: single KPI display card
import React from 'react';
import { cn } from '../../../shared/lib/cn';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subLabel?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  className?: string;
}

const accentMap = {
  blue: {
    icon: 'text-blue-400',
    glow: 'shadow-blue-500/10',
    ring: 'ring-blue-500/20',
    value: 'text-blue-300',
  },
  emerald: {
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    ring: 'ring-emerald-500/20',
    value: 'text-emerald-300',
  },
  amber: {
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    ring: 'ring-amber-500/20',
    value: 'text-amber-300',
  },
  rose: {
    icon: 'text-rose-400',
    glow: 'shadow-rose-500/10',
    ring: 'ring-rose-500/20',
    value: 'text-rose-300',
  },
  violet: {
    icon: 'text-violet-400',
    glow: 'shadow-violet-500/10',
    ring: 'ring-violet-500/20',
    value: 'text-violet-300',
  },
};

/** Reusable single-metric display card used in profile and potentially elsewhere. */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  subLabel,
  accent = 'blue',
  className,
}) => {
  const c = accentMap[accent];

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 bg-dark-panel border border-dark-border rounded-xl p-5',
        'shadow-lg ring-1 transition-all duration-200 hover:ring-2',
        c.glow,
        c.ring,
        className,
      )}
    >
      {/* Icon */}
      {icon && (
        <div className={cn('w-8 h-8 flex items-center justify-center rounded-lg bg-dark-hover', c.icon)}>
          {icon}
        </div>
      )}

      {/* Value */}
      <div className={cn('text-3xl font-extrabold leading-none tracking-tight', c.value)}>
        {value}
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-gray-200">{label}</span>
        {subLabel && (
          <span className="text-xs text-gray-500">{subLabel}</span>
        )}
      </div>
    </div>
  );
};
