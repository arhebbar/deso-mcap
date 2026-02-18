/**
 * Regression: Cached values must be used when API returns nothing;
 * no blank when live data is not yet retrieved.
 */

import { describe, it, expect } from 'vitest';
import { EXTERNAL_TREASURY, MARKET_DATA } from '@/data/desoData';
import { formatUsd } from '@/lib/formatters';

describe('5. Cached vs live – fallbacks prevent blank', () => {
  it('BTC Treasury fallback: static btcHoldings is positive', () => {
    expect(EXTERNAL_TREASURY.btcHoldings).toBeGreaterThan(0);
    const btcValue = EXTERNAL_TREASURY.btcHoldings * MARKET_DATA.btcPrice;
    expect(btcValue).toBeGreaterThan(0);
    expect(formatUsd(btcValue)).not.toBe('$0.00');
  });

  it('ETH/SOL fallbacks exist for treasury', () => {
    const ethTotal = EXTERNAL_TREASURY.ethHotWallet + EXTERNAL_TREASURY.ethColdWallet;
    expect(typeof ethTotal).toBe('number');
    expect(ethTotal).toBeGreaterThanOrEqual(0);
    expect(typeof EXTERNAL_TREASURY.solColdWallet).toBe('number');
  });

  it('Market data fallback: desoPrice and supply are positive', () => {
    expect(MARKET_DATA.desoPrice).toBeGreaterThan(0);
    expect(MARKET_DATA.desoTotalSupply).toBeGreaterThan(0);
  });
});
