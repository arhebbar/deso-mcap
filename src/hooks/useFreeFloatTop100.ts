/**
 * Top 100 free-float accounts (untracked / community stakers) sorted by total USD.
 * Used by Token Holdings "Others" section and can be used by Free Float section.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveData } from '@/hooks/useLiveData';
import { useStakedDesoData } from '@/hooks/useStakedDesoData';
import { fetchBalancesForPublicKeys } from '@/api/walletApi';

const TOP_N = 100;

export interface FreeFloatAccount {
  name: string;
  pk: string;
  staked: number;
  unstaked: number;
  totalUsd: number;
  /** True if wallet has a chain-resolved username (not anonymous) */
  isNamed: boolean;
}

export function useFreeFloatTop100(): { top100: FreeFloatAccount[]; isLoading: boolean } {
  const { marketData } = useLiveData();
  const { validatorBuckets, isLoading: stakedLoading } = useStakedDesoData();

  const communityPks = useMemo(() => {
    const pks = new Set<string>();
    for (const b of validatorBuckets) {
      for (const r of [...b.foundation, ...b.community]) {
        if (r.classification === 'COMMUNITY') pks.add(r.stakerPk);
      }
    }
    return Array.from(pks);
  }, [validatorBuckets]);

  const { data: balanceByPk, isLoading: balanceLoading } = useQuery({
    queryKey: ['free-float-balances', communityPks.slice(0, 500).sort().join(',')],
    queryFn: () => fetchBalancesForPublicKeys(communityPks),
    enabled: communityPks.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const top100 = useMemo(() => {
    const byPk = new Map<string, { name: string; pk: string; staked: number; unstaked: number; isNamed: boolean }>();
    for (const b of validatorBuckets) {
      for (const r of [...b.foundation, ...b.community]) {
        if (r.classification !== 'COMMUNITY') continue;
        const cur = byPk.get(r.stakerPk);
        const name = r.stakerName || `${r.stakerPk.slice(0, 8)}…`;
        const isNamed = r.hasUsername;
        if (cur) {
          byPk.set(r.stakerPk, { ...cur, staked: cur.staked + r.amount, isNamed: cur.isNamed || isNamed });
        } else {
          byPk.set(r.stakerPk, { name, pk: r.stakerPk, staked: r.amount, unstaked: 0, isNamed });
        }
      }
    }
    for (const [pk, w] of byPk) {
      const totalDeso = balanceByPk?.get(pk) ?? 0;
      w.unstaked = Math.max(0, totalDeso - w.staked);
    }
    const list = Array.from(byPk.values()).map((w) => ({
      name: w.name,
      pk: w.pk,
      staked: w.staked,
      unstaked: w.unstaked,
      totalUsd: (w.staked + w.unstaked) * marketData.desoPrice,
      isNamed: w.isNamed,
    }));
    list.sort((a, b) => b.totalUsd - a.totalUsd);
    return list.slice(0, TOP_N);
  }, [validatorBuckets, balanceByPk, marketData.desoPrice]);

  return { top100, isLoading: stakedLoading || (communityPks.length > 0 && balanceLoading) };
}
