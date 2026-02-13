import { useQuery } from '@tanstack/react-query';
import { fetchTreasuryBalances, fetchTreasuryBalancesPerAddress, STATIC_TREASURY_ADDRESSES } from '@/api/treasuryApi';

/**
 * Fetches external treasury balances (BTC, ETH, SOL) from blockchain APIs.
 */
export function useTreasuryData() {
  const query = useQuery({
    queryKey: ['treasury-balances'],
    queryFn: fetchTreasuryBalances,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const data = query.data;

  return {
    btcAmount: data?.btcAmount ?? 0,
    ethAmount: data?.ethAmount ?? 0,
    solAmount: data?.solAmount ?? 0,
    isLoading: query.isLoading,
    isLive: !!data,
  };
}

/**
 * Fetches per-address treasury balances for display in the External Treasury table.
 * Falls back to static data when API fails (CORS, network, etc.).
 */
export function useTreasuryAddresses() {
  const query = useQuery({
    queryKey: ['treasury-addresses'],
    queryFn: fetchTreasuryBalancesPerAddress,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const hasData = query.data && query.data.length > 0;
  const addresses = hasData ? query.data : STATIC_TREASURY_ADDRESSES;

  return {
    addresses,
    isLoading: query.isLoading,
    isLive: hasData,
  };
}
