import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setToken } from '../../shared/lib/api';
import { BugXLogo } from '../../shared/ui/logo/BugXLogo';

/**
 * OAuth callback landing page.
 * Reads `?token=...` from the URL (set by the backend after OAuth),
 * stores the JWT in localStorage, and redirects to /problems.
 * On error, shows a styled error card with a link back to login.
 */
export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (token) {
      setToken(token);
      // Full page reload triggers AuthProvider session hydration
      window.location.href = '/problems';
    } else {
      setError('No authentication token received. Please try again.');
    }
  }, [searchParams]);

  /* ── Error State ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 animate-fade-in select-none">
        <div className="max-w-md w-full bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-red-900/30 flex items-center justify-center text-red-400 border border-red-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-100">Authentication Failed</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    );
  }

  /* ── Loading State ── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg text-gray-200 select-none">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-dark-border text-gray-300 p-2">
          <BugXLogo className="w-full h-full" />
        </div>
        <span className="font-sans font-bold text-xs tracking-widest text-gray-400 uppercase">
          Signing you in…
        </span>
      </div>
    </div>
  );
};
