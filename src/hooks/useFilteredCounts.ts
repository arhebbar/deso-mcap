/**
 * Filtered counts for a time window (7d, 30d, 90d, 365d), plus the previous period
 * so the UI can show % up/down indicators.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getFilteredCountsCacheKey,
  getFilteredCountsPrevCacheKey,
  fetchFilteredCountsWithPrevious,
  type TimeWindow,
  type FilteredCounts30D,
  type FilteredCountsWithPrevious,
} from '@/api/analyticsStatsApi';
import { getCachedValue } from '@/utils/localCache';

const STALE_MS = 10 * 60 * 1000;

export function useFilteredCountsWithPrevious(window: TimeWindow) {
  const cacheKeyCurrent = getFilteredCountsCacheKey(window);
  const cacheKeyPrev = getFilteredCountsPrevCacheKey(window);
  const initialCurrent = getCachedValue<FilteredCounts30D>(cacheKeyCurrent) ?? undefined;
  const initialPrev = getCachedValue<FilteredCounts30D>(cacheKeyPrev) ?? undefined;
  const initialData: FilteredCountsWithPrevious | undefined =
    initialCurrent && initialPrev ? { current: initialCurrent, previous: initialPrev } : undefined;

  const q = useQuery({
    queryKey: ['filtered-counts-with-prev', window],
    queryFn: () => fetchFilteredCountsWithPrevious(window),
    staleTime: STALE_MS,
    initialData,
  });

  return {
    current: q.data?.current ?? null,
    previous: q.data?.previous ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
  };
}

// Back-compat: old API that returned only current window.
export function useFilteredCounts(window: TimeWindow) {
  const { current, isLoading, isFetching, isError } = useFilteredCountsWithPrevious(window);
  return { data: current, isLoading, isFetching, isError };
}
