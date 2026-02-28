/**
 * Filtered counts for a time window (7d, 90d, 365d). 30d is provided by useAnalyticsStats/dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchFilteredCountsForWindow,
  getFilteredCountsCacheKey,
  type TimeWindow,
  type FilteredCounts30D,
} from '@/api/analyticsStatsApi';
import { getCachedValue } from '@/utils/localCache';

const STALE_MS = 10 * 60 * 1000;

export function useFilteredCounts(window: TimeWindow) {
  const cacheKey = getFilteredCountsCacheKey(window);
  const initialData = getCachedValue<FilteredCounts30D>(cacheKey) ?? undefined;

  const q = useQuery({
    queryKey: ['filtered-counts', window],
    queryFn: () => fetchFilteredCountsForWindow(window),
    staleTime: STALE_MS,
    initialData,
  });

  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
  };
}
