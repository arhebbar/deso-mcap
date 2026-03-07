/**
 * Openfund/Focus holder rows for Token Holdings Others.
 * Fetches holders not in trackedPks and returns rows with balance, staked, Openfund, Focus.
 * Used to reduce Others-Unaccounted by listing token holders as individual rows.
 */

import { useQuery } from '@tanstack/react-query';
import { useLiveData } from '@/hooks/useLiveData';
import { useTrackedPublicKeys } from '@/hooks/useTrackedPublicKeys';
import { fetchOpenfundFocusHolderRows } from '@/api/walletApi';

export interface OpenfundFocusHolderRow {
  pk: string;
  name: string;
  staked: number;
  unstaked: number;
  Openfund: number;
  Focus: number;
  totalUsd: number;
  isNamed: boolean;
}

export function useOpenfundFocusHolderRows(): {
  holderRows: OpenfundFocusHolderRow[];
  isLoading: boolean;
} {
  const { trackedPks } = useTrackedPublicKeys();
  const { marketData } = useLiveData();

  const { data: rawRows = [], isLoading } = useQuery({
    queryKey: ['openfund-focus-holder-rows', trackedPks.size],
    queryFn: () => fetchOpenfundFocusHolderRows(trackedPks),
    enabled: trackedPks.size >= 0,
    staleTime: 5 * 60 * 1000,
  });

  const holderRows = rawRows.map((r) => ({
    ...r,
    totalUsd:
      (r.staked + r.unstaked) * marketData.desoPrice +
      r.Openfund * marketData.openfundPrice +
      r.Focus * marketData.focusPrice,
  }));

  return { holderRows, isLoading };
}
