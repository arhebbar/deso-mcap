import { useQuery } from '@tanstack/react-query';
import { fetchCCv1NetworkTotalDeso } from '@/api/walletApi';
import { getCCv1NetworkCache, getCCv1StaleCache, setCCv1NetworkCache, CCV1_CACHE_TTL_MS } from '@/lib/ccv1NetworkCache';

const QUERY_KEY = ['ccv1-network-total'];

/**
 * Fetches total DESO locked in Creator Coins v1 (network-wide) via GraphQL.
 * Uses valid cache when fresh; when expired, shows stale cache and refetches in background.
 */
export function useCCv1NetworkTotal() {
  const cached = getCCv1NetworkCache();
  const staleCache = getCCv1StaleCache();

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
    initialData: cached?.deso ?? staleCache?.deso,
    placeholderData: staleCache?.deso,
  });

  const displayDeso = query.data ?? staleCache?.deso ?? cached?.deso;
  const displayCachedAt = cached?.timestamp ?? staleCache?.timestamp ?? (query.data != null ? Date.now() : undefined);

  return {
    ccv1NetworkTotalDeso: displayDeso,
    ccv1CachedAt: displayCachedAt,
    isLoading: query.isLoading && query.data == null && staleCache == null,
    isFetching: query.isFetching,
  };
}
