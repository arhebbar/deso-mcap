import { useQuery } from '@tanstack/react-query';
import { fetchAllStakedDeso } from '@/api/walletApi';

export function useStakedDesoData() {
  const query = useQuery({
    queryKey: ['all-staked-deso'],
    queryFn: fetchAllStakedDeso,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return {
    validatorBuckets: query.data ?? [],
    isLoading: query.isLoading,
    isLive: !!query.data,
  };
}
