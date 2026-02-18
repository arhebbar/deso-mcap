/**
 * Client-side cache for treasury address balances.
 * Uses localStorage (persists across sessions). When API fails or returns zeros, we fall back to cache then static.
 */

const CACHE_KEY = 'deso-treasury-cache';
const CACHE_VERSION = 2; // Invalidate old cache that may have caused blank display

export interface CachedTreasuryRow {
  chain: 'BTC' | 'ETH' | 'SOL';
  address: string;
  name: string;
  isAmm: boolean;
  holdings: Record<string, number>;
  usdValue: number;
}

export interface CachedTreasuryData {
  data: CachedTreasuryRow[];
  timestamp: number;
  version?: number;
}

export function getTreasuryCache(): CachedTreasuryData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTreasuryData;
    if (!parsed?.data || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
      return null;
    }
    if ((parsed.version ?? 1) < CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setTreasuryCache(data: CachedTreasuryRow[]): void {
  try {
    const payload: CachedTreasuryData = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or disabled
  }
}

/** Aggregate BTC/ETH/SOL totals from cached address rows (for default when API returns nothing). */
export function getTreasuryTotalsFromCache(): { btc: number; eth: number; sol: number } | null {
  const cached = getTreasuryCache();
  if (!cached?.data?.length) return null;
  let btc = 0;
  let eth = 0;
  let sol = 0;
  for (const row of cached.data) {
    btc += row.holdings?.BTC ?? 0;
    eth += row.holdings?.ETH ?? 0;
    sol += row.holdings?.SOL ?? 0;
  }
  return { btc, eth, sol };
}
