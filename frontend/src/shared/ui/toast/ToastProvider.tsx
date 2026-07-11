/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  registerBackgroundSubmission: (id: string, problemTitle: string, isRunOnly: boolean) => void;
  setActivePageSubmissionId: (id: string | null) => void;
  markSubmissionHandled: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const activePageSubIdRef = useRef<string | null>(null);
  const handledSubmissionsRef = useRef<Set<string>>(new Set());

  const setActivePageSubmissionId = useCallback((id: string | null) => {
    activePageSubIdRef.current = id;
  }, []);

  const markSubmissionHandled = useCallback((id: string) => {
    handledSubmissionsRef.current.add(id);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const registerBackgroundSubmission = useCallback((id: string, problemTitle: string, isRunOnly: boolean) => {
    let scorePollingCount = 0;

    const check = async () => {
      try {
        const sub = await api.submissions.get(id);

        if (sub.status === 'PENDING' || sub.status === 'RUNNING') {
          setTimeout(check, 1500);
        } else {
          // Status is terminal
          if (!isRunOnly && sub.status === 'ACCEPTED' && sub.score === 0) {
            scorePollingCount++;
            if (scorePollingCount < 20) {
              setTimeout(check, 1500);
              return;
            }
          }

          // Verify if user is still on the page for this submission or if it was handled locally
          const userIsStillOnPage = activePageSubIdRef.current === id;
          const wasHandled = handledSubmissionsRef.current.has(id);

          if (!userIsStillOnPage && !wasHandled) {
            if (isRunOnly) {
              if (sub.status === 'ACCEPTED') {
                toast(`Run completed successfully on problem: "${problemTitle}"!`, 'success', 6000);
              } else {
                toast(`Run finished with status: ${sub.status.replace('_', ' ')} on problem: "${problemTitle}"`, 'warning', 6000);
              }
            } else {
              if (sub.status === 'ACCEPTED') {
                toast(`Solution ACCEPTED for problem: "${problemTitle}"! +${sub.score} pts awarded.`, 'success', 6000);
              } else {
                toast(`Solution failed with status: ${sub.status.replace('_', ' ')} on problem: "${problemTitle}"`, 'error', 6000);
              }
            }
          }
        }
      } catch (err) {
        console.error("Background polling error:", err);
        setTimeout(check, 3000);
      }
    };

    setTimeout(check, 1500);
  }, [toast]);

  const success = useCallback((msg: string, dur?: number) => toast(msg, 'success', dur), [toast]);
  const error = useCallback((msg: string, dur?: number) => toast(msg, 'error', dur), [toast]);
  const warning = useCallback((msg: string, dur?: number) => toast(msg, 'warning', dur), [toast]);
  const info = useCallback((msg: string, dur?: number) => toast(msg, 'info', dur), [toast]);

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  };

  const bgBorderMap = {
    success: 'bg-[#121b16] border-emerald-500/30 text-emerald-200',
    error: 'bg-[#221314] border-rose-500/30 text-rose-200',
    warning: 'bg-[#1f1710] border-amber-500/30 text-amber-200',
    info: 'bg-[#111823] border-blue-500/30 text-blue-200',
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, removeToast, registerBackgroundSubmission, setActivePageSubmissionId, markSubmissionHandled }}>
      {children}
      {/* Toast Portal/Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border shadow-lg pointer-events-auto animate-slide-in-right transition-all duration-200 hover:-translate-y-0.5",
              bgBorderMap[t.type]
            )}
          >
            {iconMap[t.type]}
            <p className="text-sm font-sans flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-200 transition-colors p-0.5 rounded hover:bg-dark-hover"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
