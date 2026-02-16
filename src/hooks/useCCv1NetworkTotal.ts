import { useQuery } from '@tanstack/react-query';
import { fetchCCv1NetworkTotalDeso } from '@/api/walletApi';
import { getCCv1NetworkCache, setCCv1NetworkCache, CCV1_CACHE_TTL_MS } from '@/lib/ccv1NetworkCache';

const QUERY_KEY = ['ccv1-network-total'];

/**
 * Fetches total DESO locked in Creator Coins v1 (network-wide) via GraphQL.
 * Uses cached value when available; refreshes only if cache is older than 1 week.
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
    staleTime: CCV1_CACHE_TTL_MS,
    gcTime: CCV1_CACHE_TTL_MS,
    retry: 1,
    enabled: cached == null,
    initialData: cached?.deso,
    placeholderData: cached?.deso,
  });

  return {
    ccv1NetworkTotalDeso: query.data ?? cached?.deso ?? undefined,
    ccv1CachedAt: cached?.timestamp ?? (query.data != null ? Date.now() : undefined),
    isLoading: query.isLoading && query.data == null && cached == null,
    isFetching: query.isFetching,
  };
}
