import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from '../../shared/ui/toast/ToastProvider';

interface RouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const AdminRoute: React.FC<RouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('Access Denied: Admin role is required to access this area.');
    }
  }, [user, toast]);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/problems" replace />;
  }

  return children;
};

export const AnonymousRoute: React.FC<RouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/problems" replace />;
  }

  return children;
};
