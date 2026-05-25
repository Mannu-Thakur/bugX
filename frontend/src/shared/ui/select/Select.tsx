import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full select-text">
        {label && (
          <label className="text-xs font-medium text-gray-400 select-none">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full bg-dark-input border border-dark-border text-sm text-gray-200 rounded-md py-2 px-3 transition-colors focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 disabled:opacity-50 appearance-none cursor-pointer",
            error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark-panel text-gray-300">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="text-xs text-rose-400 font-sans mt-0.5 select-none">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
