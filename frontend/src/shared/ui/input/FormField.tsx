import React from 'react';
import { InlineError } from './InlineError';
import { cn } from '../../lib/cn';

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  className,
  children,
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full select-text", className)}>
      {label && (
        <label className="text-xs font-semibold text-gray-400 select-none flex items-center gap-0.5">
          {label}
          {required && <span className="text-rose-500 font-sans">*</span>}
        </label>
      )}
      {children}
      <InlineError message={error} />
    </div>
  );
};
