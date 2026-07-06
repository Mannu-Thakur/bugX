// Phase 5 — TanStack Query hooks for profile data
import { useQuery } from '@tanstack/react-query';
import { fetchUserStats, fetchUserSubmissions, fetchPublicProfile } from './api';

/** Fetch the authenticated user's stats. Stale for 60 s. */
export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: () => fetchUserStats(),
    staleTime: 5_000,
    retry: 1,
  });
}

/** Fetch paginated submission history. Stale for 30 s. */
export function useUserSubmissions(page: number, limit = 20) {
  return useQuery({
    queryKey: ['user-submissions', page, limit],
    queryFn: () => fetchUserSubmissions(page, limit),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

/** Fetch public profile details by username. */
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfile(username),
    staleTime: 10_000,
    retry: 1,
    enabled: !!username,
  });
}

