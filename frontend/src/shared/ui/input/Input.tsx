import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full select-text">
        {label && (
          <label className="text-xs font-medium text-gray-400 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-gray-500 pointer-events-none select-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full bg-dark-input border border-white/[0.08] text-sm text-gray-200 rounded-md py-2 px-3 transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 disabled:opacity-50 disabled:bg-dark-bg",
              icon && "pl-9",
              error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-rose-400 font-sans mt-0.5 select-none">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
