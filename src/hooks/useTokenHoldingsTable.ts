/**
 * Builds spreadsheet-like rows for the Token Holdings table:
 * Issued, Token Price, Foundation/AMM/Core/DeSo Bulls accounts, Free Float (Others = delta to match issued), Overall Total.
 * Category column + default order: Foundation, AMM, Core Team, DeSo Bulls, Others (displayed as Free Float).
 * Future: add top 100 untagged wallets from staked-data community list as rows under Free Float, then Others row = remainder (issued − tracked − top100).
 */

import { useMemo } from 'react';
import { useWalletData } from './useWalletData';
import { useLiveData } from './useLiveData';
import { useFreeFloatTop100 } from './useFreeFloatTop100';

export type HoldingsCategory = 'Foundation' | 'AMM' | 'Core Team' | 'DeSo Bulls' | 'Others';

/** Future use: tokens backed by certain wallets (yellow/orange/green highlights) */
export type TokenHighlight = 'yellow' | 'orange' | 'green';

/** Default sort order: Foundation=0, AMM=1, Core Team=2, DeSo Bulls=3, Others=4 */
export const DEFAULT_CATEGORY_ORDER: Record<HoldingsCategory, number> = {
  Foundation: 0,
  AMM: 1,
  'Core Team': 2,
  'DeSo Bulls': 3,
  Others: 4,
};

export interface TokenHoldingsRow {
  id: string;
  type: 'issued' | 'price' | 'account' | 'overallTotal';
  category?: HoldingsCategory;
  /** For default order: Foundation, AMM, Core, DeSo Bulls, Others */
  defaultOrder?: number;
  account?: string;
  /** DESO total (staked + unstaked) */
  DESO?: number;
  DESOStaked?: number;
  DESOUnstaked?: number;
  OpenFund?: number;
  Focus?: number;
  dUSDC?: number;
  dBTC?: number;
  dETH?: number;
  dSOL?: number;
  CCv1?: number;
  CCv2?: number;
  totalUsd?: number;
  /** Future: which wallet backs this token (for highlighting) */
  backedByWallet?: string;
  /** Future: highlight for this cell/row (yellow/orange/green) */
  highlight?: TokenHighlight;
  /** True if account has a display name (tracked or chain username); used for "Named accounts only" filter */
  isNamed?: boolean;
}

const CATEGORY_BY_CLASS: Record<string, HoldingsCategory> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Core Team',
  DESO_BULL: 'DeSo Bulls',
};

export function useTokenHoldingsTable(): {
  rows: TokenHoldingsRow[];
  prices: { deso: number; openfund: number; focus: number; btc: number; eth: number; sol: number };
  isLoading: boolean;
} {
  const { wallets, isLoading: walletsLoading } = useWalletData();
  const { marketData } = useLiveData();
  const { top100: freeFloatTop100 } = useFreeFloatTop100();

  const prices = useMemo(
    () => ({
      deso: marketData.desoPrice,
      openfund: marketData.openfundPrice,
      focus: marketData.focusPrice,
      btc: marketData.btcPrice,
      eth: marketData.ethPrice,
      sol: marketData.solPrice,
    }),
    [marketData]
  );

  const rows = useMemo(() => {
    const out: TokenHoldingsRow[] = [];
    const p = prices;

    // Issued row (supply / issued amounts)
    const desoIssued = marketData.desoTotalSupply;
    const desoStakedIssued = marketData.desoStaked;
    const desoUnstakedIssued = Math.max(0, desoIssued - desoStakedIssued);
    const openfundIssued = 95_000_000; // approximate
    /** Focus: 165B total; 120B in Focus account; circulation for table = 45B (MC in DESO ~2M) */
    const FOCUS_IN_FOCUS_ACCOUNT = 120_000_000_000;
    const focusCirculation = 45_000_000_000; // 165B - 120B
    const dusdcIssued = 9_200_000;
    const totalSupplyUsd =
      desoIssued * p.deso +
      openfundIssued * p.openfund +
      focusCirculation * p.focus +
      dusdcIssued +
      22 * p.btc +
      210 * p.eth +
      2650 * p.sol;
    out.push({
      id: 'issued',
      type: 'issued',
      account: 'Issued',
      DESO: desoIssued,
      DESOStaked: desoStakedIssued,
      DESOUnstaked: desoUnstakedIssued,
      OpenFund: openfundIssued,
      Focus: focusCirculation,
      dUSDC: dusdcIssued,
      dBTC: 22,
      dETH: 210,
      dSOL: 2650,
      totalUsd: totalSupplyUsd,
    });

    // Token Price row
    out.push({
      id: 'price',
      type: 'price',
      account: 'Token Price',
      DESO: p.deso,
      OpenFund: p.openfund,
      Focus: p.focus,
      dUSDC: 1,
      dBTC: p.btc,
      dETH: p.eth,
      dSOL: p.sol,
    });

    // Account rows from wallets (Foundation, AMM, Core Team, DeSo Bulls) with defaultOrder for default sort
    for (const w of wallets) {
      const cat = CATEGORY_BY_CLASS[w.classification];
      if (!cat) continue;
      const b = w.balances;
      const deso = b.DESO ?? 0;
      const staked = w.desoStaked ?? 0;
      const unstaked = w.desoUnstaked ?? Math.max(0, deso - staked);
      const openfund = b.Openfund ?? 0;
      const focus = b.Focus ?? 0;
      const dusdc = b.dUSDC ?? 0;
      const dbtc = b.dBTC ?? 0;
      const deth = b.dETH ?? 0;
      const dsol = b.dSOL ?? 0;
      const ccv1 = w.ccv1ValueDeso ?? 0;
      const ccv2Usd = w.ccv2ValueUsd ?? 0;
      const ccv2Deso = p.deso > 0 ? ccv2Usd / p.deso : 0;
      const totalUsd =
        deso * p.deso +
        openfund * p.openfund +
        focus * p.focus +
        dusdc +
        dbtc * p.btc +
        deth * p.eth +
        dsol * p.sol +
        ccv1 * p.deso +
        ccv2Usd;
      out.push({
        id: `account-${w.name}`,
        type: 'account',
        category: cat,
        defaultOrder: DEFAULT_CATEGORY_ORDER[cat],
        account: w.name,
        DESO: deso,
        DESOStaked: staked,
        DESOUnstaked: unstaked,
        OpenFund: openfund,
        Focus: focus,
        dUSDC: dusdc,
        dBTC: dbtc,
        dETH: deth,
        dSOL: dsol,
        CCv1: ccv1,
        CCv2: ccv2Deso,
        totalUsd,
        backedByWallet: undefined,
        highlight: undefined,
        isNamed: true,
      });
    }

    // Top 100 free-float accounts (from Free Float table) as individual rows under Others
    for (const w of freeFloatTop100) {
      const deso = w.staked + w.unstaked;
      out.push({
        id: `account-freefloat-${w.pk}`,
        type: 'account',
        category: 'Others',
        defaultOrder: DEFAULT_CATEGORY_ORDER['Others'],
        account: w.name,
        DESO: deso,
        DESOStaked: w.staked,
        DESOUnstaked: w.unstaked,
        OpenFund: 0,
        Focus: 0,
        dUSDC: 0,
        dBTC: 0,
        dETH: 0,
        dSOL: 0,
        CCv1: 0,
        CCv2: 0,
        totalUsd: w.totalUsd,
        isNamed: w.isNamed,
      });
    }

    // Tracked-only sums (Foundation, AMM, Core Team, DeSo Bulls — exclude free-float and Others row)
    const trackedRows = out.filter((r) => r.type === 'account' && r.category !== 'Others');
    const sumTrackedStaked = trackedRows.reduce((s, x) => s + (x.DESOStaked ?? 0), 0);
    const sumTrackedTotalUsd = trackedRows.reduce((s, x) => s + (x.totalUsd ?? 0), 0);
    const sumTrackedDeso = trackedRows.reduce((s, x) => s + (x.DESO ?? 0), 0);
    const sumTrackedOpenfund = trackedRows.reduce((s, x) => s + (x.OpenFund ?? 0), 0);
    const sumTrackedFocus = trackedRows.reduce((s, x) => s + (x.Focus ?? 0), 0);
    const sumTrackedDusdc = trackedRows.reduce((s, x) => s + (x.dUSDC ?? 0), 0);
    const sumTrackedDbtc = trackedRows.reduce((s, x) => s + (x.dBTC ?? 0), 0);
    const sumTrackedDeth = trackedRows.reduce((s, x) => s + (x.dETH ?? 0), 0);
    const sumTrackedDsol = trackedRows.reduce((s, x) => s + (x.dSOL ?? 0), 0);
    const sumTrackedCcv1 = trackedRows.reduce((s, x) => s + (x.CCv1 ?? 0), 0);
    const sumTrackedCcv2 = trackedRows.reduce((s, x) => s + (x.CCv2 ?? 0), 0);

    // All account rows (including top100) for remainder token amounts
    const sumDeso = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.DESO ?? 0), 0);
    const sumOpenfund = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.OpenFund ?? 0), 0);
    const sumFocus = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.Focus ?? 0), 0);
    const sumDusdc = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.dUSDC ?? 0), 0);
    const sumDbtc = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.dBTC ?? 0), 0);
    const sumDeth = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.dETH ?? 0), 0);
    const sumDsol = out.filter((r) => r.type === 'account').reduce((s, x) => s + (x.dSOL ?? 0), 0);

    // Others row: Total = 12.2M DESO equivalent minus tracked (Foundation+AMM+Core+DeSo Bulls)
    const othersTotalUsd = totalSupplyUsd - sumTrackedTotalUsd;
    const othersDesoStaked = Math.max(0, desoStakedIssued - sumTrackedStaked);
    const othersOpenfund = Math.max(0, openfundIssued - sumOpenfund);
    const othersFocus = Math.max(0, focusCirculation - sumFocus);
    const othersDusdc = Math.max(0, dusdcIssued - sumDusdc);
    const othersDbtc = Math.max(0, 22 - sumDbtc);
    const othersDeth = Math.max(0, 210 - sumDeth);
    const othersDsol = Math.max(0, 2650 - sumDsol);
    const othersCcv1 = 0;
    const othersCcv2 = 0;
    // DESO Unstaked (Others) = Others Total Value minus all other columns' USD contribution
    const othersOtherColsUsd =
      othersDesoStaked * p.deso +
      othersOpenfund * p.openfund +
      othersFocus * p.focus +
      othersDusdc +
      othersDbtc * p.btc +
      othersDeth * p.eth +
      othersDsol * p.sol +
      othersCcv1 * p.deso +
      othersCcv2 * p.deso;
    const othersUnstakedUsd = Math.max(0, othersTotalUsd - othersOtherColsUsd);
    const othersUnstakedDeso = p.deso > 0 ? othersUnstakedUsd / p.deso : 0;
    const othersDeso = othersDesoStaked + othersUnstakedDeso;

    const hasOthers =
      othersTotalUsd > 0 ||
      othersDeso > 0 ||
      othersOpenfund > 0 ||
      othersFocus > 0 ||
      othersDusdc > 0 ||
      othersDbtc > 0 ||
      othersDeth > 0 ||
      othersDsol > 0;

    if (hasOthers) {
      out.push({
        id: 'others',
        type: 'account',
        category: 'Others',
        defaultOrder: DEFAULT_CATEGORY_ORDER['Others'],
        account: 'Others',
        DESO: othersDeso,
        DESOStaked: othersDesoStaked,
        DESOUnstaked: othersUnstakedDeso,
        OpenFund: othersOpenfund,
        Focus: othersFocus,
        dUSDC: othersDusdc,
        dBTC: othersDbtc,
        dETH: othersDeth,
        dSOL: othersDsol,
        CCv1: othersCcv1,
        CCv2: othersCcv2,
        totalUsd: othersTotalUsd,
        isNamed: true,
      });
    }

    // Unaccounted = Others total minus sum of top 100 free-float rows (named + public key)
    const sumFfTotalUsd = freeFloatTop100.reduce((s, w) => s + w.totalUsd, 0);
    const sumFfStaked = freeFloatTop100.reduce((s, w) => s + w.staked, 0);
    const unaccountedTotalUsd = Math.max(0, (hasOthers ? othersTotalUsd : 0) - sumFfTotalUsd);
    const unaccountedStaked = Math.max(0, (hasOthers ? othersDesoStaked : 0) - sumFfStaked);
    // Token columns: Others minus top100 (top100 have 0 for OpenFund, Focus, dUSDC, etc.)
    const unaccountedOpenfund = hasOthers ? othersOpenfund : 0;
    const unaccountedFocus = hasOthers ? othersFocus : 0;
    const unaccountedDusdc = hasOthers ? othersDusdc : 0;
    const unaccountedDbtc = hasOthers ? othersDbtc : 0;
    const unaccountedDeth = hasOthers ? othersDeth : 0;
    const unaccountedDsol = hasOthers ? othersDsol : 0;
    const unaccountedOtherColsUsd =
      unaccountedStaked * p.deso +
      unaccountedOpenfund * p.openfund +
      unaccountedFocus * p.focus +
      unaccountedDusdc +
      unaccountedDbtc * p.btc +
      unaccountedDeth * p.eth +
      unaccountedDsol * p.sol;
    const unaccountedUnstakedUsd = Math.max(0, unaccountedTotalUsd - unaccountedOtherColsUsd);
    const unaccountedUnstakedDeso = p.deso > 0 ? unaccountedUnstakedUsd / p.deso : 0;
    if (unaccountedTotalUsd > 0 || unaccountedStaked > 0 || unaccountedUnstakedDeso > 0) {
      out.push({
        id: 'unaccounted',
        type: 'account',
        category: 'Others',
        defaultOrder: DEFAULT_CATEGORY_ORDER['Others'],
        account: 'Unaccounted',
        DESO: unaccountedStaked + unaccountedUnstakedDeso,
        DESOStaked: unaccountedStaked,
        DESOUnstaked: unaccountedUnstakedDeso,
        OpenFund: unaccountedOpenfund,
        Focus: unaccountedFocus,
        dUSDC: unaccountedDusdc,
        dBTC: unaccountedDbtc,
        dETH: unaccountedDeth,
        dSOL: unaccountedDsol,
        CCv1: 0,
        CCv2: 0,
        totalUsd: unaccountedTotalUsd,
        isNamed: true,
      });
    }

    // Overall Total row (supply; Focus = 45B circulation)
    out.push({
      id: 'overallTotal',
      type: 'overallTotal',
      account: 'Total',
      DESO: desoIssued,
      DESOStaked: desoStakedIssued,
      DESOUnstaked: desoUnstakedIssued,
      OpenFund: openfundIssued,
      Focus: focusCirculation,
      dUSDC: dusdcIssued,
      dBTC: 22,
      dETH: 210,
      dSOL: 2650,
      totalUsd: totalSupplyUsd,
    });

    return out;
  }, [wallets, marketData, prices, freeFloatTop100]);

  return { rows, prices, isLoading: walletsLoading };
}
