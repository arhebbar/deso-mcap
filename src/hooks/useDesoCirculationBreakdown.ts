import { useMemo } from 'react';
import { useWalletData } from './useWalletData';
import { useStakedDesoData } from './useStakedDesoData';
import { useLiveData } from './useLiveData';
import type { AllStakedDesoBucket } from '@/api/walletApi';

export interface CirculationNode {
  label: string;
  amount: number;
  children?: CirculationNode[];
}

function sumStakesByClassification(buckets: AllStakedDesoBucket[]) {
  const core = { foundation: 0, coreTeam: 0, desoBulls: 0, freeFloat: 0 };
  const community = { foundation: 0, coreTeam: 0, desoBulls: 0, freeFloat: 0 };
  for (const b of buckets) {
    const target = b.validatorType === 'core' ? core : community;
    for (const r of b.foundation) {
      if (r.classification === 'FOUNDER') target.coreTeam += r.amount;
      else target.foundation += r.amount; // FOUNDATION, AMM
    }
    for (const r of b.community) {
      if (r.classification === 'DESO_BULL') target.desoBulls += r.amount;
      else target.freeFloat += r.amount; // COMMUNITY
    }
  }
  return { core, community };
}

export function useDesoCirculationBreakdown() {
  const walletData = useWalletData();
  const stakedData = useStakedDesoData();
  const { marketData } = useLiveData();

  const breakdown = useMemo(() => {
    const totalSupply = marketData.desoTotalSupply;

    const { core: coreStaked, community: communityStaked } = sumStakesByClassification(
      stakedData.validatorBuckets
    );

    const totalStaked =
      coreStaked.foundation + coreStaked.coreTeam + coreStaked.desoBulls + coreStaked.freeFloat +
      communityStaked.foundation + communityStaked.coreTeam + communityStaked.desoBulls + communityStaked.freeFloat;

    const {
      ammDeso,
      foundationDeso,
      founderDeso,
      desoBullsDeso,
      ammWallets,
      ccv1TotalDeso,
    } = walletData;

    const ammOpenfundDeso = ammWallets
      .filter((w) => w.name.includes('openfund'))
      .reduce((s, w) => s + (w.balances.DESO || 0), 0);
    const ammFocusDeso = ammWallets
      .filter((w) => w.name.includes('focus'))
      .reduce((s, w) => s + (w.balances.DESO || 0), 0);
    const ammDesoOnly = ammDeso - ammOpenfundDeso - ammFocusDeso;

    const foundationUnstaked = Math.max(0, foundationDeso - coreStaked.foundation - communityStaked.foundation);
    const founderUnstaked = Math.max(0, founderDeso - coreStaked.coreTeam - communityStaked.coreTeam);
    const desoBullsUnstaked = Math.max(0, desoBullsDeso - coreStaked.desoBulls - communityStaked.desoBulls);

    const accounted =
      totalStaked +
      ccv1TotalDeso +
      ammOpenfundDeso +
      ammFocusDeso +
      ammDesoOnly +
      foundationUnstaked +
      founderUnstaked +
      desoBullsUnstaked;
    const freeFloatUnstaked = Math.max(0, totalSupply - accounted);

    const stakedNode: CirculationNode = {
      label: 'Staked',
      amount: totalStaked,
      children: [
        {
          label: 'Core Validators',
          amount: coreStaked.foundation + coreStaked.coreTeam + coreStaked.desoBulls + coreStaked.freeFloat,
          children: [
            { label: 'Foundation', amount: coreStaked.foundation },
            { label: 'Core Team', amount: coreStaked.coreTeam },
            { label: 'DeSo Bulls', amount: coreStaked.desoBulls },
            { label: 'Free Float', amount: coreStaked.freeFloat },
          ],
        },
        {
          label: 'Community Validators',
          amount: communityStaked.foundation + communityStaked.coreTeam + communityStaked.desoBulls + communityStaked.freeFloat,
          children: [
            { label: 'Foundation', amount: communityStaked.foundation },
            { label: 'Core Team', amount: communityStaked.coreTeam },
            { label: 'DeSo Bulls', amount: communityStaked.desoBulls },
            { label: 'Free Float', amount: communityStaked.freeFloat },
          ],
        },
      ],
    };

    const notStakedNode: CirculationNode = {
      label: 'Not Staked',
      amount: totalSupply - totalStaked,
      children: [
        { label: 'Creator Coins v1', amount: ccv1TotalDeso },
        { label: 'Openfund Tokens bought using DESO - Core + Community', amount: ammOpenfundDeso },
        { label: 'Focus Tokens bought using DESO - Core + Community', amount: ammFocusDeso },
        {
          label: 'DESO',
          amount: foundationUnstaked + founderUnstaked + desoBullsUnstaked + freeFloatUnstaked + ammDesoOnly,
          children: [
            { label: 'Foundation', amount: foundationUnstaked },
            { label: 'Core Team', amount: founderUnstaked },
            { label: 'DeSo Bulls', amount: desoBullsUnstaked },
            { label: 'Free Float', amount: freeFloatUnstaked + ammDesoOnly },
          ],
        },
      ],
    };

    return {
      total: totalSupply,
      root: [stakedNode, notStakedNode],
      isLoading: walletData.isLoading || stakedData.isLoading,
    };
  }, [
    marketData.desoTotalSupply,
    stakedData.validatorBuckets,
    walletData.ammDeso,
    walletData.foundationDeso,
    walletData.founderDeso,
    walletData.desoBullsDeso,
    walletData.ammWallets,
    walletData.ccv1TotalDeso,
    walletData.isLoading,
    stakedData.isLoading,
  ]);

  return breakdown;
}
