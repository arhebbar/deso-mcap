/**
 * Centralized API layer for fetching on-chain supply, wallet balances, and prices.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchLivePrices } from '@/api/priceApi';
import { fetchWalletBalances } from '@/api/walletApi';
import { fetchTreasuryBalances } from '@/api/treasuryApi';
import { useStakedDesoData } from '@/hooks/useStakedDesoData';
import { MARKET_DATA } from '@/data/desoData';
import type { TokenSupply, WalletHolding, AssetPrice, WalletCategory } from './types';

/**
 * Fetch on-chain token supply data.
 */
export function useTokenSupply() {
  const stakedData = useStakedDesoData();
  
  const totalStaked = useQuery({
    queryKey: ['total-staked'],
    queryFn: async () => {
      let total = 0;
      for (const bucket of stakedData.validatorBuckets) {
        for (const row of bucket.foundation) total += row.amount;
        for (const row of bucket.community) total += row.amount;
      }
      return total;
    },
    enabled: stakedData.validatorBuckets.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    totalIssued: MARKET_DATA.desoTotalSupply,
    staked: totalStaked.data ?? MARKET_DATA.desoStaked,
    circulating: MARKET_DATA.desoTotalSupply,
    isLoading: totalStaked.isLoading,
  } as TokenSupply & { isLoading: boolean };
}

/**
 * Fetch wallet holdings grouped by category.
 */
export function useWalletHoldings() {
  const query = useQuery({
    queryKey: ['wallet-balances'],
    queryFn: fetchWalletBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const wallets: WalletHolding[] = (query.data ?? []).map((w) => {
    // Map walletApi classifications to our WalletCategory type
    let category: WalletCategory = w.classification as WalletCategory;
    // Handle any special mappings if needed (e.g., cold wallets)
    if (w.name.toLowerCase().includes('cold')) {
      category = 'COLD';
    }
    
    return {
      name: w.name,
      category,
      desoBalance: (w.desoStaked ?? 0) + (w.desoUnstaked ?? 0),
      desoStaked: w.desoStaked,
      desoUnstaked: w.desoUnstaked,
      tokenBalances: w.balances,
      usdValue: w.usdValue,
      stakedByValidator: w.stakedByValidator,
      ccv1ValueDeso: w.ccv1ValueDeso,
    };
  });

  return {
    wallets,
    isLoading: query.isLoading,
    isLive: query.data != null && query.data.length > 0,
  };
}

/**
 * Fetch asset prices (DESO, BTC, ETH, SOL, Focus, Openfund).
 */
export function useAssetPrices() {
  const query = useQuery({
    queryKey: ['live-prices'],
    queryFn: fetchLivePrices,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });

  const prices: AssetPrice = query.data
    ? {
        deso: query.data.desoPrice,
        btc: query.data.btcPrice,
        eth: query.data.ethPrice,
        sol: query.data.solPrice,
        focus: MARKET_DATA.focusPrice,
        openfund: MARKET_DATA.openfundPrice,
      }
    : {
        deso: MARKET_DATA.desoPrice,
        btc: MARKET_DATA.btcPrice,
        eth: MARKET_DATA.ethPrice,
        sol: MARKET_DATA.solPrice,
        focus: MARKET_DATA.focusPrice,
        openfund: MARKET_DATA.openfundPrice,
      };

  return {
    prices,
    isLoading: query.isLoading,
    isLive: query.data != null,
  };
}

/**
 * Fetch treasury balances (BTC, ETH, SOL).
 */
export function useTreasuryBalances() {
  const query = useQuery({
    queryKey: ['treasury-balances'],
    queryFn: fetchTreasuryBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return {
    btcAmount: query.data?.btcAmount ?? 0,
    ethAmount: query.data?.ethAmount ?? 0,
    solAmount: query.data?.solAmount ?? 0,
    isLoading: query.isLoading,
    isLive: query.data != null,
  };
}
