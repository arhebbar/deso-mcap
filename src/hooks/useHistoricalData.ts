import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistoricalData } from '@/api/historicalApi';
import { generateHistoricalData } from '@/data/desoData';

/**
 * Fetches real historical data from CoinGecko for the Trends chart.
 * Falls back to mock data if the API fails.
 * Reuses cached wallet/treasury/live-prices when available to avoid duplicate API calls.
 */
export function useHistoricalData(days: number) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['historical-data', days],
    queryFn: () => fetchHistoricalData(days, queryClient),
    staleTime: 60 * 1000, // 1 minute - keep prices reasonably fresh
    retry: 2,
  });

  return {
    data: query.data ?? generateHistoricalData(days),
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: !!query.data,
  };
}
