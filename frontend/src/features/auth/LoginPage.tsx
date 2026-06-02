import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, LogIn, KeyRound } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { PasswordInput } from '../../shared/ui/input/PasswordInput';
import { Button } from '../../shared/ui/button/Button';
import { BugXLogo } from '../../shared/ui/logo/BugXLogo';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useAuth } from './useAuth';
import { api, type ApiError } from '../../shared/lib/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/problems';

  const anyDigitAndLetter = (val: string) => {
    return /\d/.test(val) && /[a-zA-Z]/.test(val);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Form validation failed. Please check inputs.");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR' && apiErr.detail) {
        const fieldErrors: typeof errors = {};
        if (Array.isArray(apiErr.detail)) {
          const detailList = apiErr.detail as Array<{ loc?: (string | number)[]; msg: string; type: string }>;
          detailList.forEach((d) => {
            const field = d.loc ? d.loc[d.loc.length - 1] : '';
            if (field === 'email') fieldErrors.email = d.msg;
            if (field === 'password') fieldErrors.password = d.msg;
          });
        }
        setErrors(fieldErrors);
      } else {
        toast.error(apiErr.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email.';
    }

    if (!newPassword) {
      newErrors.password = 'New Password is required.';
    } else if (newPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!anyDigitAndLetter(newPassword)) {
      newErrors.password = 'Password must contain at least 1 digit and 1 letter.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Form validation failed. Please check inputs.");
      return;
    }

    setErrors({});
    setResetLoading(true);

    try {
      await api.auth.forgotPassword({ email, new_password: newPassword });
      toast.success("Password reset successfully! You can now log in.");
      setIsForgotPassword(false);
      setPassword('');
      setNewPassword('');
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Failed to reset password. Please check your email.');
    } finally {
      setResetLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1 animate-fade-in select-none">
        <div className="max-w-md w-full space-y-8 bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg">
          
          {/* Header Title */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gray-900/80 flex items-center justify-center text-gray-300 p-2.5 border border-dark-border shadow-lg shadow-blue-500/5">
              <BugXLogo className="w-full h-full" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-gray-100 tracking-tight animate-fade-in lowercase">
              Reset Password
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Provide your email to instantly configure a new password
            </p>
          </div>

          {/* Reset Password Form */}
          <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
            
            <Input
              label="Email address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
              autoFocus
            />

            <PasswordInput
              label="New Password"
              placeholder="Min 8 characters, 1 letter, 1 digit"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.password}
            />

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                loading={resetLoading}
                className="w-full flex items-center justify-center"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrors({});
                }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors py-1.5 focus:outline-none cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>

          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1 animate-fade-in select-none">
      <div className="max-w-md w-full space-y-8 bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gray-900/80 flex items-center justify-center text-gray-300 p-2.5 border border-dark-border shadow-lg shadow-blue-500/5">
            <BugXLogo className="w-full h-full" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-100 tracking-tight animate-fade-in lowercase">
            Sign in to bug<span className="text-blue-500 font-extrabold uppercase">X</span>
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Or{' '}
            <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              create a new coder account
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          
          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail className="w-4 h-4" />}
            autoFocus
          />

          <div className="space-y-1.5">
            <PasswordInput
              label="Password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setErrors({});
                }}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};

