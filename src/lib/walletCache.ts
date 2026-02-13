/**
 * Client-side cache for wallet balances.
 * Uses localStorage (persists across sessions). When API fails, we fall back to cache then static.
 */

const CACHE_KEY = 'deso-wallet-cache';

export interface CachedWalletEntry {
  name: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER';
  balances: Record<string, number>;
  usdValue: number;
}

export interface CachedWalletData {
  data: CachedWalletEntry[];
  timestamp: number;
}

export function getWalletCache(): CachedWalletData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWalletData;
    if (!parsed?.data || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setWalletCache(data: CachedWalletEntry[]): void {
  try {
    const payload: CachedWalletData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or disabled
  }
}
