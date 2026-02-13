import { useQuery } from '@tanstack/react-query';
import { fetchWalletBalances } from '@/api/walletApi';
import { getWalletCache, setWalletCache, type CachedWalletEntry } from '@/lib/walletCache';
import { AMM_WALLETS, FOUNDATION_WALLETS, FOUNDER_WALLETS } from '@/data/desoData';

const STATIC_WALLETS = [...FOUNDATION_WALLETS, ...AMM_WALLETS, ...FOUNDER_WALLETS];

type DataSource = 'live' | 'cached' | 'static';

/**
 * Merge API data with static fallback.
 * API is always preferred when it returns a value > 0.
 * Static fallback is used only when API returns 0 or empty (e.g. Openfund held on DEX
 * order book doesn't appear in get-users-stateless UsersYouHODL).
 */
function mergeWithStatic(
  api: { name: string; classification: string; balances: Record<string, number> },
  staticByName: Map<string, (typeof STATIC_WALLETS)[0]>
) {
  const fallback = staticByName.get(api.name);
  const apiBal = api.balances ?? {};
  const fallbackBal = fallback?.balances ?? {};
  const mergedBalances: Record<string, number> = {};
  const allTokens = new Set([...Object.keys(fallbackBal), ...Object.keys(apiBal)]);
  for (const token of allTokens) {
    const apiVal = apiBal[token] ?? 0;
    const fbVal = fallbackBal[token] ?? 0;
    mergedBalances[token] = apiVal > 0 ? apiVal : fbVal;
  }
  return { ...api, balances: mergedBalances };
}

/**
 * Fetches wallet balances from DeSo blockchain API.
 * When API succeeds: uses API data, merges with static for zeros, updates cache.
 * When API fails: uses cache (if available) or static fallback.
 */
export function useWalletData() {
  const query = useQuery({
    queryKey: ['wallet-balances'],
    queryFn: fetchWalletBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const apiWallets = query.data ?? [];
  const hasMeaningfulData = apiWallets.length > 0 && apiWallets.some(
    (w) => Object.values(w.balances ?? {}).some((v) => v > 0)
  );
  const staticByName = new Map(STATIC_WALLETS.map((w) => [w.name, w]));

  let wallets: typeof STATIC_WALLETS;
  let dataSource: DataSource;
  let cachedAt: number | undefined;

  if (hasMeaningfulData) {
    wallets = apiWallets.map((api) => mergeWithStatic(api, staticByName));
    setWalletCache(wallets as CachedWalletEntry[]);
    dataSource = 'live';
  } else {
    const cached = getWalletCache();
    if (cached?.data?.length) {
      wallets = cached.data.map((c) => {
        const fallback = staticByName.get(c.name);
        const cacheBal = c.balances ?? {};
        const fbBal = fallback?.balances ?? {};
        const merged: Record<string, number> = {};
        const allTokens = new Set([...Object.keys(fbBal), ...Object.keys(cacheBal)]);
        for (const token of allTokens) {
          const cacheVal = cacheBal[token] ?? 0;
          const fbVal = fbBal[token] ?? 0;
          merged[token] = cacheVal > 0 ? cacheVal : fbVal;
        }
        return { ...c, balances: merged };
      });
      dataSource = 'cached';
      cachedAt = cached.timestamp;
    } else {
      wallets = STATIC_WALLETS;
      dataSource = 'static';
    }
  }

  if (wallets.length === 0) wallets = STATIC_WALLETS;

  const ammWallets = wallets.filter((w) => w.classification === 'AMM');
  const foundationWallets = wallets.filter((w) => w.classification === 'FOUNDATION');

  const ammDeso = ammWallets.reduce((sum, w) => sum + (w.balances.DESO || 0), 0);
  const foundationDeso = foundationWallets.reduce((sum, w) => sum + (w.balances.DESO || 0), 0);
  const founderDeso = wallets
    .filter((w) => w.classification === 'FOUNDER')
    .reduce((sum, w) => sum + (w.balances.DESO || 0), 0);

  const foundationDusdc =
    foundationWallets.length > 0 ? foundationWallets[0].balances.dUSDC ?? 0 : 0;

  return {
    wallets,
    ammWallets,
    foundationWallets,
    ammDeso,
    foundationDeso,
    founderDeso,
    foundationDusdc,
    isLoading: query.isLoading,
    isLive: dataSource === 'live',
    dataSource,
    cachedAt,
  };
}
