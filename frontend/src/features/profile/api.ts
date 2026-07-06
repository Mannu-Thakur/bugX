// Phase 5 — Profile API: stats + submission history
import { ENV } from '../../shared/config/env';
import { getToken } from '../../shared/lib/api';
import type { Paginated } from '../../shared/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserStats {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_score: number;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  submission_activity?: Record<string, number> | null;
  battles_played?: number;
  battles_won?: number;
}

export interface SubmissionSummary {
  id: string;
  problem_id: string;
  /** May be absent if backend doesn't populate it yet */
  problem_slug?: string | null;
  /** May be absent if backend doesn't populate it yet */
  problem_title?: string | null;
  language: string;
  status: string;
  score: number;
  runtime_ms: number | null;
  run_samples_only: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function profileRequest<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${ENV.API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch { /* ignore */ }
    throw { status: res.status, message };
  }

  return res.json();
}

// ─── Endpoint Functions ───────────────────────────────────────────────────────

/** GET /api/v1/users/me/stats */
export async function fetchUserStats(): Promise<UserStats> {
  return profileRequest<UserStats>('/users/me/stats');
}

/** GET /api/v1/users/me/submissions?page=N&limit=N */
export async function fetchUserSubmissions(
  page = 1,
  limit = 20,
): Promise<Paginated<SubmissionSummary>> {
  return profileRequest<Paginated<SubmissionSummary>>(
    `/users/me/submissions?page=${page}&limit=${limit}`,
  );
}

export interface PublicProfileData {
  user: {
    username: string;
    fullName: string | null;
    bio: string | null;
    location: string | null;
    avatarUrl: string | null;
    createdAt: string | null;
    leetcodeUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
  };
  stats: UserStats;
  submissions: SubmissionSummary[];
}

/** GET /api/v1/users/profile/{username} */
export async function fetchPublicProfile(username: string): Promise<PublicProfileData> {
  const res = await fetch(`${ENV.API_URL}/users/profile/${username}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch { /* ignore */ }
    throw { status: res.status, message };
  }

  const data = await res.json();
  if (data && data.submissions) {
    data.submissions = data.submissions.map((sub: any) => ({
      ...sub,
      status: (sub.status || '').toLowerCase()
    }));
  }
  return data;
}

