/**
 * Unified data for DESO in Circulation table: Staked (by validator → accounts) and
 * Unstaked (CCv1, Openfund, Focus, DESO, dBTC, dETH, dSOL, dUSDC, CCv2 AMMs) with
 * breakdown by Foundation / AMM / Core Team / DeSo Bulls / Others.
 * Supports Top N + Others (expandable) per section.
 */

import { useMemo } from 'react';
import { useWalletData } from './useWalletData';
import { useStakedDesoData } from './useStakedDesoData';
import { useLiveData } from './useLiveData';
import { useCCv1NetworkTotal } from './useCCv1NetworkTotal';
import { CCV2_AMM_DESO } from '@/data/desoData';
import type { AllStakedDesoBucket, AllStakedDesoRow } from '@/api/walletApi';

export const TOP_N = 15;
const CATEGORY_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Core Team',
  DESO_BULL: 'DeSo Bulls',
  COMMUNITY: 'Others',
};

export interface AccountRow {
  name: string;
  category: string;
  amount: number;
  usdValue: number;
}

export interface CategoryBreakdown {
  Foundation: number;
  AMM: number;
  CoreTeam: number;
  DeSoBulls: number;
  Others: number;
}

export interface ValidatorSection {
  id: string;
  validatorName: string;
  validatorType: 'core' | 'community';
  amount: number;
  usdValue: number;
  accounts: AccountRow[];
  othersCount: number;
  othersAmount: number;
  othersUsd: number;
}

export interface TokenSection {
  id: string;
  label: string;
  amount: number;
  unit: 'DESO' | 'token';
  usdValue: number;
  byCategory: { label: string; amount: number; usdValue: number }[];
  byAccount?: AccountRow[]; // Top N + Others for DESO/unstaked
  othersCount?: number;
  othersAmount?: number;
  othersUsd?: number;
}

export interface UnstakedBreakdown {
  nativeTokens: { openfund: TokenSection; focus: TokenSection };
  currencyTokens: { dusdc: TokenSection; dbtc: TokenSection; deth: TokenSection; dsol: TokenSection };
  userTokens: TokenSection; // CCv2 AMMs
  nativeDeso: TokenSection; // Native DESO broken down by category
}

export interface CirculationTableData {
  totalSupply: number;
  desoPrice: number;
  prices: { btc: number; eth: number; sol: number; openfund: number; focus: number };
  staked: {
    total: number;
    usdValue: number;
    validators: ValidatorSection[];
  };
  unstaked: {
    total: number;
    usdValue: number;
    sections: TokenSection[];
    breakdown: UnstakedBreakdown;
  };
  isLoading: boolean;
  ccv1CachedAt?: number;
}

function sumStakesByClassification(buckets: AllStakedDesoBucket[]) {
  const core = { foundation: 0, coreTeam: 0, desoBulls: 0, others: 0 };
  const community = { foundation: 0, coreTeam: 0, desoBulls: 0, others: 0 };
  for (const b of buckets) {
    const target = b.validatorType === 'core' ? core : community;
    for (const r of b.foundation) {
      if (r.classification === 'FOUNDER') target.coreTeam += r.amount;
      else if (r.classification === 'FOUNDATION' || r.classification === 'AMM') target.foundation += r.amount;
      else target.others += r.amount;
    }
    for (const r of b.community) {
      if (r.classification === 'DESO_BULL') target.desoBulls += r.amount;
      else target.others += r.amount;
    }
  }
  return { core, community };
}

function allRowsFromBucket(bucket: AllStakedDesoBucket): AllStakedDesoRow[] {
  return [...bucket.foundation, ...bucket.community].sort((a, b) => b.amount - a.amount);
}

function classificationToLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? 'Others';
}

export function useCirculationTable(): CirculationTableData {
  const walletData = useWalletData();
  const stakedData = useStakedDesoData();
  const { marketData } = useLiveData();
  const { ccv1NetworkTotalDeso, ccv1CachedAt } = useCCv1NetworkTotal();

  return useMemo(() => {
    const { wallets } = walletData;
    const buckets = stakedData.validatorBuckets;
    const desoPrice = marketData.desoPrice;
    const totalSupply = marketData.desoTotalSupply;
    const prices = {
      btc: marketData.btcPrice,
      eth: marketData.ethPrice,
      sol: marketData.solPrice,
      openfund: marketData.openfundPrice,
      focus: marketData.focusPrice,
    };

    const { core: coreStaked, community: communityStaked } = sumStakesByClassification(buckets);
    const totalStaked =
      coreStaked.foundation + coreStaked.coreTeam + coreStaked.desoBulls + coreStaked.others +
      communityStaked.foundation + communityStaked.coreTeam + communityStaked.desoBulls + communityStaked.others;

    const validators: ValidatorSection[] = buckets.map((b) => {
      const rows = allRowsFromBucket(b);
      const total = b.total;
      const top = rows.slice(0, TOP_N);
      const rest = rows.slice(TOP_N);
      const othersAmount = rest.reduce((s, r) => s + r.amount, 0);
      const accounts: AccountRow[] = top.map((r) => ({
        name: r.stakerName,
        category: classificationToLabel(r.classification),
        amount: r.amount,
        usdValue: r.amount * desoPrice,
      }));
      return {
        id: b.validatorKey,
        validatorName: b.validatorName,
        validatorType: b.validatorType,
        amount: total,
        usdValue: total * desoPrice,
        accounts,
        othersCount: rest.length,
        othersAmount,
        othersUsd: othersAmount * desoPrice,
      };
    });

    const ccv1Deso = ccv1NetworkTotalDeso ?? walletData.ccv1TotalDeso ?? 0;

    /** Non-Foundation holdings excluding staked DESO for a token */
    function nonFoundationExcludingStaked(
      tokenKey: 'DESO' | 'Openfund' | 'Focus' | 'dBTC' | 'dETH' | 'dSOL' | 'dUSDC'
    ): number {
      const key = tokenKey === 'DESO' ? 'DESO' : tokenKey;
      let total = 0;
      for (const w of wallets) {
        if (w.classification === 'FOUNDATION') continue;
        const amt = key === 'DESO' ? (w.balances.DESO ?? 0) : (w.balances[key] ?? 0);
        if (amt <= 0) continue;
        if (key === 'DESO') {
          const staked = w.desoStaked ?? 0;
          total += Math.max(0, amt - staked);
        } else {
          total += amt;
        }
      }
      return total;
    }

    function byCategoryForToken(
      tokenKey: 'DESO' | 'Openfund' | 'Focus' | 'dBTC' | 'dETH' | 'dSOL' | 'dUSDC'
    ): { label: string; amount: number; usdValue: number }[] {
      const map: Record<string, number> = {
        Foundation: 0,
        AMM: 0,
        CoreTeam: 0,
        DeSoBulls: 0,
        Others: 0,
      };
      const key = tokenKey === 'DESO' ? 'DESO' : tokenKey;
      for (const w of wallets) {
        const amt = key === 'DESO' ? (w.balances.DESO ?? 0) : (w.balances[key] ?? 0);
        if (amt <= 0) continue;
        const staked = key === 'DESO' ? (w.desoStaked ?? 0) : 0;
        const unstaked = key === 'DESO' ? Math.max(0, amt - staked) : amt;
        if (unstaked <= 0) continue;
        let cat: string;
        if (w.classification === 'FOUNDATION') cat = 'Foundation';
        else if (w.classification === 'AMM') cat = 'AMM';
        else if (w.classification === 'FOUNDER') cat = 'CoreTeam';
        else if (w.classification === 'DESO_BULL') cat = 'DeSoBulls';
        else cat = 'Others';
        map[cat] += unstaked;
      }
      let usd: (v: number) => number;
      if (key === 'DESO') usd = (v) => v * desoPrice;
      else if (key === 'Openfund') usd = (v) => (v * prices.openfund) / desoPrice;
      else if (key === 'Focus') usd = (v) => (v * prices.focus) / desoPrice;
      else if (key === 'dBTC') usd = (v) => v * prices.btc;
      else if (key === 'dETH') usd = (v) => v * prices.eth;
      else if (key === 'dSOL') usd = (v) => v * prices.sol;
      else usd = (v) => v; // dUSDC 1:1
      return [
        { label: 'Foundation', amount: map.Foundation, usdValue: usd(map.Foundation) },
        { label: 'AMM', amount: map.AMM, usdValue: usd(map.AMM) },
        { label: 'Core Team', amount: map.CoreTeam, usdValue: usd(map.CoreTeam) },
        { label: 'DeSo Bulls', amount: map.DeSoBulls, usdValue: usd(map.DeSoBulls) },
        { label: 'Others', amount: map.Others, usdValue: usd(map.Others) },
      ].filter((x) => x.amount > 0);
    }

    const openfundTotal = wallets.reduce((s, w) => s + (w.balances.Openfund ?? 0), 0);
    const openfundDesoEquiv = desoPrice > 0 ? (openfundTotal * prices.openfund) / desoPrice : 0;
    const focusTotal = wallets.reduce((s, w) => (w.name === 'focus' ? s : s + (w.balances.Focus ?? 0), 0));
    const focusDesoEquiv = desoPrice > 0 ? (focusTotal * prices.focus) / desoPrice : 0;
    const desoUnstakedTotal =
      wallets.reduce((s, w) => s + (w.balances.DESO ?? 0), 0) -
      validators.reduce((s, v) => s + v.amount, 0);
    const desoUnstaked = Math.max(0, desoUnstakedTotal);
    const dBtcTotal = wallets.reduce((s, w) => s + (w.balances.dBTC ?? 0), 0);
    const dEthTotal = wallets.reduce((s, w) => s + (w.balances.dETH ?? 0), 0);
    const dSolTotal = wallets.reduce((s, w) => s + (w.balances.dSOL ?? 0), 0);
    const dUsdcTotal = wallets.reduce((s, w) => s + (w.balances.dUSDC ?? 0), 0);

    const openfundByCat = byCategoryForToken('Openfund');
    const focusByCat = byCategoryForToken('Focus');
    const desoByCat = byCategoryForToken('DESO');
    const dBtcByCat = byCategoryForToken('dBTC');
    const dEthByCat = byCategoryForToken('dETH');
    const dSolByCat = byCategoryForToken('dSOL');
    const dUsdcByCat = byCategoryForToken('dUSDC');

    const ccv2Usd = CCV2_AMM_DESO * desoPrice;

    const sections: TokenSection[] = [
      {
        id: 'ccv1',
        label: 'Creator Coins v1',
        amount: ccv1Deso,
        unit: 'DESO',
        usdValue: ccv1Deso * desoPrice,
        byCategory: [], // network total, no per-category
      },
      {
        id: 'openfund',
        label: 'Openfund',
        amount: openfundDesoEquiv,
        unit: 'DESO',
        usdValue: openfundTotal * prices.openfund,
        byCategory: openfundByCat.map((c) => ({
          label: c.label,
          amount: c.amount,
          usdValue: c.amount * prices.openfund,
        })),
      },
      {
        id: 'focus',
        label: 'Focus',
        amount: focusDesoEquiv,
        unit: 'DESO',
        usdValue: focusTotal * prices.focus,
        byCategory: focusByCat.map((c) => ({
          label: c.label,
          amount: c.amount,
          usdValue: c.amount * prices.focus,
        })),
      },
      {
        id: 'deso',
        label: 'DESO',
        amount: desoUnstaked,
        unit: 'DESO',
        usdValue: desoUnstaked * desoPrice,
        byCategory: desoByCat,
      },
      {
        id: 'dbtc',
        label: 'dBTC',
        amount: dBtcTotal,
        unit: 'token',
        usdValue: dBtcTotal * prices.btc,
        byCategory: dBtcByCat,
      },
      {
        id: 'deth',
        label: 'dETH',
        amount: dEthTotal,
        unit: 'token',
        usdValue: dEthTotal * prices.eth,
        byCategory: dEthByCat,
      },
      {
        id: 'dsol',
        label: 'dSOL',
        amount: dSolTotal,
        unit: 'token',
        usdValue: dSolTotal * prices.sol,
        byCategory: dSolByCat,
      },
      {
        id: 'dusdc',
        label: 'dUSDC',
        amount: dUsdcTotal,
        unit: 'token',
        usdValue: dUsdcTotal,
        byCategory: dUsdcByCat,
      },
      {
        id: 'ccv2amm',
        label: 'CCv2 AMMs',
        amount: CCV2_AMM_DESO,
        unit: 'DESO',
        usdValue: ccv2Usd,
        byCategory: [{ label: 'AMM', amount: CCV2_AMM_DESO, usdValue: ccv2Usd }],
      },
    ];

    const unstakedDesoEquiv = ccv1Deso + openfundDesoEquiv + focusDesoEquiv + desoUnstaked + CCV2_AMM_DESO;
    const unstakedUsd = sections.reduce((s, x) => s + x.usdValue, 0);

    // Compute Non-Foundation holdings excluding staked for Native Tokens
    const openfundNonFoundation = nonFoundationExcludingStaked('Openfund');
    const focusNonFoundation = nonFoundationExcludingStaked('Focus');
    const openfundNonFoundationDesoEquiv = desoPrice > 0 ? (openfundNonFoundation * prices.openfund) / desoPrice : 0;
    const focusNonFoundationDesoEquiv = desoPrice > 0 ? (focusNonFoundation * prices.focus) / desoPrice : 0;

    // Compute Non-Foundation holdings excluding staked for Currency Tokens
    const dusdcNonFoundation = nonFoundationExcludingStaked('dUSDC');
    const dbtcNonFoundation = nonFoundationExcludingStaked('dBTC');
    const dethNonFoundation = nonFoundationExcludingStaked('dETH');
    const dsolNonFoundation = nonFoundationExcludingStaked('dSOL');

    // Native DESO breakdown (excluding staked)
    const nativeDesoByCat = byCategoryForToken('DESO');
    const nativeDesoTotal = nativeDesoByCat.reduce((s, c) => s + c.amount, 0);
    const nativeDesoUsd = nativeDesoByCat.reduce((s, c) => s + c.usdValue, 0);

    const breakdown: UnstakedBreakdown = {
      nativeTokens: {
        openfund: {
          id: 'openfund-nf',
          label: 'Openfund (Non-Foundation)',
          amount: openfundNonFoundationDesoEquiv,
          unit: 'DESO',
          usdValue: openfundNonFoundation * prices.openfund,
          byCategory: [],
        },
        focus: {
          id: 'focus-nf',
          label: 'Focus (Non-Foundation)',
          amount: focusNonFoundationDesoEquiv,
          unit: 'DESO',
          usdValue: focusNonFoundation * prices.focus,
          byCategory: [],
        },
      },
      currencyTokens: {
        dusdc: {
          id: 'dusdc-nf',
          label: 'dUSDC (Non-Foundation)',
          amount: dusdcNonFoundation,
          unit: 'token',
          usdValue: dusdcNonFoundation,
          byCategory: [],
        },
        dbtc: {
          id: 'dbtc-nf',
          label: 'dBTC (Non-Foundation)',
          amount: dbtcNonFoundation,
          unit: 'token',
          usdValue: dbtcNonFoundation * prices.btc,
          byCategory: [],
        },
        deth: {
          id: 'deth-nf',
          label: 'dETH (Non-Foundation)',
          amount: dethNonFoundation,
          unit: 'token',
          usdValue: dethNonFoundation * prices.eth,
          byCategory: [],
        },
        dsol: {
          id: 'dsol-nf',
          label: 'dSOL (Non-Foundation)',
          amount: dsolNonFoundation,
          unit: 'token',
          usdValue: dsolNonFoundation * prices.sol,
          byCategory: [],
        },
      },
      userTokens: {
        id: 'ccv2amm',
        label: 'DESO User Tokens (CCv2 AMMs)',
        amount: CCV2_AMM_DESO,
        unit: 'DESO',
        usdValue: ccv2Usd,
        byCategory: [{ label: 'AMM', amount: CCV2_AMM_DESO, usdValue: ccv2Usd }],
      },
      nativeDeso: {
        id: 'native-deso',
        label: 'Native DESO',
        amount: nativeDesoTotal,
        unit: 'DESO',
        usdValue: nativeDesoUsd,
        byCategory: nativeDesoByCat,
      },
    };

    return {
      totalSupply,
      desoPrice,
      prices,
      staked: {
        total: totalStaked,
        usdValue: totalStaked * desoPrice,
        validators,
      },
      unstaked: {
        total: unstakedDesoEquiv,
        usdValue: unstakedUsd,
        sections,
        breakdown,
      },
      isLoading: walletData.isLoading || stakedData.isLoading,
      ccv1CachedAt,
    };
  }, [
    walletData.wallets,
    walletData.ccv1TotalDeso,
    walletData.isLoading,
    stakedData.validatorBuckets,
    stakedData.isLoading,
    marketData.desoTotalSupply,
    marketData.desoPrice,
    marketData.btcPrice,
    marketData.ethPrice,
    marketData.solPrice,
    marketData.openfundPrice,
    marketData.focusPrice,
    ccv1NetworkTotalDeso,
    ccv1CachedAt,
  ]);
}
