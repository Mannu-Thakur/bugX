import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { ToastProvider } from '../shared/ui/toast/ToastProvider';
import { AuthProvider } from '../features/auth/AuthProvider';
import { InterviewProvider } from '../features/interview/InterviewContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <InterviewProvider>
            {children}
          </InterviewProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

