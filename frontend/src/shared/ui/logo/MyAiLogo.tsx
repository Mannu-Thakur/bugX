import React from 'react';

interface MyAiLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const MyAiLogo: React.FC<MyAiLogoProps> = ({ className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="aiLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" /> {/* Purple-400 */}
          <stop offset="50%" stopColor="#818CF8" /> {/* Indigo-400 */}
          <stop offset="100%" stopColor="#60A5FA" /> {/* Blue-400 */}
        </linearGradient>
        <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Outer elegant thin dashed ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="url(#aiLogoGrad)"
        strokeWidth="1.5"
        strokeDasharray="5 5"
        opacity="0.6"
      />
      {/* Sleek, formal geometric 4-pointed sparkle */}
      <path
        d="M50 20C50 36.5 36.5 50 20 50C36.5 50 50 63.5 50 80C50 63.5 63.5 50 80 50C63.5 50 50 36.5 50 20Z"
        fill="url(#aiLogoGrad)"
        filter="url(#aiGlow)"
      />
      {/* Inner core dot representing core intelligence */}
      <circle
        cx="50"
        cy="50"
        r="4"
        fill="#FFFFFF"
        opacity="0.9"
      />
    </svg>
  );
};
