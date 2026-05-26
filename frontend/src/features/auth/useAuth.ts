import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import type { AuthContextType } from './AuthProvider';

const missingProvider = async () => {
  throw new Error('Authentication is not ready. Please reload the page and try again.');
};

const fallbackAuth: AuthContextType = {
  user: null,
  loading: false,
  login: missingProvider,
  register: missingProvider,
  logout: () => {},
  updateProfile: missingProvider,
  uploadAvatar: async () => {
    throw new Error('Authentication is not ready. Please reload the page and try again.');
  },
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? fallbackAuth;
};
