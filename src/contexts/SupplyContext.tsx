/**
 * React context for supply analytics data.
 * Provides centralized access to token supply, wallet holdings, and derived metrics.
 */

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { useTokenSupply, useWalletHoldings, useAssetPrices, useTreasuryBalances } from '@/lib/api';
import { marketCap, freeFloat, floatMarketCap, backingRatio, calculateExcludedHoldings } from '@/lib/utils';
import type { SupplyMetrics, WalletCategoryFilters, WalletHolding } from '@/lib/types';

interface SupplyContextValue {
  // Supply data
  totalIssued: number;
  staked: number;
  circulating: number;
  
  // Wallet holdings
  wallets: WalletHolding[];
  walletsByCategory: {
    foundation: WalletHolding[];
    amm: WalletHolding[];
    founder: WalletHolding[];
    desoBulls: WalletHolding[];
    treasury: WalletHolding[];
    cold: WalletHolding[];
  };
  
  // Filters
  filters: WalletCategoryFilters;
  setFilters: (filters: WalletCategoryFilters) => void;
  
  // Derived metrics
  freeFloat: number;
  floatMarketCap: number;
  marketCap: number;
  backingRatio: number;
  
  // Prices
  prices: {
    deso: number;
    btc: number;
    eth: number;
    sol: number;
    focus: number;
    openfund: number;
  };
  
  // Treasury
  btcAmount: number;
  ethAmount: number;
  solAmount: number;
  
  // Loading states
  isLoading: boolean;
  isLive: boolean;
}

const SupplyContext = createContext<SupplyContextValue | null>(null);

const DEFAULT_FILTERS: WalletCategoryFilters = {
  foundation: true,
  amm: true,
  founder: true,
  desoBulls: true,
  treasury: true,
  cold: true,
};

export function SupplyProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<WalletCategoryFilters>(DEFAULT_FILTERS);
  
  const supply = useTokenSupply();
  const { wallets, isLoading: walletsLoading, isLive: walletsLive } = useWalletHoldings();
  const { prices, isLoading: pricesLoading, isLive: pricesLive } = useAssetPrices();
  const { btcAmount, ethAmount, solAmount, isLoading: treasuryLoading, isLive: treasuryLive } = useTreasuryBalances();
  
  const walletsByCategory = useMemo(() => {
    return {
      foundation: wallets.filter((w) => w.category === 'FOUNDATION'),
      amm: wallets.filter((w) => w.category === 'AMM'),
      founder: wallets.filter((w) => w.category === 'FOUNDER'),
      desoBulls: wallets.filter((w) => w.category === 'DESO_BULL'),
      treasury: wallets.filter((w) => w.category === 'TREASURY'),
      cold: wallets.filter((w) => w.category === 'COLD'),
    };
  }, [wallets]);
  
  const metrics = useMemo(() => {
    const mcap = marketCap(supply, prices.deso);
    const excludedHoldings = calculateExcludedHoldings(wallets, filters);
    const float = freeFloat(supply.totalIssued, excludedHoldings);
    const floatMcap = floatMarketCap(supply.totalIssued, excludedHoldings, prices.deso);
    const backing = backingRatio(mcap, btcAmount, ethAmount, solAmount, prices);
    
    return {
      freeFloat: float,
      floatMarketCap: floatMcap,
      marketCap: mcap,
      backingRatio: backing,
    };
  }, [supply, wallets, filters, prices, btcAmount, ethAmount, solAmount]);
  
  const isLoading = supply.isLoading || walletsLoading || pricesLoading || treasuryLoading;
  const isLive = walletsLive && pricesLive && treasuryLive;
  
  const value: SupplyContextValue = {
    totalIssued: supply.totalIssued,
    staked: supply.staked,
    circulating: supply.circulating,
    wallets,
    walletsByCategory,
    filters,
    setFilters,
    ...metrics,
    prices,
    btcAmount,
    ethAmount,
    solAmount,
    isLoading,
    isLive,
  };
  
  return <SupplyContext.Provider value={value}>{children}</SupplyContext.Provider>;
}

export function useSupply() {
  const context = useContext(SupplyContext);
  if (!context) {
    throw new Error('useSupply must be used within SupplyProvider');
  }
  return context;
}
