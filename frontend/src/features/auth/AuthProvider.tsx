import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken, clearToken, getToken } from '../../shared/lib/api';
import type { User, ApiError, UserUpdatePayload } from '../../shared/lib/api';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { BugXLogo } from '../../shared/ui/logo/BugXLogo';

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
    const remembered = localStorage.getItem('remember_me') === '1';
    const raw = remembered ? localStorage.getItem(AUTH_USER_KEY) : sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

const cacheUser = (user: User | null) => {
  const remembered = localStorage.getItem('remember_me') === '1';
  if (user) {
    if (remembered) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      sessionStorage.removeItem(AUTH_USER_KEY);
    } else {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useToast();
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    // Fire and forget server-side blocklisting so UI remains responsive
    api.auth.logout().catch((err) => {
      console.error('Failed to log out on server:', err);
    });
    clearToken();
    cacheUser(null);
    setUser(null);
    queryClient.clear();

    // Clear user-specific data on logout
    localStorage.removeItem('battle_history');
    localStorage.removeItem('bugx_focusMode');
    localStorage.removeItem('bugx_autoReset');
    localStorage.removeItem('bugx_superAlarm');
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('user_') ||
        key.startsWith('bugx_draft_') ||
        key.startsWith('battle_code_') ||
        key.startsWith('battle_lang_')
      ) {
        localStorage.removeItem(key);
      }
    });

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
        if (apiErr?.status === 401 || apiErr?.status === 450 || apiErr?.status === 403) {
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
      const remember = body.remember === true;
      setToken(data.access_token, remember);
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
      setToken(data.access_token, false); // Default to session-only/no remember-me
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
            <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-dark-border text-gray-300 p-2">
              <BugXLogo className="w-full h-full" />
            </div>
            <span className="font-sans font-bold text-xs tracking-widest text-gray-400 uppercase">
              Loading bug<span className="text-blue-500 font-extrabold uppercase">X</span>...
            </span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
