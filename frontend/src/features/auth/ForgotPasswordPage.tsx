import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, KeyRound } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { PasswordInput } from '../../shared/ui/input/PasswordInput';
import { Button } from '../../shared/ui/button/Button';
import { BugXLogo } from '../../shared/ui/logo/BugXLogo';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { api, type ApiError } from '../../shared/lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    username?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email.';
    }

    if (!username) {
      newErrors.username = 'Username is required.';
    } else if (username.length < 3 || username.length > 50) {
      newErrors.username = 'Username must be between 3 and 50 characters.';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else {
      if (newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters.';
      }
      if (!/[0-9]/.test(newPassword)) {
        newErrors.newPassword = (newErrors.newPassword || '') + ' Password must contain at least 1 digit.';
      }
      if (!/[a-zA-Z]/.test(newPassword)) {
        newErrors.newPassword = (newErrors.newPassword || '') + ' Password must contain at least 1 letter.';
      }
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await api.auth.forgotPassword({
        email,
        username,
        new_password: newPassword,
      });
      toast.success('Password reset successful! You can now log in.');
      navigate('/login');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'VALIDATION_ERROR' && apiErr.detail) {
        const fieldErrors: typeof errors = {};
        if (Array.isArray(apiErr.detail)) {
          const detailList = apiErr.detail as Array<{ loc?: (string | number)[]; msg: string; type: string }>;
          detailList.forEach((d) => {
            const field = d.loc ? d.loc[d.loc.length - 1] : '';
            if (field === 'email') fieldErrors.email = d.msg;
            if (field === 'username') fieldErrors.username = d.msg;
            if (field === 'new_password') fieldErrors.newPassword = d.msg;
          });
        }
        setErrors(fieldErrors);
      } else {
        toast.error(apiErr.message || 'Reset failed. Verify your username and email combo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1 animate-fade-in select-none">
      <div className="max-w-md w-full space-y-8 bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gray-900/80 flex items-center justify-center text-gray-300 p-2.5 border border-dark-border shadow-lg shadow-blue-500/5">
            <BugXLogo className="w-full h-full" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-100 tracking-tight animate-fade-in lowercase">
            Reset password for bug<span className="text-blue-500 font-extrabold uppercase">X</span>
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Reset Form */}
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

          <Input
            label="Username"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            icon={<User className="w-4 h-4" />}
          />

          <div className="space-y-4">
            <PasswordInput
              label="New Password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
