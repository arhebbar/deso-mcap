/**
 * 30-day daily trend for the Network & activity chart (transactions, active wallets, new wallets).
 * Uses DeSo GraphQL dailyTxnCountStats, dailyActiveWalletCountStats, dailyNewWalletCountStats.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchDailyTrend } from '@/api/analyticsStatsApi';
import { getCachedValue } from '@/utils/localCache';
import type { DailyTrendPoint } from '@/api/analyticsStatsApi';

const TREND_CACHE_KEY = 'analytics-trend-cache-v1';
const STALE_MS = 10 * 60 * 1000;

export function use30DayTrend() {
  const initialData = getCachedValue<DailyTrendPoint[]>(TREND_CACHE_KEY) ?? undefined;

  const q = useQuery({
    queryKey: ['analytics-daily-trend'],
    queryFn: fetchDailyTrend,
    staleTime: STALE_MS,
    initialData,
  });

  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
