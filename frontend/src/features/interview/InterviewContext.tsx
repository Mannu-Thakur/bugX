/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import type {
  InterviewSession,
  InterviewConfig,
  SubmissionContext,
  InterviewQuestion,
  InterviewAnswer,
  AnswerEvaluation,
  InterviewReport,
  InterviewStats,
  InterviewPhase,
} from './types';

const STORAGE_KEY = 'bugx_interview_sessions';

// ─────────────────────────────────────────────────────────────
//  Context Value
// ─────────────────────────────────────────────────────────────
interface InterviewContextValue {
  // Current session
  phase: InterviewPhase;
  session: InterviewSession | null;
  currentQuestionIndex: number;
  isAiThinking: boolean;
  error: string | null;

  // Actions
  startSession: (config: InterviewConfig, context: SubmissionContext, questions: InterviewQuestion[]) => void;
  submitAnswer: (answer: InterviewAnswer) => void;
  addEvaluation: (evaluation: AnswerEvaluation) => void;
  addFollowUpQuestion: (question: InterviewQuestion) => void;
  setPhase: (phase: InterviewPhase) => void;
  setIsAiThinking: (v: boolean) => void;
  setError: (e: string | null) => void;
  completeInterview: (report: InterviewReport) => void;
  resetSession: () => void;

  // History
  sessions: InterviewSession[];
  getStats: () => InterviewStats;
}

// ─────────────────────────────────────────────────────────────
//  Local storage helpers
// ─────────────────────────────────────────────────────────────
function loadSessions(): InterviewSession[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions: InterviewSession[]): void {
  try {
    // Keep last 50 sessions
    const trimmed = sessions.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ─────────────────────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────────────────────
const InterviewCtx = createContext<InterviewContextValue | null>(null);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<InterviewPhase>('idle');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>(() => loadSessions());
  const sessionIdRef = useRef<string>('');

  const startSession = useCallback((
    config: InterviewConfig,
    context: SubmissionContext,
    questions: InterviewQuestion[]
  ) => {
    const id = Math.random().toString(36).slice(2, 12);
    sessionIdRef.current = id;

    const newSession: InterviewSession = {
      id,
      config,
      submissionContext: context,
      questions,
      answers: [],
      evaluations: [],
      startedAt: Date.now(),
    };

    setSession(newSession);
    setCurrentQuestionIndex(0);
    setPhase('interviewing');
    setError(null);
  }, []);

  const submitAnswer = useCallback((answer: InterviewAnswer) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, answers: [...prev.answers, answer] };
    });
  }, []);

  const addEvaluation = useCallback((evaluation: AnswerEvaluation) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, evaluations: [...prev.evaluations, evaluation] };
      return updated;
    });
    // Move to next question
    setCurrentQuestionIndex(prev => prev + 1);
  }, []);

  const addFollowUpQuestion = useCallback((question: InterviewQuestion) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, questions: [...prev.questions, question] };
    });
  }, []);

  const completeInterview = useCallback((report: InterviewReport) => {
    setSession(prev => {
      if (!prev) return prev;
      const completed: InterviewSession = {
        ...prev,
        completedAt: Date.now(),
        report,
      };
      setSessions(existing => {
        const updated = [...existing, completed];
        saveSessions(updated);
        return updated;
      });
      return completed;
    });
    setPhase('complete');
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setCurrentQuestionIndex(0);
    setPhase('idle');
    setIsAiThinking(false);
    setError(null);
  }, []);

  const getStats = useCallback((): InterviewStats => {
    const completed = sessions.filter(s => s.report);
    if (completed.length === 0) {
      return {
        totalInterviews: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        weakestTopics: [],
        strongestTopics: [],
        sessions,
      };
    }

    const scores = completed.map(s => s.report!.overallScore);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);

    // Streak = consecutive sessions in last N days
    const sortedByDate = [...completed].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    let streak = 0;
    const seen = new Set<string>();
    for (const s of sortedByDate) {
      const day = new Date(s.completedAt!).toDateString();
      if (!seen.has(day)) {
        seen.add(day);
        streak++;
      } else {
        break;
      }
    }

    // Aggregate topic scores from evaluations
    const topicScores: Record<string, number[]> = {};
    for (const s of completed) {
      for (const q of s.questions) {
        const ev = s.evaluations.find(e => e.questionId === q.id);
        if (!ev) continue;
        if (!topicScores[q.category]) topicScores[q.category] = [];
        topicScores[q.category].push(ev.score);
      }
    }

    const topicAvgs = Object.entries(topicScores).map(([t, vals]) => ({
      topic: t,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    })).sort((a, b) => a.avg - b.avg);

    return {
      totalInterviews: completed.length,
      averageScore: avgScore,
      bestScore,
      currentStreak: streak,
      weakestTopics: topicAvgs.slice(0, 3).map(t => t.topic),
      strongestTopics: topicAvgs.slice(-3).reverse().map(t => t.topic),
      sessions,
    };
  }, [sessions]);

  return (
    <InterviewCtx.Provider value={{
      phase, session, currentQuestionIndex, isAiThinking, error,
      startSession, submitAnswer, addEvaluation, addFollowUpQuestion,
      setPhase, setIsAiThinking, setError,
      completeInterview, resetSession,
      sessions, getStats,
    }}>
      {children}
    </InterviewCtx.Provider>
  );
};

export const useInterview = (): InterviewContextValue => {
  const ctx = useContext(InterviewCtx);
  if (!ctx) throw new Error('useInterview must be used inside InterviewProvider');
  return ctx;
};
