/**
 * Map of publicKey -> classification for tracked accounts.
 * Used for Early Block Rewardees Category column.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchTrackedClassifications } from '@/api/walletApi';

export function useTrackedClassifications(): {
  classifications: Map<string, string>;
  isLoading: boolean;
} {
  const { data: classifications = new Map<string, string>(), isLoading } = useQuery({
    queryKey: ['tracked-classifications'],
    queryFn: fetchTrackedClassifications,
    staleTime: 10 * 60 * 1000,
  });

  return { classifications, isLoading };
}
