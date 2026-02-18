/**
 * Regression: No blank values in any field.
 * Cached/static fallbacks must produce non-blank display values.
 */

import { describe, it, expect } from 'vitest';
import { formatUsd, formatPercent, formatRatio } from '@/lib/formatters';
import { MARKET_DATA, EXTERNAL_TREASURY, calcMarketCap, calcFreeFloat, calcTreasuryCoverage, calcDusdcBackingRatio } from '@/data/desoData';
import { getTreasuryTotalsFromCache } from '@/lib/treasuryCache';

describe('1. Blank values – formatters never return empty or invalid', () => {
  it('formatUsd never returns blank for finite numbers', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(1)).toBe('$1.00');
    expect(formatUsd(1000)).toMatch(/^\$[\d.]+\w?$/);
    expect(formatUsd(1000000)).toMatch(/^\$[\d.]+M$/);
  });

  it('formatPercent never returns blank for finite numbers', () => {
    expect(formatPercent(0)).toMatch(/%$/);
    expect(formatPercent(0.5)).toMatch(/%$/);
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('formatRatio never returns blank for finite numbers', () => {
    expect(formatRatio(0)).toMatch(/x$/);
    expect(formatRatio(1.5)).toMatch(/x$/);
  });
});

describe('2. Blank values – static data produces non-zero KPIs', () => {
  it('MARKET_DATA has valid numbers for display', () => {
    expect(MARKET_DATA.desoPrice).toBeGreaterThan(0);
    expect(MARKET_DATA.desoTotalSupply).toBeGreaterThan(0);
    expect(MARKET_DATA.desoStaked).toBeGreaterThanOrEqual(0);
    expect(MARKET_DATA.btcPrice).toBeGreaterThan(0);
  });

  it('calcMarketCap with MARKET_DATA returns positive number', () => {
    const cap = calcMarketCap(MARKET_DATA);
    expect(cap).toBeGreaterThan(0);
    expect(formatUsd(cap)).not.toBe('');
  });

  it('calcFreeFloat returns non-negative number', () => {
    const ff = calcFreeFloat(MARKET_DATA, 100000, 500000, 50000);
    expect(ff).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(ff)).toBe(false);
  });

  it('EXTERNAL_TREASURY provides fallback for BTC Treasury', () => {
    expect(EXTERNAL_TREASURY.btcHoldings).toBeGreaterThanOrEqual(0);
    expect(EXTERNAL_TREASURY.totalUsdc).toBeGreaterThanOrEqual(0);
  });

  it('Treasury coverage produces valid ratio', () => {
    const ratio = calcTreasuryCoverage(MARKET_DATA);
    expect(typeof ratio).toBe('number');
    expect(Number.isNaN(ratio)).toBe(false);
    expect(formatRatio(ratio)).not.toBe('');
  });

  it('dUSDC backing ratio returns a number', () => {
    const r = calcDusdcBackingRatio(6590000);
    expect(typeof r).toBe('number');
    expect(Number.isNaN(r)).toBe(false);
  });
});

describe('3. Treasury cache fallback shape', () => {
  it('getTreasuryTotalsFromCache returns null or object with btc, eth, sol', () => {
    const tot = getTreasuryTotalsFromCache();
    if (tot !== null) {
      expect(tot).toHaveProperty('btc');
      expect(tot).toHaveProperty('eth');
      expect(tot).toHaveProperty('sol');
    }
  });
});
