import { useQuery } from '@tanstack/react-query';
import { fetchBtcPriceHistory } from '@/api/btcPriceApi';
import { fetchLivePrices } from '@/api/priceApi';

/**
 * Fetches BTC price history from CryptoCompare for the dedicated BTC chart.
 * Overrides the most recent point with live price from CoinGecko simple/price.
 */
export function useBtcPriceHistory(days: number) {
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
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isLive: !!query.data,
  };
}
