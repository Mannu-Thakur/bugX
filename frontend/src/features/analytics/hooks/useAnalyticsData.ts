/**
 * Analytics data hook — fetches from existing APIs only.
 * Uses the same getToken/ENV pattern as the rest of the codebase.
 */
import { useQuery } from '@tanstack/react-query';
import { getToken, SESSION_ID } from '../../../shared/lib/api';
import { ENV } from '../../../shared/config/env';

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
  problem_slug?: string | null;
  problem_title?: string | null;
  language: string;
  status: string;
  score: number;
  runtime_ms: number | null;
  created_at: string;
}

async function analyticsRequest<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${ENV.API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': SESSION_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export function useAnalyticsData() {
  const stats = useQuery<UserStats>({
    queryKey: ['analytics-stats'],
    queryFn: () => analyticsRequest<UserStats>('/users/me/stats'),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const submissions = useQuery<{ items: SubmissionSummary[] }>({
    queryKey: ['analytics-submissions'],
    queryFn: async () => {
      const data = await analyticsRequest<{ items: SubmissionSummary[] }>('/users/me/submissions?page=1&limit=200');
      if (data && Array.isArray(data.items)) {
        return {
          ...data,
          items: data.items.map((item) => ({
            ...item,
            status: (item.status || '').toLowerCase(),
          })),
        };
      }
      return data;
    },
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  return {
    stats: stats.data,
    submissions: submissions.data?.items ?? [],
    isLoading: stats.isLoading || submissions.isLoading,
    isError: stats.isError || submissions.isError,
  };
}
