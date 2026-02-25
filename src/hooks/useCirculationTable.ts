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
import { CCV2_AMM_DESO, getCCv2ProfileNames, getCCv2UserTokenAmms } from '@/data/desoData';
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
  /** Price per token (for Price column); Openfund/Focus in USD, then DESO equiv */
  price?: number;
  /** # of tokens in circulation (excl. own tokens for Openfund/Focus) */
  tokenCount?: number;
}

export interface UnstakedBreakdown {
  /** User/Project Tokens: Openfund, Focus, CCv2 AMMs */
  nativeTokens: { openfund: TokenSection; focus: TokenSection; userTokens: TokenSection };
  currencyTokens: { dusdc: TokenSection; dbtc: TokenSection; deth: TokenSection; dsol: TokenSection };
  /** DESO - Unstaked: native DESO by category (Foundation, AMM, Core, DeSo Bulls, Others) */
  nativeDeso: TokenSection;
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

    const openfundAccountBalance = wallets.find((w) => w.name === 'openfund')?.balances.Openfund ?? 0;
    const openfundTotal = wallets.reduce((s, w) => s + (w.balances.Openfund ?? 0), 0);
    const openfundCirculation = Math.max(0, openfundTotal - openfundAccountBalance);
    const openfundCirculationDesoEquiv = desoPrice > 0 ? (openfundCirculation * prices.openfund) / desoPrice : 0;
    const openfundCirculationUsd = openfundCirculation * prices.openfund;
    /** Focus: 165B total; 120B in Focus account; circulation = 45B */
    const FOCUS_CIRCULATION = 45_000_000_000;
    const focusTotal = wallets.reduce((s, w) => (w.name === 'focus' ? s : s + (w.balances.Focus ?? 0)), 0);
    const focusDesoEquiv = desoPrice > 0 ? (FOCUS_CIRCULATION * prices.focus) / desoPrice : 0;
    const focusCirculationUsd = FOCUS_CIRCULATION * prices.focus;
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

    /** CCv2 AMM value = Focus×price + Openfund×price + DESO×price + dUSDC + dBTC×price + ... (full value held in AMMs) */
    const ccv2WalletAmms = getCCv2UserTokenAmms(wallets);
    const ccv2WalletMap = new Map(ccv2WalletAmms.map((a) => [a.profileName, a]));
    const ccv2ProfileNames = getCCv2ProfileNames();
    const ccv2Wallets = wallets.filter((w) => {
      if (w.classification !== 'AMM') return false;
      const name = w.name.endsWith(' (AMM)') ? w.name.slice(0, -7) : (w.name.startsWith('AMM_') ? w.name.split('_')[1] : null);
      return name && !['deso', 'focus', 'openfund'].includes(name.toLowerCase());
    });
    const ccv2FullValueByProfile = new Map<string, number>();
    for (const w of ccv2Wallets) {
      const profileName = w.name.endsWith(' (AMM)') ? w.name.slice(0, -7) : (w.name.split('_')[1] ?? '');
      if (!profileName) continue;
      const b = w.balances;
      const fullUsd =
        (b.Focus ?? 0) * prices.focus +
        (b.Openfund ?? 0) * prices.openfund +
        (b.DESO ?? 0) * desoPrice +
        (b.dUSDC ?? 0) +
        (b.dBTC ?? 0) * prices.btc +
        (b.dETH ?? 0) * prices.eth +
        (b.dSOL ?? 0) * prices.sol;
      ccv2FullValueByProfile.set(profileName, (ccv2FullValueByProfile.get(profileName) ?? 0) + fullUsd);
    }
    const ccv2ByCategory = ccv2ProfileNames.length > 0
      ? ccv2ProfileNames.map((profileName) => {
          const usdVal = ccv2FullValueByProfile.get(profileName) ?? ccv2WalletMap.get(profileName)?.usdValue ?? 0;
          const deso = desoPrice > 0 ? usdVal / desoPrice : 0;
          return { label: profileName, amount: deso, usdValue: usdVal };
        })
      : [{ label: 'AMM', amount: CCV2_AMM_DESO, usdValue: CCV2_AMM_DESO * desoPrice }];
    const ccv2Deso = ccv2ByCategory.reduce((s, c) => s + c.amount, 0) || (desoPrice > 0 ? (CCV2_AMM_DESO * desoPrice) / desoPrice : CCV2_AMM_DESO);
    const ccv2Usd = ccv2ByCategory.reduce((s, c) => s + c.usdValue, 0) || CCV2_AMM_DESO * desoPrice;

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
        amount: openfundCirculationDesoEquiv,
        unit: 'DESO',
        usdValue: openfundCirculationUsd,
        byCategory: openfundByCat.map((c) => ({
          label: c.label,
          amount: c.amount,
          usdValue: c.amount * prices.openfund,
        })),
        price: prices.openfund,
        tokenCount: openfundCirculation,
      },
      {
        id: 'focus',
        label: 'Focus',
        amount: focusDesoEquiv,
        unit: 'DESO',
        usdValue: focusCirculationUsd,
        byCategory: focusByCat.map((c) => ({
          label: c.label,
          amount: c.amount,
          usdValue: c.amount * prices.focus,
        })),
        price: prices.focus,
        tokenCount: FOCUS_CIRCULATION,
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
        amount: ccv2Deso,
        unit: 'DESO',
        usdValue: ccv2Usd,
        byCategory: ccv2ByCategory,
      },
    ];

    const unstakedDesoEquiv = ccv1Deso + openfundCirculationDesoEquiv + focusDesoEquiv + desoUnstaked + ccv2Deso;
    const unstakedUsd = sections.reduce((s, x) => s + x.usdValue, 0);

    // Compute Non-Foundation holdings excluding staked for display (by category)
    const openfundNonFoundation = nonFoundationExcludingStaked('Openfund');
    const focusNonFoundation = nonFoundationExcludingStaked('Focus');
    const openfundNonFoundationDesoEquiv = desoPrice > 0 ? (openfundNonFoundation * prices.openfund) / desoPrice : 0;
    const focusNonFoundationDesoEquiv = desoPrice > 0 ? (focusNonFoundation * prices.focus) / desoPrice : 0;

    const sumTrackedTotalUsd = wallets
      .filter((w) => ['FOUNDATION', 'AMM', 'FOUNDER', 'DESO_BULL'].includes(w.classification))
      .reduce((s, w) => s + (w.usdValue ?? 0), 0);

    // Compute Non-Foundation holdings excluding staked for Currency Tokens
    const dusdcNonFoundation = nonFoundationExcludingStaked('dUSDC');
    const dbtcNonFoundation = nonFoundationExcludingStaked('dBTC');
    const dethNonFoundation = nonFoundationExcludingStaked('dETH');
    const dsolNonFoundation = nonFoundationExcludingStaked('dSOL');

    // DESO - Unstaked: Others = 12.2M × DESO Price − sum(tracked totalUsd); same logic as Token Holdings
    const sumTrackedDeso = wallets.reduce((s, w) => s + (w.balances.DESO ?? 0), 0);
    const nativeDesoByCat = byCategoryForToken('DESO');
    const totalSupplyUsd = totalSupply * desoPrice;
    const othersUnstakedUsd = Math.max(0, totalSupplyUsd - sumTrackedTotalUsd);
    const othersUnstakedDeso = desoPrice > 0 ? othersUnstakedUsd / desoPrice : 0;
    const nativeDesoByCatWithOthers = [
      ...nativeDesoByCat,
      ...(othersUnstakedDeso > 0 ? [{ label: 'Others', amount: othersUnstakedDeso, usdValue: othersUnstakedUsd }] : []),
    ];
    const nativeDesoTotal = nativeDesoByCatWithOthers.reduce((s, c) => s + c.amount, 0);
    const nativeDesoUsd = nativeDesoByCatWithOthers.reduce((s, c) => s + c.usdValue, 0);

    const breakdown: UnstakedBreakdown = {
      nativeTokens: {
        openfund: {
          id: 'openfund-nf',
          label: 'Openfund',
          amount: openfundCirculationDesoEquiv,
          unit: 'DESO',
          usdValue: openfundCirculationUsd,
          byCategory: openfundByCat.map((c) => ({ label: c.label, amount: c.amount, usdValue: c.amount * prices.openfund })),
          price: prices.openfund,
          tokenCount: openfundCirculation,
        },
        focus: {
          id: 'focus-nf',
          label: 'Focus',
          amount: focusDesoEquiv,
          unit: 'DESO',
          usdValue: focusCirculationUsd,
          byCategory: focusByCat.map((c) => ({ label: c.label, amount: c.amount, usdValue: c.amount * prices.focus })),
          price: prices.focus,
          tokenCount: FOCUS_CIRCULATION,
        },
        userTokens: {
          id: 'ccv2amm',
          label: 'CCv2 AMMs',
          amount: ccv2Deso,
          unit: 'DESO',
          usdValue: ccv2Usd,
          byCategory: ccv2ByCategory,
        },
      },
      currencyTokens: {
        dusdc: {
          id: 'dusdc-nf',
          label: 'dUSDC',
          amount: dusdcNonFoundation,
          unit: 'token',
          usdValue: dusdcNonFoundation,
          byCategory: dUsdcByCat,
          price: 1,
          tokenCount: dusdcNonFoundation,
        },
        dbtc: {
          id: 'dbtc-nf',
          label: 'dBTC',
          amount: dbtcNonFoundation,
          unit: 'token',
          usdValue: dbtcNonFoundation * prices.btc,
          byCategory: dBtcByCat,
          price: prices.btc,
          tokenCount: dbtcNonFoundation,
        },
        deth: {
          id: 'deth-nf',
          label: 'dETH',
          amount: dethNonFoundation,
          unit: 'token',
          usdValue: dethNonFoundation * prices.eth,
          byCategory: dEthByCat,
          price: prices.eth,
          tokenCount: dethNonFoundation,
        },
        dsol: {
          id: 'dsol-nf',
          label: 'dSOL',
          amount: dsolNonFoundation,
          unit: 'token',
          usdValue: dsolNonFoundation * prices.sol,
          byCategory: dSolByCat,
          price: prices.sol,
          tokenCount: dsolNonFoundation,
        },
      },
      nativeDeso: {
        id: 'unstaked-deso',
        label: 'DESO - Unstaked',
        amount: nativeDesoTotal,
        unit: 'DESO',
        usdValue: nativeDesoUsd,
        byCategory: nativeDesoByCatWithOthers,
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
    walletData,
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
