import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistoricalData } from '@/api/historicalApi';
import { generateHistoricalData } from '@/data/desoData';
import { getCachedValue, setCachedValue } from '@/utils/localCache';

const HISTORICAL_CACHE_KEY = 'historical-data';
const HISTORICAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Fetches real historical data from CoinGecko for the Trends chart.
 * Uses localStorage cache for instant load; falls back to mock data if the API fails.
 * Reuses cached wallet/treasury/live-prices when available to avoid duplicate API calls.
 */
export function useHistoricalData(days: number) {
  const queryClient = useQueryClient();
  const cacheKey = `${HISTORICAL_CACHE_KEY}-${days}`;
  const initialData = getCachedValue<Awaited<ReturnType<typeof fetchHistoricalData>>>(cacheKey, HISTORICAL_CACHE_TTL_MS) ?? undefined;

  const query = useQuery({
    queryKey: ['historical-data', days],
    queryFn: () => fetchHistoricalData(days, queryClient),
    staleTime: 60 * 1000, // 1 minute - keep prices reasonably fresh
    retry: 2,
    initialData,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setCachedValue(cacheKey, query.data);
    }
  }, [query.data, cacheKey]);

  return {
    data: query.data ?? generateHistoricalData(days),
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: !!query.data,
  };
}
