/**
 * Client-side cache for Others usernames (pk -> username) in Token Holdings table.
 * Avoids redundant fetchUsernamesForPks calls across freeFloat, desoBalances, stakeEntries, and CCv1 Others.
 */

const CACHE_KEY = 'deso-others-usernames';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface CachedOthersUsernames {
  map: Record<string, string>;
  timestamp: number;
}

/** Get cached username map. Returns empty map if missing or expired. */
export function getOthersUsernamesCache(): Map<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as CachedOthersUsernames;
    if (!parsed?.map || typeof parsed.map !== 'object') return new Map();
    if (Date.now() - (parsed.timestamp ?? 0) > CACHE_TTL_MS) return new Map();
    return new Map(Object.entries(parsed.map));
  } catch {
    return new Map();
  }
}

/** Merge new usernames into cache and persist. */
export function setOthersUsernamesCache(updates: Map<string, string>): void {
  if (updates.size === 0) return;
  try {
    const existing = getOthersUsernamesCache();
    for (const [pk, username] of updates) {
      if (username) existing.set(pk, username);
    }
    const payload: CachedOthersUsernames = {
      map: Object.fromEntries(existing),
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full
  }
}

/** Clear the cache. */
export function clearOthersUsernamesCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
