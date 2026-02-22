/**
 * Client-side cache for staked DESO validator buckets.
 * Used to show last results immediately while fresh data loads.
 */

import type { AllStakedDesoBucket } from '@/api/walletApi';

const CACHE_KEY = 'deso-staked-cache';
const CACHE_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export function getStakedCache(): AllStakedDesoBucket[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: AllStakedDesoBucket[]; timestamp: number; version?: number };
    if (!parsed?.data || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') return null;
    if ((parsed.version ?? 0) < CACHE_VERSION) return null;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function setStakedCache(data: AllStakedDesoBucket[]): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now(), version: CACHE_VERSION })
    );
  } catch {
    // ignore
  }
}
