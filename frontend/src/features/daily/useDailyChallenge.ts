/**
 * Daily Challenge hooks — uses existing api request() pattern.
 * Separate React Query cache keys to never collide with other queries.
 */
import { useQuery } from '@tanstack/react-query';
import { getToken, SESSION_ID } from '../../shared/lib/api';
import { ENV } from '../../shared/config/env';

export interface DailyProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  acceptance_rate: number | null;
  score_base: number;
  tags: { id: string; name: string }[];
}

export interface DailyChallengePublic {
  date: string;
  problem: DailyProblem;
  pool_size: number;
}

export interface DailyChallengeStatus extends DailyChallengePublic {
  solved_today: boolean;
  ever_solved: boolean;
}

async function dailyRequest<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${ENV.API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': SESSION_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Daily API ${path} failed: ${res.status}`);
  return res.json();
}

/** Fetch today's daily challenge — no auth required. Refreshes at midnight (1 min stale). */
export function useDailyChallenge() {
  return useQuery<DailyChallengePublic>({
    queryKey: ['daily-challenge'],
    queryFn: () => dailyRequest<DailyChallengePublic>('/daily'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Fetch daily challenge + user solved status — auth required. */
export function useDailyChallengeStatus() {
  const token = getToken();
  return useQuery<DailyChallengeStatus>({
    queryKey: ['daily-challenge-status'],
    queryFn: () => dailyRequest<DailyChallengeStatus>('/daily/status'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: !!token,
  });
}
