import { useQuery } from '@tanstack/react-query';
import { fetchHistoricalData } from '@/api/historicalApi';
import { generateHistoricalData } from '@/data/desoData';

/**
 * Fetches real historical data from CoinGecko for the Trends chart.
 * Falls back to mock data if the API fails.
 */
export function useHistoricalData(days: number) {
  const query = useQuery({
    queryKey: ['historical-data', days],
    queryFn: () => fetchHistoricalData(days),
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
