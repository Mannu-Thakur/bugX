import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken, clearToken, getToken } from '../../shared/lib/api';
import type { User, ApiError, UserUpdatePayload } from '../../shared/lib/api';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (body: Record<string, unknown>) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  updateProfile: (body: UserUpdatePayload) => Promise<void>;
  uploadAvatar: (file: File) => Promise<User>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'auth_user';

const loadCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

const cacheUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useToast();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    clearToken();
    cacheUser(null);
    setUser(null);
    queryClient.clear();
    toast.info('Signed out successfully.');
  }, [queryClient, toast]);

  // Session Hydration
  useEffect(() => {
    const hydrateSession = async () => {
      const token = getToken();
      if (!token) {
        cacheUser(null);
        setLoading(false);
        return;
      }

      const cachedUser = loadCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const me = await api.users.getMe();
        setUser(me);
        cacheUser(me);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          clearToken();
          cacheUser(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    hydrateSession();
  }, []);

  // Listen for auto-logout event from the API client
  useEffect(() => {
    const handleSessionExpired = () => {
      cacheUser(null);
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
      cacheUser(data.user);
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
      cacheUser(data.user);
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

  const updateProfile = async (body: UserUpdatePayload) => {
    try {
      const updatedUser = await api.users.updateMe(body);
      setUser(updatedUser);
      cacheUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated successfully.');
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Failed to update profile.');
      throw apiErr;
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const updatedUser = await api.users.uploadAvatar(file);
      setUser(updatedUser);
      cacheUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile image uploaded.');
      return updatedUser;
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || 'Failed to upload profile image.');
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
        uploadAvatar,
      }}
    >
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg text-gray-200 select-none">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-blue-500/20">
              <img
                src="https://www.svgrepo.com/show/249746/coding-code.svg"
                alt="AlgoAxis logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <span className="font-sans font-bold text-sm tracking-widest text-gray-400 uppercase">
              Loading AlgoAxis...
            </span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
