/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface AiCoachContextValue {
  isCoachOpen: boolean;
  openCoach: () => void;
  closeCoach: () => void;
  toggleCoach: () => void;
}

const AiCoachCtx = createContext<AiCoachContextValue | null>(null);

export const AiCoachProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const openCoach = useCallback(() => setIsCoachOpen(true), []);
  const closeCoach = useCallback(() => setIsCoachOpen(false), []);
  const toggleCoach = useCallback(() => setIsCoachOpen(prev => !prev), []);

  return (
    <AiCoachCtx.Provider value={{ isCoachOpen, openCoach, closeCoach, toggleCoach }}>
      {children}
    </AiCoachCtx.Provider>
  );
};

export const useAiCoach = (): AiCoachContextValue => {
  const ctx = useContext(AiCoachCtx);
  if (!ctx) throw new Error('useAiCoach must be used inside AiCoachProvider');
  return ctx;
};
