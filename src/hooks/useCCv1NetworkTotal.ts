import { useQuery } from '@tanstack/react-query';
import { fetchCCv1NetworkTotalDeso } from '@/api/walletApi';
import { getCCv1NetworkCache, setCCv1NetworkCache } from '@/lib/ccv1NetworkCache';

const QUERY_KEY = ['ccv1-network-total'];
const STALE_TIME = 24 * 60 * 60 * 1000; // 24h

/**
 * Fetches total DESO locked in Creator Coins v1 (network-wide) via GraphQL.
 * Ordered by value DESC; first 10K creators capture ~99%. Uses cached value when available.
 * Fetch ~70s with limit; cache persists 24h.
 */
export function useCCv1NetworkTotal() {
  const cached = getCCv1NetworkCache();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const deso = await fetchCCv1NetworkTotalDeso(10_000);
      setCCv1NetworkCache(deso);
      return deso;
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
    retry: 1,
    initialData: cached?.deso,
    placeholderData: cached?.deso,
  });

  return {
    ccv1NetworkTotalDeso: query.data ?? cached?.deso ?? undefined,
    isLoading: query.isLoading && query.data == null && cached == null,
    isFetching: query.isFetching,
  };
}
