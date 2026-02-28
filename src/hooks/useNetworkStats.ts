/**
 * Network stats for Analytics (block height, node health, mempool/next-block count).
 */

import { useQuery } from '@tanstack/react-query';
import { fetchNetworkStats, NetworkStats } from '@/api/networkStatsApi';
import { getCachedValue } from '@/utils/localCache';

const STALE_MS = 60 * 1000;

export function useNetworkStats() {
  const initialData = getCachedValue<NetworkStats>('network-stats-cache-v1') ?? undefined;

  const q = useQuery({
    queryKey: ['network-stats'],
    queryFn: fetchNetworkStats,
    staleTime: STALE_MS,
    initialData,
  });
  return {
    blockHeight: q.data?.blockHeight ?? null,
    nodeSynced: q.data?.nodeSynced ?? null,
    nodeReachable: q.data?.nodeReachable ?? false,
    mempoolOrNextBlockTxnCount: q.data?.mempoolOrNextBlockTxnCount ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
