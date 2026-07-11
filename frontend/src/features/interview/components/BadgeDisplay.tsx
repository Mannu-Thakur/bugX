import React from 'react';
import { BADGES, type BadgeId } from '../types';

interface BadgeDisplayProps {
  badges: BadgeId[];
  size?: 'sm' | 'md';
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges, size = 'md' }) => {
  if (badges.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-zinc-650 font-medium">
        No badges earned this session.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {badges.map(badgeId => {
        const info = BADGES[badgeId];
        if (!info) return null;

        return (
          <div
            key={badgeId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-[#131316] select-none hover:bg-zinc-900 transition-colors group relative ${
              size === 'sm' ? 'text-[10px]' : 'text-xs'
            }`}
          >
            <span className="text-base group-hover:scale-110 transition-transform duration-200">
              {info.icon}
            </span>
            <div className="flex flex-col text-left">
              <span className={`font-bold leading-tight ${info.color}`}>
                {info.label}
              </span>
              <span className="text-[9px] text-zinc-500 font-medium mt-0.5">
                {info.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
