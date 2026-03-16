/**
 * Top stakers from stakeEntries (ordered by stake amount).
 * Used to add accounts to Token Holdings Others for review and classification.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveData } from '@/hooks/useLiveData';
import {
  fetchStakeEntriesTopStakers,
  fetchBalancesForPublicKeys,
} from '@/api/walletApi';

/** Fetch all stake-entry stakers for Others review/classification. */
const LIMIT = 50_000;

export interface StakeEntryHolder {
  name: string;
  pk: string;
  staked: number;
  unstaked: number;
  totalUsd: number;
  isNamed: boolean;
}

/** Usernames are resolved via useOthersUsernames (cached) in Token Holdings table. */
async function fetchHoldersWithBalances(): Promise<StakeEntryHolder[]> {
  const stakers = await fetchStakeEntriesTopStakers(LIMIT);
  if (stakers.length === 0) return [];

  const pks = stakers.map((s) => s.pk);
  const balanceByPk = await fetchBalancesForPublicKeys(pks);

  const desoPrice = 1;
  return stakers.map((s) => {
    const totalDeso = balanceByPk.get(s.pk) ?? s.staked;
    const unstaked = Math.max(0, totalDeso - s.staked);
    const name = `${s.pk.slice(0, 8)}…`;
    return {
      name,
      pk: s.pk,
      staked: s.staked,
      unstaked,
      totalUsd: totalDeso * desoPrice,
      isNamed: false,
    };
  });
}

export function useStakeEntriesTopStakers(): {
  topStakers: StakeEntryHolder[];
  isLoading: boolean;
} {
  const { marketData } = useLiveData();

  const { data: rawHolders, isLoading } = useQuery({
    queryKey: ['stake-entries-top-stakers', LIMIT],
    queryFn: fetchHoldersWithBalances,
    staleTime: 5 * 60 * 1000,
  });

  const topStakers = useMemo(() => {
    if (!rawHolders?.length) return [];
    const price = marketData.desoPrice;
    return rawHolders
      .map((h) => ({ ...h, totalUsd: (h.staked + h.unstaked) * price }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [rawHolders, marketData.desoPrice]);

  return { topStakers, isLoading };
}
