import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';

interface RouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While the auth context is hydrating the session, render nothing so we
  // don't flash-redirect to /login before the token has been validated.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const AdminRoute: React.FC<RouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('Access Denied: Admin role is required to access this area.');
    }
  }, [user, toast]);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/problems" replace />;
  }

  return children;
};

export const AnonymousRoute: React.FC<RouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/problems" replace />;
  }

  return children;
};
