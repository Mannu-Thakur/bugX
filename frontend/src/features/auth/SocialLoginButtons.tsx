import React from 'react';
import { ENV } from '../../shared/config/env';
import { useToast } from '../../shared/ui/toast/ToastProvider';

/* ─── Brand SVG Icons ───────────────────────────────────────────────────── */

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const LeetCodeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
  </svg>
);

/* ─── Component ─────────────────────────────────────────────────────────── */

interface SocialLoginButtonsProps {
  mode?: 'login' | 'register';
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ mode = 'login' }) => {
  const toast = useToast();

  const handleOAuth = (provider: string) => {
    window.location.href = `${ENV.API_URL}/auth/oauth/${provider}/authorize`;
  };

  const handleLeetCode = () => {
    toast.info('LeetCode login is coming soon! You can link your profile in Settings.');
  };

  const btnBase =
    'flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium ' +
    'transition-all duration-200 cursor-pointer select-none ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 focus:ring-offset-transparent';

  return (
    <div className="space-y-4 pt-1">
      {/* ── Divider ── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dark-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-dark-panel text-gray-500 lowercase">
            or {mode === 'login' ? 'sign in' : 'sign up'} with
          </span>
        </div>
      </div>

      {/* ── Social Buttons Grid ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Google */}
        <button
          id="oauth-google-btn"
          type="button"
          onClick={() => handleOAuth('google')}
          className={`${btnBase} bg-white hover:bg-gray-50 border-gray-200/80 text-gray-700 hover:shadow-md hover:shadow-blue-500/5`}
        >
          <GoogleIcon />
          <span>Google</span>
        </button>

        {/* GitHub */}
        <button
          id="oauth-github-btn"
          type="button"
          onClick={() => handleOAuth('github')}
          className={`${btnBase} bg-[#24292f] hover:bg-[#2f363d] border-gray-600/50 text-white hover:shadow-md hover:shadow-gray-500/10`}
        >
          <GitHubIcon />
          <span>GitHub</span>
        </button>

        {/* LinkedIn */}
        <button
          id="oauth-linkedin-btn"
          type="button"
          onClick={() => toast.info('LinkedIn login is coming soon!')}
          title="LinkedIn login (coming soon)"
          className={`${btnBase} bg-white/[0.02] border border-dark-border text-blue-400 hover:text-blue-300 hover:bg-white/[0.08] transition-all`}
        >
          <LinkedInIcon />
          <span>LinkedIn</span>
        </button>

        {/* LeetCode (coming soon) */}
        <button
          id="oauth-leetcode-btn"
          type="button"
          onClick={handleLeetCode}
          className={`${btnBase} bg-[#FFA116]/10 hover:bg-[#FFA116]/20 border-[#FFA116]/30 text-[#FFA116] hover:shadow-md hover:shadow-orange-500/10`}
        >
          <LeetCodeIcon />
          <span>LeetCode</span>
        </button>
      </div>
    </div>
  );
};
