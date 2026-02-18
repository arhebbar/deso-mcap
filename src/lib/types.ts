/**
 * Centralized type definitions for the analytics dashboard.
 */

export type WalletCategory = 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'EXTERNAL' | 'TREASURY' | 'COLD';

export interface TokenSupply {
  /** Total tokens issued (on-chain total supply) */
  totalIssued: number;
  /** Tokens currently staked */
  staked: number;
  /** Tokens in circulation (totalIssued - locked/treasury) */
  circulating: number;
}

export interface WalletHolding {
  name: string;
  category: WalletCategory;
  /** DESO balance */
  desoBalance: number;
  /** Staked DESO amount */
  desoStaked?: number;
  /** Unstaked DESO amount */
  desoUnstaked?: number;
  /** Other token balances (Openfund, Focus, dUSDC, etc.) */
  tokenBalances: Record<string, number>;
  /** Total USD value */
  usdValue: number;
  /** Per-validator stake breakdown */
  stakedByValidator?: Array<{ validatorPk: string; validatorName?: string; amount: number }>;
  /** CCv1 value in DESO */
  ccv1ValueDeso?: number;
}

export interface AssetPrice {
  deso: number;
  btc: number;
  eth: number;
  sol: number;
  focus: number;
  openfund: number;
}

export interface SupplyMetrics {
  /** Total issued supply */
  totalIssued: number;
  /** Staked amount */
  staked: number;
  /** Circulating supply */
  circulating: number;
  /** Free float (circulating - locked wallets) */
  freeFloat: number;
  /** Float-adjusted market cap */
  floatMarketCap: number;
  /** Full market cap */
  marketCap: number;
}

export interface WalletCategoryFilters {
  foundation: boolean;
  amm: boolean;
  founder: boolean;
  desoBulls: boolean;
  treasury: boolean;
  cold: boolean;
}
