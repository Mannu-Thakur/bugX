import React from 'react';

interface BugXLogoProps {
  className?: string;
}

export const BugXLogo: React.FC<BugXLogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* X Arms */}
      <path d="M 80,120 L 120,80 L 216,184 L 184,216 Z" fill="currentColor" />
      <path d="M 432,120 L 392,80 L 296,184 L 328,216 Z" fill="currentColor" />
      <path d="M 80,392 L 120,432 L 216,328 L 184,296 Z" fill="currentColor" />
      <path d="M 432,392 L 392,432 L 296,328 L 328,296 Z" fill="currentColor" />

      {/* Legs */}
      <path d="M 220,235 L 175,220 L 150,235" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 292,235 L 337,220 L 362,235" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 220,260 L 165,260 L 145,285" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 292,260 L 347,260 L 367,285" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 224,285 L 175,310 L 165,345" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 288,285 L 337,310 L 347,345" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Antennae */}
      <path d="M 246,182 C 240,165 225,150 205,142" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M 266,182 C 272,165 287,150 307,142" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Head */}
      <path d="M 228,205 L 256,175 L 284,205 L 270,215 L 242,215 Z" fill="currentColor" />

      {/* Eyes (Glowing / Cutout effect using the editor background color) */}
      <path d="M 240,203 L 250,193 L 252,203 Z" fill="var(--bg-editor-symbol, #0a0c10)" />
      <path d="M 272,203 L 262,193 L 260,203 Z" fill="var(--bg-editor-symbol, #0a0c10)" />

      {/* Body Wing Shells */}
      <path d="M 252,218 L 226,236 C 222,239 220,244 220,249 L 220,280 C 220,283 222,286 224,288 L 252,312 Z" fill="currentColor" />
      <path d="M 260,218 L 286,236 C 290,239 292,244 292,249 L 292,280 C 292,283 290,286 288,288 L 260,312 Z" fill="currentColor" />

      {/* Inner Code Symbol </ > (Cutout effect using the editor background color) */}
      <path d="M 242,252 L 234,260 L 242,268" stroke="var(--bg-editor-symbol, #0a0c10)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 270,252 L 278,260 L 270,268" stroke="var(--bg-editor-symbol, #0a0c10)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 260,248 L 252,272" stroke="var(--bg-editor-symbol, #0a0c10)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
};
