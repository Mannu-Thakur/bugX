import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, icon, showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="flex flex-col gap-1.5 w-full select-text">
        {label && (
          <label className="text-xs font-medium text-gray-400 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <div className="absolute left-3 text-gray-500 pointer-events-none select-none">
            {icon || <Lock className="w-4 h-4" />}
          </div>
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              "w-full bg-dark-input border border-dark-border text-sm text-gray-200 rounded-md py-2 pl-9 pr-10 transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 disabled:opacity-50 disabled:bg-dark-bg",
              error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50",
              className
            )}
            {...props}
          />
          {showToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none focus:text-blue-400 p-0.5 rounded hover:bg-dark-hover flex items-center justify-center"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 pointer-events-none select-none" />
              ) : (
                <Eye className="w-4 h-4 pointer-events-none select-none" />
              )}
            </button>
          )}
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

PasswordInput.displayName = 'PasswordInput';
