import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useAuth } from './useAuth';
import { type ApiError } from '../../shared/lib/api';
import { ENV } from '../../shared/config/env';

/* ─── Brand Icon: Google ───────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ─── Brand Icon: LinkedIn ─────────────────────────────────────────── */
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0h.003z"/>
  </svg>
);

/* ─── Brand Icon: GitHub ───────────────────────────────────────────── */
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);


/* ═══════════════════════════════════════════════════════════════════
   LoginPage
══════════════════════════════════════════════════════════════════ */
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/problems';

  const handleOAuth = (provider: string) => {
    window.location.href = `${ENV.API_URL}/auth/oauth/${provider}/authorize?remember=${rememberMe}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) newErrors.email = 'Username or email is required.';
    if (!password) newErrors.password = 'Password is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all required fields.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login({ email, password, remember: rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR' && Array.isArray(apiErr.detail)) {
        const fieldErrors: typeof errors = {};
        (apiErr.detail as Array<{ loc?: (string | number)[]; msg: string; type: string }>).forEach((d) => {
          const field = d.loc ? d.loc[d.loc.length - 1] : '';
          if (field === 'email') fieldErrors.email = d.msg;
          if (field === 'password') fieldErrors.password = d.msg;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(apiErr.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── layout: full-screen centering wrapper ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* ── Card ─────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-[460px] mx-4 bg-dark-panel border border-dark-border rounded-2xl shadow-2xl overflow-hidden animate-zoom-in"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        {/* Close button */}
        <button
          id="login-close-btn"
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-8 pb-7 space-y-5">
          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold text-gray-100 leading-tight">Log in</h1>
            <p className="mt-1 text-sm text-gray-400">
              New user?{' '}
              <Link
                to="/register"
                id="login-register-link"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Register Now
              </Link>
            </p>
          </div>

          {/* ── Google (prominent) ── */}
          <button
            id="oauth-google-btn"
            type="button"
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.07] border border-dark-border rounded-lg text-sm font-semibold text-gray-200 transition-all duration-200 hover:shadow-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* ── 2 icon-only socials ── */}
          <div className="flex items-center justify-center gap-4">
            {/* LinkedIn */}
            <button
              id="oauth-linkedin-btn"
              type="button"
              onClick={() => toast.info('LinkedIn login is coming soon!')}
              title="LinkedIn login (coming soon)"
              className="w-11 h-11 flex items-center justify-center rounded-full border border-dark-border bg-white/[0.02] hover:bg-white/[0.08] hover:border-dark-border text-blue-400 hover:text-blue-300 transition-all duration-200 shadow-sm hover:shadow"
              aria-label="Continue with LinkedIn"
            >
              <LinkedInIcon />
            </button>

            {/* GitHub */}
            <button
              id="oauth-github-btn"
              type="button"
              onClick={() => handleOAuth('github')}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-dark-border bg-white/[0.02] hover:bg-white/[0.08] hover:border-dark-border text-gray-250 hover:text-white transition-all duration-200 shadow-sm hover:shadow"
              aria-label="Continue with GitHub"
            >
              <GitHubIcon />
            </button>
          </div>

          {/* ── OR Divider ── */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-dark-border" />
            <span className="mx-3 text-xs text-gray-500 font-medium">or</span>
            <div className="flex-1 border-t border-dark-border" />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Username or Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-300">
                Username or Email
              </label>
              <input
                id="login-email"
                type="text"
                autoComplete="username email"
                autoFocus
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm text-gray-100 bg-dark-input border rounded-lg outline-none placeholder-gray-600
                  transition-all duration-200
                  focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                  ${errors.email ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-dark-border hover:border-white/[0.1]'}`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 pr-11 text-sm text-gray-100 bg-dark-input border rounded-lg outline-none placeholder-gray-600
                    transition-all duration-200
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                    ${errors.password ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-dark-border hover:border-white/[0.1]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-border bg-dark-input text-blue-500 accent-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Remember Me</span>
              </label>
              <Link
                to="/forgot-password"
                id="login-forgot-link"
                className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password
              </Link>
            </div>

            {/* Sign In button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-lg text-white text-sm font-bold tracking-wide
                bg-[#1e7d4f] hover:bg-[#166039] active:bg-[#115130]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-emerald-900/20
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* ── Privacy Footer ── */}
          <div className="text-center space-y-2 pt-2 border-t border-dark-border">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              By using bugX, you agree to our terms and policies.
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <Link to="/privacy" className="hover:text-blue-400 hover:underline transition-colors font-medium">
                Privacy Policy
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/cookies" className="hover:text-blue-400 hover:underline transition-colors font-medium">
                Cookie Policy
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/terms" className="hover:text-blue-400 hover:underline transition-colors font-medium">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
