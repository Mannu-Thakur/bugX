import React from 'react';
import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn("flex border-b border-dark-border select-none", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] relative duration-150 focus-visible:ring-1 focus-visible:ring-blue-500/50",
              isActive 
                ? "text-blue-500 border-blue-500 bg-blue-500/[0.02]" 
                : "text-gray-500 border-transparent hover:text-gray-300 hover:border-dark-hover"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
