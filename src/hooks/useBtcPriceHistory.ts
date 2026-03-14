import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBtcPriceHistory } from '@/api/btcPriceApi';
import { fetchLivePrices } from '@/api/priceApi';
import { getCachedValue, setCachedValue } from '@/utils/localCache';

const BTC_HISTORY_CACHE_KEY = 'btc-price-history';
const BTC_HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Fetches BTC price history from CryptoCompare for the dedicated BTC chart.
 * Overrides the most recent point with live price from CoinGecko simple/price.
 * Uses localStorage cache for instant load.
 */
export function useBtcPriceHistory(days: number) {
  const cacheKey = `${BTC_HISTORY_CACHE_KEY}-${days}`;
  const initialData = getCachedValue<Array<{ date: string; price: number }>>(cacheKey, BTC_HISTORY_CACHE_TTL_MS) ?? undefined;

  const query = useQuery({
    queryKey: ['btc-price-history', days],
    queryFn: async () => {
      const [history, live] = await Promise.all([
        fetchBtcPriceHistory(days),
        fetchLivePrices().catch(() => null),
      ]);
      const result = [...history];
      if (result.length > 0 && live?.btcPrice) {
        result[result.length - 1] = { ...result[result.length - 1]!, price: live.btcPrice };
      }
      return result;
    },
    staleTime: 60 * 1000,
    retry: 2,
    initialData,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setCachedValue(cacheKey, query.data);
    }
  }, [query.data, cacheKey]);

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isLive: !!query.data,
  };
}
