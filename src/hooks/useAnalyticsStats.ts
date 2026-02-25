/**
 * Analytics stats for Network & activity (total users from GraphQL, etc.).
 */

import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsStats } from '@/api/analyticsStatsApi';

const STALE_MS = 5 * 60 * 1000;

export function useAnalyticsStats() {
  const q = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: fetchAnalyticsStats,
    staleTime: STALE_MS,
  });
  return {
    totalUsers: q.data?.totalUsers ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
