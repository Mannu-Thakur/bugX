import React from 'react';

interface BugXLogoProps {
  className?: string;
}

export const BugXLogo: React.FC<BugXLogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Antennae */}
      <path
        d="M38 22C36 14 30 8 26 5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M62 22C64 14 70 8 74 5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Head */}
      <path
        d="M35 30C35 19.5 65 19.5 65 30Z"
        fill="currentColor"
      />

      {/* Legs - Left */}
      <path
        d="M26 42C16 38 12 48 8 54"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M23 58C12 60 8 70 6 78"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M26 74C18 80 14 90 18 97"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Legs - Right */}
      <path
        d="M74 42C84 38 88 48 92 54"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M77 58C88 60 92 70 94 78"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M74 74C82 80 86 90 82 97"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Main Body */}
      <rect
        x="28"
        y="34"
        width="44"
        height="46"
        rx="14"
        fill="currentColor"
      />

      {/* Inner Code Symbol </ > inside beetle body */}
      <path
        d="M40 50L35 55L40 60"
        stroke="var(--bg-editor-symbol, #0a0c10)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60 50L65 55L60 60"
        stroke="var(--bg-editor-symbol, #0a0c10)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 47L48 63"
        stroke="var(--bg-editor-symbol, #0a0c10)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
