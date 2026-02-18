/**
 * Tests for utility functions in utils.ts
 */

import { describe, it, expect } from 'vitest';
import { freeFloat, calculateExcludedHoldings, floatMarketCap } from './utils';
import type { WalletHolding, WalletCategoryFilters } from './types';

describe('freeFloat', () => {
  it('should calculate free float correctly when excluded holdings are less than total issued', () => {
    const totalIssued = 12_200_000;
    const excludedHoldings = 2_000_000;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(10_200_000);
  });

  it('should return 0 when excluded holdings exceed total issued', () => {
    const totalIssued = 10_000_000;
    const excludedHoldings = 15_000_000;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(0);
  });

  it('should return total issued when excluded holdings is 0', () => {
    const totalIssued = 12_200_000;
    const excludedHoldings = 0;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(12_200_000);
  });

  it('should return 0 when total issued is 0', () => {
    const totalIssued = 0;
    const excludedHoldings = 1_000_000;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(0);
  });

  it('should handle negative excluded holdings (should not happen but defensive)', () => {
    const totalIssued = 10_000_000;
    const excludedHoldings = -1_000_000;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(11_000_000); // Math.max(0, 10M - (-1M)) = 11M
  });

  it('should handle very large numbers', () => {
    const totalIssued = 1_000_000_000_000;
    const excludedHoldings = 500_000_000_000;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBe(500_000_000_000);
  });

  it('should handle floating point precision', () => {
    const totalIssued = 12_200_000.5;
    const excludedHoldings = 2_000_000.3;
    const result = freeFloat(totalIssued, excludedHoldings);
    expect(result).toBeCloseTo(10_200_000.2, 5);
  });
});

describe('calculateExcludedHoldings', () => {
  const createWallet = (
    name: string,
    category: WalletHolding['category'],
    desoBalance: number
  ): WalletHolding => ({
    name,
    category,
    desoBalance,
    tokenBalances: {},
    usdValue: 0,
  });

  it('should sum holdings from excluded categories only', () => {
    const wallets: WalletHolding[] = [
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
      createWallet('foundation2', 'FOUNDATION', 500_000),
      createWallet('amm1', 'AMM', 2_000_000),
      createWallet('founder1', 'FOUNDER', 300_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: false, // Excluded
      amm: true, // Included
      founder: false, // Excluded
      desoBulls: true,
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    // foundation1 + foundation2 + founder1 = 1M + 500K + 300K = 1.8M
    expect(result).toBe(1_800_000);
  });

  it('should return 0 when all categories are included', () => {
    const wallets: WalletHolding[] = [
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
      createWallet('amm1', 'AMM', 2_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: true,
      amm: true,
      founder: true,
      desoBulls: true,
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(0);
  });

  it('should return sum of all wallets when all categories are excluded', () => {
    const wallets: WalletHolding[] = [
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
      createWallet('amm1', 'AMM', 2_000_000),
      createWallet('founder1', 'FOUNDER', 500_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: false,
      amm: false,
      founder: false,
      desoBulls: false,
      treasury: false,
      cold: false,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(3_500_000);
  });

  it('should handle empty wallets array', () => {
    const wallets: WalletHolding[] = [];
    const filters: WalletCategoryFilters = {
      foundation: false,
      amm: false,
      founder: false,
      desoBulls: false,
      treasury: false,
      cold: false,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(0);
  });

  it('should handle wallets with zero balance', () => {
    const wallets: WalletHolding[] = [
      createWallet('foundation1', 'FOUNDATION', 0),
      createWallet('foundation2', 'FOUNDATION', 1_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: false,
      amm: true,
      founder: true,
      desoBulls: true,
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(1_000_000);
  });

  it('should handle TREASURY and COLD categories', () => {
    const wallets: WalletHolding[] = [
      createWallet('treasury1', 'TREASURY', 5_000_000),
      createWallet('cold1', 'COLD', 3_000_000),
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: true,
      amm: true,
      founder: true,
      desoBulls: true,
      treasury: false, // Excluded
      cold: false, // Excluded
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(8_000_000); // treasury + cold
  });

  it('should handle DESO_BULL category', () => {
    const wallets: WalletHolding[] = [
      createWallet('bull1', 'DESO_BULL', 100_000),
      createWallet('bull2', 'DESO_BULL', 200_000),
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: true,
      amm: true,
      founder: true,
      desoBulls: false, // Excluded
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(300_000); // bull1 + bull2
  });

  it('should handle EXTERNAL category (not filtered, always included)', () => {
    const wallets: WalletHolding[] = [
      createWallet('external1', 'EXTERNAL', 500_000),
      createWallet('foundation1', 'FOUNDATION', 1_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: false,
      amm: true,
      founder: true,
      desoBulls: true,
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    // EXTERNAL is not in filters, so it's not excluded
    expect(result).toBe(1_000_000); // Only foundation1
  });

  it('should handle wallets with negative balance (defensive)', () => {
    const wallets: WalletHolding[] = [
      createWallet('foundation1', 'FOUNDATION', -100_000),
      createWallet('foundation2', 'FOUNDATION', 1_000_000),
    ];

    const filters: WalletCategoryFilters = {
      foundation: false,
      amm: true,
      founder: true,
      desoBulls: true,
      treasury: true,
      cold: true,
    };

    const result = calculateExcludedHoldings(wallets, filters);
    expect(result).toBe(-100_000 + 1_000_000); // 900_000
  });
});

describe('floatMarketCap', () => {
  it('should calculate float market cap correctly', () => {
    const totalIssued = 12_200_000;
    const excludedHoldings = 2_000_000;
    const price = 5.78;
    const result = floatMarketCap(totalIssued, excludedHoldings, price);
    const expectedFloat = 12_200_000 - 2_000_000; // 10_200_000
    expect(result).toBe(expectedFloat * price);
  });

  it('should return 0 when excluded holdings exceed total issued', () => {
    const totalIssued = 10_000_000;
    const excludedHoldings = 15_000_000;
    const price = 5.78;
    const result = floatMarketCap(totalIssued, excludedHoldings, price);
    expect(result).toBe(0);
  });

  it('should handle zero price', () => {
    const totalIssued = 10_000_000;
    const excludedHoldings = 2_000_000;
    const price = 0;
    const result = floatMarketCap(totalIssued, excludedHoldings, price);
    expect(result).toBe(0);
  });
});
