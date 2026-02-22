import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllStakedDeso } from '@/api/walletApi';
import { getStakedCache, setStakedCache } from '@/lib/stakedCache';

export function useStakedDesoData() {
  const query = useQuery({
    queryKey: ['all-staked-deso'],
    queryFn: fetchAllStakedDeso,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    placeholderData: () => getStakedCache() ?? undefined,
  });

  useEffect(() => {
    if (query.data?.length) setStakedCache(query.data);
  }, [query.data]);

  return {
    validatorBuckets: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isLive: !!query.data,
  };
}
