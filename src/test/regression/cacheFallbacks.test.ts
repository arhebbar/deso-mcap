/**
 * Regression: Cache helpers (price, staked) return null when empty or stale;
 * set then get round-trip works for pre-load behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPriceCache, setPriceCache } from '@/lib/priceCache';
import { getStakedCache, setStakedCache } from '@/lib/stakedCache';

const PRICE_CACHE_KEY = 'deso-price-cache';
const STAKED_CACHE_KEY = 'deso-staked-cache';

describe('Cache fallbacks – price cache', () => {
  beforeEach(() => {
    localStorage.removeItem(PRICE_CACHE_KEY);
  });
  afterEach(() => {
    localStorage.removeItem(PRICE_CACHE_KEY);
  });

  it('getPriceCache returns null when no cache', () => {
    expect(getPriceCache()).toBeNull();
  });

  it('setPriceCache then getPriceCache returns same data', () => {
    const data = { desoPrice: 5.9, btcPrice: 97000, ethPrice: 3500, solPrice: 220 };
    setPriceCache(data);
    expect(getPriceCache()).toEqual(data);
  });
});

describe('Cache fallbacks – staked cache', () => {
  beforeEach(() => {
    localStorage.removeItem(STAKED_CACHE_KEY);
  });
  afterEach(() => {
    localStorage.removeItem(STAKED_CACHE_KEY);
  });

  it('getStakedCache returns null when no cache', () => {
    expect(getStakedCache()).toBeNull();
  });

  it('setStakedCache then getStakedCache returns same array', () => {
    const data: Parameters<typeof setStakedCache>[0] = [
      {
        validatorKey: 'pk1',
        validatorName: 'Validator 1',
        validatorType: 'core',
        foundation: [],
        community: [],
        total: 1000,
      },
    ];
    setStakedCache(data);
    const got = getStakedCache();
    expect(got).not.toBeNull();
    expect(got!.length).toBe(1);
    expect(got![0].validatorKey).toBe('pk1');
    expect(got![0].total).toBe(1000);
  });
});
