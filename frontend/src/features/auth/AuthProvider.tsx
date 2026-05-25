import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken, clearToken, getToken } from '../../shared/lib/api';
import type { User, ApiError } from '../../shared/lib/api';
import { useToast } from '../../shared/ui/toast/ToastProvider';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (body: Record<string, unknown>) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  updateProfile: (body: { username?: string; avatarUrl?: string | null }) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useToast();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    queryClient.clear();
    toast.info('Signed out successfully.');
  }, [queryClient, toast]);

  // Session Hydration
  useEffect(() => {
    const hydrateSession = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await api.users.getMe();
        setUser(me);
      } catch {
        // Token was invalid/expired
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateSession();
  }, []);

  // Listen for auto-logout event from the API client
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      queryClient.clear();
      toast.error('Session expired. Please log in again.');
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, [queryClient, toast]);

  const login = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const data = await api.auth.login(body);
      setToken(data.access_token);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Welcome back, ${data.user.username}!`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Login failed.');
      throw apiErr;
    } finally {
      setLoading(false);
    }
  };

  const register = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const data = await api.auth.register(body);
      setToken(data.access_token);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Account created! Welcome, ${data.user.username}.`);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Registration failed.');
      throw apiErr;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (body: { username?: string; avatarUrl?: string | null }) => {
    try {
      const updatedUser = await api.users.updateMe(body);
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated successfully.');
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Failed to update profile.');
      throw apiErr;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg text-gray-200 select-none">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
              {"<>"}
            </div>
            <span className="font-sans font-bold text-sm tracking-widest text-gray-400 uppercase">
              Loading XYZ Platform...
            </span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
