/**
 * Utility functions for calculating market metrics.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TokenSupply, WalletHolding, AssetPrice, WalletCategoryFilters } from './types';

/**
 * Merge class names with Tailwind CSS support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate market cap: totalIssued × price
 */
export function marketCap(supply: TokenSupply, price: number): number {
  return supply.totalIssued * price;
}

/**
 * Calculate sum of excluded holdings based on filter toggles.
 * Returns the total DESO balance of wallets whose categories are excluded (toggle = false).
 */
export function calculateExcludedHoldings(
  wallets: WalletHolding[],
  filters: WalletCategoryFilters
): number {
  let excluded = 0;
  
  for (const wallet of wallets) {
    const isExcluded =
      (wallet.category === 'FOUNDATION' && !filters.foundation) ||
      (wallet.category === 'AMM' && !filters.amm) ||
      (wallet.category === 'FOUNDER' && !filters.founder) ||
      (wallet.category === 'DESO_BULL' && !filters.desoBulls) ||
      (wallet.category === 'TREASURY' && !filters.treasury) ||
      (wallet.category === 'COLD' && !filters.cold);
    
    if (isExcluded) {
      excluded += wallet.desoBalance;
    }
  }
  
  return excluded;
}

/**
 * Calculate free float: totalIssued - excludedHoldings
 * 
 * @param totalIssued - Total tokens issued (on-chain total supply)
 * @param excludedHoldings - Sum of DESO balances from excluded wallet categories (based on filter toggles)
 * @returns Free float amount (never negative)
 * 
 * @example
 * ```ts
 * const totalIssued = 12_200_000;
 * const excludedHoldings = 2_000_000; // Sum of wallets with toggles OFF
 * const float = freeFloat(totalIssued, excludedHoldings); // 10_200_000
 * ```
 */
export function freeFloat(
  totalIssued: number,
  excludedHoldings: number
): number {
  return Math.max(0, totalIssued - excludedHoldings);
}

/**
 * Calculate float-adjusted market cap: freeFloat × price
 */
export function floatMarketCap(
  totalIssued: number,
  excludedHoldings: number,
  price: number
): number {
  const float = freeFloat(totalIssued, excludedHoldings);
  return float * price;
}

/**
 * Calculate backing ratio: treasury value / market cap
 */
export function backingRatio(
  marketCap: number,
  treasuryBtc: number,
  treasuryEth: number,
  treasurySol: number,
  prices: AssetPrice
): number {
  const treasuryValue =
    treasuryBtc * prices.btc +
    treasuryEth * prices.eth +
    treasurySol * prices.sol;
  return marketCap > 0 ? treasuryValue / marketCap : 0;
}

/**
 * Get wallets by category
 */
export function getWalletsByCategory(
  wallets: WalletHolding[],
  category: WalletHolding['category']
): WalletHolding[] {
  return wallets.filter((w) => w.category === category);
}

/**
 * Sum DESO balance for wallets matching filters
 */
export function sumDesoBalance(
  wallets: WalletHolding[],
  filters: WalletCategoryFilters
): number {
  return wallets
    .filter((w) => {
      if (w.category === 'FOUNDATION') return filters.foundation;
      if (w.category === 'AMM') return filters.amm;
      if (w.category === 'FOUNDER') return filters.founder;
      if (w.category === 'DESO_BULL') return filters.desoBulls;
      if (w.category === 'TREASURY') return filters.treasury;
      if (w.category === 'COLD') return filters.cold;
      return true;
    })
    .reduce((sum, w) => sum + w.desoBalance, 0);
}
