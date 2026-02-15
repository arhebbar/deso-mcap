import { useQuery } from '@tanstack/react-query';
import { fetchTreasuryBalances, fetchTreasuryBalancesPerAddress, STATIC_TREASURY_ADDRESSES } from '@/api/treasuryApi';
import { getTreasuryCache, setTreasuryCache, type CachedTreasuryRow } from '@/lib/treasuryCache';

/**
 * Fetches external treasury balances (BTC, ETH, SOL) from blockchain APIs.
 */
export function useTreasuryData() {
  const query = useQuery({
    queryKey: ['treasury-balances'],
    queryFn: fetchTreasuryBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const data = query.data;

  return {
    btcAmount: data?.btcAmount ?? 0,
    ethAmount: data?.ethAmount ?? 0,
    solAmount: data?.solAmount ?? 0,
    isLoading: query.isLoading,
    isLive: !!data,
  };
}

/**
 * Merge API row with static fallback: use API value when > 0, else static.
 * Uses staticRow for metadata (name, chain, etc.) to ensure valid structure.
 */
function mergeWithStatic(apiRow: CachedTreasuryRow, staticRow: CachedTreasuryRow): CachedTreasuryRow {
  const merged: Record<string, number> = {};
  const allTokens = new Set([
    ...Object.keys(apiRow.holdings ?? {}),
    ...Object.keys(staticRow.holdings ?? {}),
  ]);
  for (const token of allTokens) {
    const apiVal = apiRow.holdings?.[token] ?? 0;
    const staticVal = staticRow.holdings?.[token] ?? 0;
    merged[token] = apiVal > 0 ? apiVal : staticVal;
  }
  return { ...staticRow, ...apiRow, holdings: merged };
}

/**
 * Fetches per-address treasury balances for display in the External Treasury table.
 * Uses cache when API fails or returns zeros; merges API with static for robustness.
 */
export function useTreasuryAddresses() {
  const query = useQuery({
    queryKey: ['treasury-addresses'],
    queryFn: fetchTreasuryBalancesPerAddress,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const apiData = query.data ?? [];
  const staticByName = new Map(STATIC_TREASURY_ADDRESSES.map((r) => [r.address, r]));

  const hasMeaningfulData =
    apiData.length > 0 &&
    apiData.some((r) => Object.values(r.holdings).some((v) => v > 0));

  let addresses: CachedTreasuryRow[];
  let isLive: boolean;
  let cachedAt: number | undefined;

  if (hasMeaningfulData) {
    addresses = apiData.map((api) => {
      const fallback = staticByName.get(api.address);
      return fallback ? mergeWithStatic(api, fallback) : api;
    });
    setTreasuryCache(addresses);
    isLive = true;
  } else {
    const cached = getTreasuryCache();
    if (cached?.data?.length) {
      cachedAt = cached.timestamp;
      const cachedByAddr = new Map(cached.data.map((c) => [c.address, c]));
      // Preserve STATIC order; merge cache with static per address
      addresses = STATIC_TREASURY_ADDRESSES.map((fb) => {
        const c = cachedByAddr.get(fb.address);
        if (c && fb) return mergeWithStatic(c, fb);
        return c ?? fb;
      });
      isLive = false;
    } else {
      addresses = STATIC_TREASURY_ADDRESSES;
      isLive = false;
    }
  }

  if (addresses.length === 0) {
    addresses = STATIC_TREASURY_ADDRESSES;
  }

  return {
    addresses,
    isLoading: query.isLoading,
    isLive,
    cachedAt,
  };
}
