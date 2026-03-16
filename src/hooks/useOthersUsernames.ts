/**
 * Fetches and caches usernames for all "Others" in Token Holdings table.
 * Sources: freeFloatTop100, desoBalancesHolders, stakeEntriesStakers, CCV1_OTHERS_ENTRIES.
 * Uses localStorage cache to avoid redundant fetchUsernamesForPks calls.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsernamesForPks } from '@/api/walletApi';
import { CCV1_OTHERS_ENTRIES } from '@/data/ccv1OthersEntries';
import { getOthersUsernamesCache, setOthersUsernamesCache } from '@/lib/othersUsernamesCache';

export interface OthersPksInput {
  freeFloatTop100: Array<{ pk: string }>;
  desoBalancesHolders: Array<{ pk: string }>;
  stakeEntriesStakers: Array<{ pk: string }>;
  excludeFromOthersPks: Set<string>;
}

/** Collect all public keys from Others sources (excludes tracked + core stakers). */
export function collectOthersPks(input: OthersPksInput): string[] {
  const { freeFloatTop100, desoBalancesHolders, stakeEntriesStakers, excludeFromOthersPks } = input;
  const pks = new Set<string>();
  for (const w of freeFloatTop100) {
    if (!excludeFromOthersPks.has(w.pk)) pks.add(w.pk);
  }
  for (const h of desoBalancesHolders) {
    if (!excludeFromOthersPks.has(h.pk)) pks.add(h.pk);
  }
  for (const s of stakeEntriesStakers) {
    if (!excludeFromOthersPks.has(s.pk)) pks.add(s.pk);
  }
  for (const e of CCV1_OTHERS_ENTRIES) {
    if (e.publicKeyBase58Check) pks.add(e.publicKeyBase58Check);
  }
  return Array.from(pks);
}

export function useOthersUsernames(pks: string[]): {
  usernameByPk: Map<string, string>;
  isLoading: boolean;
} {
  const pksKey = useMemo(() => `${pks.length}:${pks.slice(0, 20).join(',')}`, [pks]);

  const { data: fetchedMap, isLoading } = useQuery({
    queryKey: ['others-usernames', pksKey],
    queryFn: async () => {
      const cache = getOthersUsernamesCache();
      const toFetch = pks.filter((pk) => !cache.has(pk));
      if (toFetch.length === 0) return cache;

      const fresh = await fetchUsernamesForPks(toFetch);
      setOthersUsernamesCache(fresh);
      const merged = new Map(cache);
      for (const [pk, username] of fresh) {
        if (username) merged.set(pk, username);
      }
      return merged;
    },
    enabled: pks.length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 1 week – cache is source of truth
    placeholderData: () => getOthersUsernamesCache(),
  });

  const usernameByPk = useMemo(() => {
    const cache = getOthersUsernamesCache();
    const fromQuery = fetchedMap ?? cache;
    const result = new Map<string, string>();
    for (const pk of pks) {
      const username = fromQuery.get(pk);
      if (username) result.set(pk, username);
    }
    return result;
  }, [pks, fetchedMap]);

  return { usernameByPk, isLoading };
}
