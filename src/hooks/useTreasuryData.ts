import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTreasuryBalances, fetchTreasuryBalancesPerAddress, STATIC_TREASURY_ADDRESSES } from '@/api/treasuryApi';
import { getTreasuryCache, setTreasuryCache, getTreasuryTotalsFromCache, type CachedTreasuryRow } from '@/lib/treasuryCache';
import { EXTERNAL_TREASURY } from '@/data/desoData';

/**
 * Fetches external treasury balances (BTC, ETH, SOL) from blockchain APIs.
 * When API returns nothing or all zeros, defaults to cached totals (or static EXTERNAL_TREASURY).
 */
export function useTreasuryData() {
  const query = useQuery({
    queryKey: ['treasury-balances'],
    queryFn: fetchTreasuryBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const data = query.data;
  const apiHasValue = data && (data.btcAmount > 0 || data.ethAmount > 0 || data.solAmount > 0);
  const cachedTotals = getTreasuryTotalsFromCache();
  const staticBtc = EXTERNAL_TREASURY.btcHoldings;
  const staticEth = EXTERNAL_TREASURY.ethHotWallet + EXTERNAL_TREASURY.ethColdWallet;
  const staticSol = EXTERNAL_TREASURY.solColdWallet;

  const btcAmount = apiHasValue ? data!.btcAmount : (cachedTotals?.btc ?? staticBtc);
  const ethAmount = apiHasValue ? data!.ethAmount : (cachedTotals?.eth ?? staticEth);
  const solAmount = apiHasValue ? data!.solAmount : (cachedTotals?.sol ?? staticSol);

  return {
    btcAmount,
    ethAmount,
    solAmount,
    isLoading: query.isLoading,
    isLive: !!apiHasValue,
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
  const staticByName = useMemo(() => new Map(STATIC_TREASURY_ADDRESSES.map((r) => [r.address, r])), []);

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

  // Persist to cache only when we have live data (avoid side effects during render)
  useEffect(() => {
    if (isLive && addresses.length > 0) {
      setTreasuryCache(addresses);
    }
  }, [isLive, addresses]);

  return {
    addresses,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isLive,
    cachedAt,
  };
}
