import type { ReactNode } from 'react';

interface ResumeSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ResumeSection({ title, icon, children, className = '' }: ResumeSectionProps) {
  return (
    <div className={`resume-section ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700/50">
        <span className="text-indigo-400">{icon}</span>
        <h2 className="text-base font-semibold text-gray-200 tracking-wide uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}
