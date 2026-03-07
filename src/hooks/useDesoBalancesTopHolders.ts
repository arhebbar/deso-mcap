/**
 * Top DESO balance holders from GraphQL desoBalances (filter balanceNanos > ~0.25 DESO).
 * Used to expand Token Holdings "Others" so Unaccounted shrinks.
 * For each account we fetch total DESO and staked DESO; other token holdings can be added later.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveData } from '@/hooks/useLiveData';
import {
  fetchDesoBalancesTopHolders,
  fetchBalancesForPublicKeys,
  getStakedTotalByPublicKeys,
  fetchUsernamesForPks,
} from '@/api/walletApi';

const FIRST = 1500;
const MIN_BALANCE_NANOS = 1_000_000_000_000; // 1K DESO – capture majority of large holders

export interface DesoBalanceHolder {
  name: string;
  pk: string;
  staked: number;
  unstaked: number;
  totalUsd: number;
  isNamed: boolean;
}

async function fetchHoldersWithBalances(): Promise<DesoBalanceHolder[]> {
  const nodes = await fetchDesoBalancesTopHolders(FIRST, MIN_BALANCE_NANOS);
  if (nodes.length === 0) return [];

  const pks = nodes.map((n) => n.publicKey);
  const [balanceByPk, stakedByPk, usernameByPk] = await Promise.all([
    fetchBalancesForPublicKeys(pks),
    getStakedTotalByPublicKeys(pks),
    fetchUsernamesForPks(pks),
  ]);

  const desoPrice = 1; // will be overwritten by useLiveData in hook
  return nodes.map((n) => {
    const totalDeso = balanceByPk.get(n.publicKey) ?? n.balanceDeso;
    const staked = stakedByPk.get(n.publicKey) ?? 0;
    const unstaked = Math.max(0, totalDeso - staked);
    const username = usernameByPk.get(n.publicKey);
    const name = username ?? `${n.publicKey.slice(0, 8)}…`;
    return {
      name,
      pk: n.publicKey,
      staked,
      unstaked,
      totalUsd: totalDeso * desoPrice,
      isNamed: !!username,
    };
  });
}

export function useDesoBalancesTopHolders(): {
  topHolders: DesoBalanceHolder[];
  isLoading: boolean;
} {
  const { marketData } = useLiveData();

  const { data: rawHolders, isLoading } = useQuery({
    queryKey: ['deso-balances-top-holders', FIRST, MIN_BALANCE_NANOS],
    queryFn: fetchHoldersWithBalances,
    staleTime: 5 * 60 * 1000,
  });

  const topHolders = useMemo(() => {
    if (!rawHolders?.length) return [];
    const price = marketData.desoPrice;
    return rawHolders
      .map((h) => ({ ...h, totalUsd: (h.staked + h.unstaked) * price }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [rawHolders, marketData.desoPrice]);

  return { topHolders, isLoading };
}
