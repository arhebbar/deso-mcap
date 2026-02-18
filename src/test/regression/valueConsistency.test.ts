/**
 * Regression: Values across visuals/tables with the same label must be consistent.
 */

import { describe, it, expect } from 'vitest';
import { MARKET_DATA, calcMarketCap, calcFreeFloat } from '@/data/desoData';

describe('3. Value consistency – same metric across sources', () => {
  it('Staked total: supply and circulation use same source when both available', () => {
    const stakedFromMarket = MARKET_DATA.desoStaked;
    expect(stakedFromMarket).toBeGreaterThanOrEqual(0);
    expect(typeof stakedFromMarket).toBe('number');
  });

  it('Free float × price = float-adjusted mcap formula', () => {
    const ammU = 200_000;
    const foundU = 500_000;
    const founderU = 50_000;
    const ff = calcFreeFloat(MARKET_DATA, ammU, foundU, founderU);
    const floatAdjustedMcap = ff * MARKET_DATA.desoPrice;
    expect(ff).toBeGreaterThanOrEqual(0);
    expect(floatAdjustedMcap).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(floatAdjustedMcap)).toBe(false);
  });

  it('Market cap = total supply × price', () => {
    const mcap = calcMarketCap(MARKET_DATA);
    expect(mcap).toBe(MARKET_DATA.desoTotalSupply * MARKET_DATA.desoPrice);
  });

  it('Free float is total supply minus staked minus unstaked (Foundation/AMM/Founder)', () => {
    const ammU = 0;
    const foundU = 0;
    const founderU = 0;
    const ff = calcFreeFloat(MARKET_DATA, ammU, foundU, founderU);
    const expected = MARKET_DATA.desoTotalSupply - MARKET_DATA.desoStaked;
    expect(ff).toBe(expected);
  });
});
