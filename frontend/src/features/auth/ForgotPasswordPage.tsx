import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, KeyRound, ShieldCheck } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { PasswordInput } from '../../shared/ui/input/PasswordInput';
import { Button } from '../../shared/ui/button/Button';
import { BugXLogo } from '../../shared/ui/logo/BugXLogo';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { api, type ApiError } from '../../shared/lib/api';

type Step = 'identity' | 'verify';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('identity');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    username?: string;
    otpCode?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  // Step 1: request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await api.auth.forgotPassword({ email, username });
      toast.success('Verification code sent! Check your email (or the server logs in development).');
      setStep('verify');
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'No account found with that email and username combination.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: submit OTP + new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!otpCode || otpCode.length !== 6) {
      newErrors.otpCode = 'Please enter the 6-digit verification code.';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else {
      if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters.';
      if (!/[0-9]/.test(newPassword)) newErrors.newPassword = (newErrors.newPassword || '') + ' Must contain a digit.';
      if (!/[a-zA-Z]/.test(newPassword)) newErrors.newPassword = (newErrors.newPassword || '') + ' Must contain a letter.';
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
        code: otpCode,
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
        toast.error(apiErr.message || 'Reset failed. The code may be expired or invalid.');
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`flex items-center gap-1 ${step === 'identity' ? 'text-blue-400' : 'text-gray-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${step === 'identity' ? 'border-blue-500 text-blue-400' : 'border-green-600 text-green-500'}`}>
              {step === 'verify' ? '✓' : '1'}
            </span>
            Identity
          </span>
          <div className="flex-1 h-px bg-dark-border" />
          <span className={`flex items-center gap-1 ${step === 'verify' ? 'text-blue-400' : 'text-gray-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${step === 'verify' ? 'border-blue-500 text-blue-400' : 'border-dark-border'}`}>
              2
            </span>
            New Password
          </span>
        </div>

        {step === 'identity' ? (
          /* ── Step 1: Email + Username ── */
          <form className="mt-6 space-y-5" onSubmit={handleRequestOtp}>
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
            <div className="pt-2">
              <Button type="submit" loading={loading} className="w-full flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Send Verification Code
              </Button>
            </div>
          </form>
        ) : (
          /* ── Step 2: OTP + New Password ── */
          <form className="mt-6 space-y-5" onSubmit={handleResetPassword}>
            <p className="text-xs text-gray-400 bg-blue-950/30 border border-blue-900/40 rounded-md p-3">
              A 6-digit code was sent to <span className="text-blue-300 font-medium">{email}</span>.
              Enter it below along with your new password.
            </p>
            <Input
              label="Verification Code"
              type="text"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={errors.otpCode}
              icon={<ShieldCheck className="w-4 h-4" />}
              autoFocus
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
              <Button type="submit" loading={loading} className="w-full flex items-center justify-center">
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
              <button
                type="button"
                onClick={() => setStep('identity')}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
              >
                ← Back
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
