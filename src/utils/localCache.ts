/**
 * Tiny JSON + timestamp cache on top of localStorage.
 * Used so analytics/network stats show the last known values immediately,
 * even before the API responds or when it is slow.
 */

export interface CachedEntry<T> {
  value: T;
  /** Unix ms timestamp when value was written. */
  timestamp: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

function hasWindow() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCachedValue<T>(key: string, maxAgeMs: number = DEFAULT_TTL_MS): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedValue<T>(key: string, value: T): void {
  if (!hasWindow()) return;
  try {
    const entry: CachedEntry<T> = { value, timestamp: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore write failures (quota, privacy mode, etc.)
  }
}

