/**
 * Analytics stats for Network & activity (dashboardStats + total users from GraphQL).
 * Uses a small localStorage cache so the last successful values are shown immediately
 * on reload while the API refetches in the background.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsStats, formatStat, AnalyticsStats } from '@/api/analyticsStatsApi';
import { getCachedValue } from '@/utils/localCache';

const STALE_MS = 5 * 60 * 1000;
const ANALYTICS_CACHE_KEY = 'analytics-stats-cache-v1';

export function useAnalyticsStats() {
  const initialData = getCachedValue<AnalyticsStats>(ANALYTICS_CACHE_KEY) ?? undefined;

  const q = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: fetchAnalyticsStats,
    staleTime: STALE_MS,
    initialData,
  });

  const dashboard = q.data?.dashboard ?? null;

  return {
    totalUsers: q.data?.totalUsers ?? null,
    dashboard,
    formatStat,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
  };
}
