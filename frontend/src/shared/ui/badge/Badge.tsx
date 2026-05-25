import React from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'easy' | 'medium' | 'hard' | 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold select-none border tracking-wide uppercase';
  
  const variants = {
    easy: 'bg-[#0f211b] border-emerald-500/30 text-emerald-400',
    medium: 'bg-[#291e0a] border-amber-500/30 text-amber-400',
    hard: 'bg-[#2b1618] border-rose-500/30 text-rose-400',
    
    success: 'bg-[#0f211b] border-emerald-500/30 text-emerald-400',
    danger: 'bg-[#2b1618] border-rose-500/30 text-rose-400',
    warning: 'bg-[#291e0a] border-amber-500/30 text-amber-400',
    info: 'bg-[#111e2f] border-blue-500/30 text-blue-400',
    
    default: 'bg-dark-hover border-dark-border text-gray-400',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)}>
      {children}
    </span>
  );
};
