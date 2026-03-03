/**
 * Fetches Openfund and Focus holder map (pk -> {Openfund, Focus}).
 * Used by Token Holdings to show Openfund/Focus for Others (free-float, desoBalances) rows.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchOpenfundFocusHolderMap } from '@/api/walletApi';

export function useOpenfundFocusHolders(): {
  holderMap: Map<string, { Openfund: number; Focus: number }>;
  isLoading: boolean;
} {
  const { data: holderMap = new Map(), isLoading } = useQuery({
    queryKey: ['openfund-focus-holders'],
    queryFn: fetchOpenfundFocusHolderMap,
    staleTime: 5 * 60 * 1000,
  });

  return { holderMap, isLoading };
}
