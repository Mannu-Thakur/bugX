import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, UserPlus, User } from 'lucide-react';
import { Input } from '../../shared/ui/input/Input';
import { PasswordInput } from '../../shared/ui/input/PasswordInput';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useAuth } from './useAuth';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // Username checks
    if (!username) {
      newErrors.username = 'Username is required.';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (username.length > 50) {
      newErrors.username = 'Username cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, dashes, and underscores.';
    }

    // Email checks
    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email.';
    }

    // Password checks
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least 1 digit.';
    } else if (!/[a-zA-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least 1 letter.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Form validation failed. Please check inputs.");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await register({ username, email, password });
      navigate('/problems', { replace: true });
    } catch (err: any) {
      if (err.code === 'VALIDATION_ERROR' && err.detail) {
        const fieldErrors: typeof errors = {};
        if (Array.isArray(err.detail)) {
          err.detail.forEach((d: any) => {
            const field = d.loc ? d.loc[d.loc.length - 1] : '';
            if (field === 'username') fieldErrors.username = d.msg;
            if (field === 'email') fieldErrors.email = d.msg;
            if (field === 'password') fieldErrors.password = d.msg;
          });
        }
        setErrors(fieldErrors);
      } else {
        toast.error(err.message || 'Registration failed. Try a different username/email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1 animate-fade-in select-none">
      <div className="max-w-md w-full space-y-8 bg-dark-panel border border-dark-border p-8 rounded-lg shadow-lg">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/10">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-100 tracking-tight animate-fade-in">
            Create your coder account
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Or{' '}
            <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              sign in with existing details
            </Link>
          </p>
        </div>

        {/* Register Form */}
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          
          <Input
            label="Username"
            type="text"
            placeholder="coder_pro"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            icon={<User className="w-4 h-4" />}
            autoFocus
          />

          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail className="w-4 h-4" />}
          />

          <PasswordInput
            label="Password"
            placeholder="•••••••• (Min 8 chars, 1 digit, 1 letter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <div className="pt-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
