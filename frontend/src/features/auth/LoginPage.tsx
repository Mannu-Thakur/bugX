import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, LogIn, Key } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { PasswordInput } from '../../shared/ui/input/PasswordInput';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useAuth } from './useAuth';
import type { ApiError } from '../../shared/lib/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/problems';

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

  const handleQuickMockupLogin = () => {
    setEmail('admin@xyz-platform.local');
    setPassword('Admin12345');
    setErrors({});
    toast.info("Seed admin credentials filled.");
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1 animate-fade-in select-none">
      <div className="max-w-md w-full space-y-8 bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/10">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-100 tracking-tight animate-fade-in">
            Sign in to XYZ Platform
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

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
            
            <button
              type="button"
              onClick={handleQuickMockupLogin}
              className="w-full text-xs text-gray-500 hover:text-gray-400 py-2 border border-dashed border-dark-border hover:border-gray-600 rounded mt-1 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Auto-fill seed admin credentials
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
