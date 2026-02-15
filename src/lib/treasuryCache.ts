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
