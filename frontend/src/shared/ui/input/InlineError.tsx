import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface InlineErrorProps {
  message?: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-rose-400 font-sans mt-1 animate-fade-in select-none", className)}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500/80" />
      <span>{message}</span>
    </div>
  );
};
