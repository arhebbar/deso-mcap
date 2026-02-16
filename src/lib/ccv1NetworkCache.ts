/**
 * Client-side cache for CCv1 network total (DESO locked in Creator Coins v1).
 * Refresh only when cache is older than 1 week. Seed via script output or browser console.
 */

const CACHE_KEY = 'deso-ccv1-network-total';
export const CCV1_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface CachedCCv1Total {
  deso: number;
  timestamp: number;
}

export function getCCv1NetworkCache(): CachedCCv1Total | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCCv1Total;
    if (typeof parsed?.deso !== 'number' || typeof parsed?.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > CCV1_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCCv1NetworkCache(deso: number): void {
  try {
    const payload: CachedCCv1Total = { deso, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or disabled
  }
}
