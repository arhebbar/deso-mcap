/**
 * Public keys of Foundation, AMM, Core Team, DeSo Bulls.
 * Used to exclude from Token Holdings Others (avoid double-counting e.g. Focus_Floor_Bid).
 */

import { useQuery } from '@tanstack/react-query';
import { fetchTrackedPublicKeys } from '@/api/walletApi';

export function useTrackedPublicKeys(): {
  trackedPks: Set<string>;
  isLoading: boolean;
} {
  const { data: trackedPks = new Set<string>(), isLoading } = useQuery({
    queryKey: ['tracked-public-keys'],
    queryFn: fetchTrackedPublicKeys,
    staleTime: 10 * 60 * 1000,
  });

  return { trackedPks, isLoading };
}
