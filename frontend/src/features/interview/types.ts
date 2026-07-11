// ─────────────────────────────────────────────
//  AI Interviewer — Type Definitions
// ─────────────────────────────────────────────

export type InterviewMode = 'technical' | 'hr' | 'system_design' | 'custom';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type InterviewPhase = 'idle' | 'mode_picking' | 'generating' | 'interviewing' | 'evaluating' | 'complete';
export type AnswerMethod = 'typed' | 'voice';
export type BadgeId =
  | 'interview_master'
  | 'excellent_communicator'
  | 'complexity_expert'
  | 'system_design_pro'
  | 'algorithm_guru'
  | 'consistent_performer'
  | 'perfect_score'
  | 'speed_demon';

// Question categories
export type QuestionCategory =
  | 'algorithm_choice'
  | 'time_complexity'
  | 'space_complexity'
  | 'edge_cases'
  | 'trade_offs'
  | 'alternatives'
  | 'optimizations'
  | 'communication'
  | 'system_design'
  | 'behavioral'
  | 'custom';

export interface InterviewQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  isFollowUp: boolean;
  followUpOf?: string; // question id
  hint?: string;
  expectedKeywords?: string[];
}

export interface InterviewAnswer {
  questionId: string;
  text: string;
  method: AnswerMethod;
  durationSec: number;
  submittedAt: number;
}

export interface EvalScores {
  technicalAccuracy: number;      // 0–10
  communication: number;          // 0–10
  confidence: number;             // 0–10
  problemSolving: number;         // 0–10
  optimizationKnowledge: number;  // 0–10
  complexityUnderstanding: number;// 0–10
}

export interface AnswerEvaluation {
  questionId: string;
  scores: EvalScores;
  feedback: string;
  expectedDiscussion: string;
  score: number;           // 0–10 overall
  nextDifficulty: 'easier' | 'same' | 'harder'; // adaptive signal
}

export interface InterviewConfig {
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  customTopics?: string[];  // for custom mode
  questionCount: number;
}

export interface SubmissionContext {
  problemTitle: string;
  problemDescription: string;
  constraints: string;
  sourceCode: string;
  language: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  difficulty: string;
  slug: string;
  submissionId: string;
}

export interface InterviewSession {
  id: string;
  config: InterviewConfig;
  submissionContext: SubmissionContext;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evaluations: AnswerEvaluation[];
  startedAt: number;
  completedAt?: number;
  report?: InterviewReport;
}

export interface InterviewReport {
  overallScore: number;         // 0–100
  scores: EvalScores;           // averaged across all answers
  strengths: string[];
  weaknesses: string[];
  suggestedTopics: string[];
  recommendedProblems: string[];
  badges: BadgeId[];
  detailedFeedback: QuestionFeedback[];
  summary: string;
}

export interface QuestionFeedback {
  question: string;
  candidateAnswer: string;
  feedback: string;
  expectedDiscussion: string;
  score: number;
}

export interface InterviewStats {
  totalInterviews: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  weakestTopics: string[];
  strongestTopics: string[];
  sessions: InterviewSession[];
}

// Badge metadata
export interface BadgeInfo {
  id: BadgeId;
  icon: string;
  label: string;
  description: string;
  color: string;
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  interview_master: {
    id: 'interview_master',
    icon: '🏆',
    label: 'Interview Master',
    description: 'Completed 10+ interviews',
    color: 'text-amber-400',
  },
  excellent_communicator: {
    id: 'excellent_communicator',
    icon: '🎤',
    label: 'Excellent Communicator',
    description: 'Communication score ≥ 9 in any interview',
    color: 'text-blue-400',
  },
  complexity_expert: {
    id: 'complexity_expert',
    icon: '🧠',
    label: 'Complexity Expert',
    description: 'Complexity Understanding score ≥ 9',
    color: 'text-purple-400',
  },
  system_design_pro: {
    id: 'system_design_pro',
    icon: '🏗️',
    label: 'System Design Pro',
    description: 'Completed a System Design interview',
    color: 'text-cyan-400',
  },
  algorithm_guru: {
    id: 'algorithm_guru',
    icon: '⚡',
    label: 'Algorithm Guru',
    description: 'Technical Accuracy ≥ 9 in any interview',
    color: 'text-emerald-400',
  },
  consistent_performer: {
    id: 'consistent_performer',
    icon: '🔥',
    label: 'Consistent Performer',
    description: '3+ interview streak',
    color: 'text-orange-400',
  },
  perfect_score: {
    id: 'perfect_score',
    icon: '💎',
    label: 'Perfect Score',
    description: 'Scored 95+ in any interview',
    color: 'text-indigo-400',
  },
  speed_demon: {
    id: 'speed_demon',
    icon: '🚀',
    label: 'Speed Demon',
    description: 'Answered all questions in under 60s each',
    color: 'text-rose-400',
  },
};

export const DIFFICULTY_QUESTION_COUNT: Record<InterviewDifficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 8,
  expert: 12,
};

export const MODE_LABELS: Record<InterviewMode, string> = {
  technical: 'Technical',
  hr: 'HR / Behavioral',
  system_design: 'System Design',
  custom: 'Custom Topics',
};

export const CUSTOM_TOPICS = [
  'Arrays', 'Graphs', 'Dynamic Programming', 'Trees',
  'Backend', 'Database', 'Operating Systems', 'OOP', 'Networking',
  'Sorting', 'Recursion', 'Bit Manipulation',
];
