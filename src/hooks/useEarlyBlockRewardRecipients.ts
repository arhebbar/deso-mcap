import { useQuery } from '@tanstack/react-query';
import { fetchEarlyBlockRewardRecipients } from '@/api/earlyBlockRewardeesApi';

export function useEarlyBlockRewardRecipients() {
  return useQuery({
    queryKey: ['early-block-reward-recipients'],
    queryFn: fetchEarlyBlockRewardRecipients,
    staleTime: 1000 * 60 * 60, // 1 hour - data is historical
  });
}
