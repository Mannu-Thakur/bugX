import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, variant = 'ghost', size = 'md', 'aria-label': ariaLabel, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:bg-dark-hover text-gray-400 hover:text-gray-200';
    
    const variants = {
      primary: 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20',
      secondary: 'bg-dark-panel hover:bg-dark-hover text-gray-300 border border-dark-border',
      ghost: 'bg-transparent hover:bg-dark-hover',
    };

    const sizes = {
      sm: 'p-1.5 text-xs',
      md: 'p-2 text-sm',
      lg: 'p-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
