/**
 * Client-side cache for live prices (DESO, BTC, ETH, SOL).
 * Used to show last results immediately while fresh data loads.
 */

import type { LivePrices } from '@/api/priceApi';

const CACHE_KEY = 'deso-price-cache';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export function getPriceCache(): LivePrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: LivePrices; timestamp: number };
    if (!parsed?.data || typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function setPriceCache(data: LivePrices): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // ignore
  }
}
