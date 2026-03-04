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
import { useDesoBalancesTopHolders } from './useDesoBalancesTopHolders';
import { useOpenfundFocusHolders } from './useOpenfundFocusHolders';
import { useTrackedPublicKeys } from './useTrackedPublicKeys';
import { useStakedDesoData } from './useStakedDesoData';

export type HoldingsCategory = 'Foundation' | 'AMM' | 'Core Team' | 'Core Affiliated' | 'Exchange Accounts' | 'DeSo Bulls' | 'Others';

/** Future use: tokens backed by certain wallets (yellow/orange/green highlights) */
export type TokenHighlight = 'yellow' | 'orange' | 'green';

/** Default sort order: Foundation, AMM, Core Team, Core Affiliated, Exchange Accounts, DeSo Bulls, Others */
export const DEFAULT_CATEGORY_ORDER: Record<HoldingsCategory, number> = {
  Foundation: 0,
  AMM: 1,
  'Core Team': 2,
  'Core Affiliated': 3,
  'Exchange Accounts': 4,
  'DeSo Bulls': 5,
  Others: 6,
};

export interface TokenHoldingsRow {
  id: string;
  type: 'issued' | 'heldByIssuer' | 'price' | 'account' | 'overallTotal';
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
  /** Full public key (base58) when account is a truncated pk; for copy + explorer link */
  publicKey?: string;
}

const CATEGORY_BY_CLASS: Record<string, HoldingsCategory> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Core Team',
  CORE_AFFILIATED: 'Core Affiliated',
  EXCHANGE: 'Exchange Accounts',
  DESO_BULL: 'DeSo Bulls',
};

export function useTokenHoldingsTable(desoOnlyView = false): {
  rows: TokenHoldingsRow[];
  prices: { deso: number; openfund: number; focus: number; btc: number; eth: number; sol: number };
  isLoading: boolean;
} {
  const { wallets, isLoading: walletsLoading } = useWalletData();
  const { marketData } = useLiveData();
  const { top100: freeFloatTop100 } = useFreeFloatTop100();
  const { topHolders: desoBalancesHolders, isLoading: desoBalancesLoading } = useDesoBalancesTopHolders();
  const { holderMap: openfundFocusByPk, isLoading: openfundFocusLoading } = useOpenfundFocusHolders();
  const { trackedPks, isLoading: trackedPksLoading } = useTrackedPublicKeys();
  const { validatorBuckets } = useStakedDesoData();

  /** Exclude from Others: tracked (Exchange, Core, etc.) + Core-related anon (stakers to core validators) */
  const excludeFromOthersPks = useMemo(() => {
    const set = new Set(trackedPks);
    for (const b of validatorBuckets) {
      if (b.validatorType === 'core') {
        for (const r of [...b.foundation, ...b.community]) set.add(r.stakerPk);
      }
    }
    return set;
  }, [trackedPks, validatorBuckets]);

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
    /** Focus: 165B total; 120B in Focus account (excluded from circulation); circulation for table = 45B. Held by issuer row shows 165B for Focus. */
    const FOCUS_TOTAL_SUPPLY = 165_000_000_000;
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

    // Held by own account (issuer) row: Openfund column = openfund account's Openfund, Focus = 165B, dUSDC_/dBTC_/dETH_/dSOL_ from issuer if available
    const openfundHeldByIssuer = wallets.find((w) => w.name === 'openfund')?.balances.Openfund ?? 0;
    out.push({
      id: 'heldByIssuer',
      type: 'heldByIssuer',
      account: 'Held by own account',
      DESO: 0,
      DESOStaked: 0,
      DESOUnstaked: 0,
      OpenFund: openfundHeldByIssuer,
      Focus: FOCUS_TOTAL_SUPPLY,
      dUSDC: 0,
      dBTC: 0,
      dETH: 0,
      dSOL: 0,
      totalUsd:
        openfundHeldByIssuer * p.openfund +
        FOCUS_TOTAL_SUPPLY * p.focus,
    });

    // Token Price row
    out.push({
      id: 'price',
      type: 'price',
      account: 'Token Price ($)',
      DESO: p.deso,
      OpenFund: p.openfund,
      Focus: p.focus,
      dUSDC: 1,
      dBTC: p.btc,
      dETH: p.eth,
      dSOL: p.sol,
    });

    // Account rows from wallets (Foundation, AMM, Core Team, DeSo Bulls) with defaultOrder for default sort
    // Skip wallets with 0 in all columns
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
      if (totalUsd === 0) continue;
      out.push({
        id: `account-${w.name}`,
        type: 'account',
        category: cat,
        defaultOrder: DEFAULT_CATEGORY_ORDER[cat],
        account: w.name,
        publicKey: (w as { publicKey?: string }).publicKey,
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
    // Exclude tracked (Foundation/AMM/Core/Exchange/DeSo Bulls) and Core-related anon stakers
    const freeFloatFiltered = freeFloatTop100.filter((w) => !excludeFromOthersPks.has(w.pk));
    const ffPks = new Set(freeFloatFiltered.map((w) => w.pk));
    for (const w of freeFloatFiltered) {
      const deso = w.staked + w.unstaked;
      const of = openfundFocusByPk.get(w.pk);
      const openfund = of?.Openfund ?? 0;
      const focus = of?.Focus ?? 0;
      const totalUsd =
        w.totalUsd + openfund * p.openfund + focus * p.focus;
      if (totalUsd === 0) continue;
      out.push({
        id: `account-freefloat-${w.pk}`,
        type: 'account',
        category: 'Others',
        defaultOrder: DEFAULT_CATEGORY_ORDER['Others'],
        account: w.name,
        publicKey: w.pk,
        DESO: deso,
        DESOStaked: w.staked,
        DESOUnstaked: w.unstaked,
        OpenFund: openfund,
        Focus: focus,
        dUSDC: 0,
        dBTC: 0,
        dETH: 0,
        dSOL: 0,
        CCv1: 0,
        CCv2: 0,
        totalUsd,
        isNamed: w.isNamed,
      });
    }
    // desoBalances top holders not already in free-float list (by public key)
    // Exclude tracked and Core-related anon stakers
    const desoBalancesFiltered = desoBalancesHolders.filter((h) => !excludeFromOthersPks.has(h.pk));
    const extraFromDesoBalances = desoBalancesFiltered.filter((h) => !ffPks.has(h.pk));
    for (const w of extraFromDesoBalances) {
      const deso = w.staked + w.unstaked;
      const of = openfundFocusByPk.get(w.pk);
      const openfund = of?.Openfund ?? 0;
      const focus = of?.Focus ?? 0;
      const totalUsd =
        w.totalUsd + openfund * p.openfund + focus * p.focus;
      if (totalUsd === 0) continue;
      out.push({
        id: `account-desobalances-${w.pk}`,
        type: 'account',
        category: 'Others',
        defaultOrder: DEFAULT_CATEGORY_ORDER['Others'],
        account: w.name,
        publicKey: w.pk,
        DESO: deso,
        DESOStaked: w.staked,
        DESOUnstaked: w.unstaked,
        OpenFund: openfund,
        Focus: focus,
        dUSDC: 0,
        dBTC: 0,
        dETH: 0,
        dSOL: 0,
        CCv1: 0,
        CCv2: 0,
        totalUsd,
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

    // Do NOT push an "Others" aggregate row: it would double-count. Others = top 100 + Unaccounted;
    // we only push top 100 rows and Unaccounted so category subtotals and Total row add up.

    // Unaccounted = Others total minus sum of free-float top 100 and desoBalances top holders (avoid double-count by pk)
    const sumFfTotalUsd = freeFloatFiltered.reduce((s, w) => s + w.totalUsd, 0);
    const sumFfStaked = freeFloatFiltered.reduce((s, w) => s + w.staked, 0);
    const sumFfUnstaked = freeFloatFiltered.reduce((s, w) => s + w.unstaked, 0);
    const sumDesoBalancesTotalUsd = extraFromDesoBalances.reduce((s, w) => s + w.totalUsd, 0);
    const sumDesoBalancesStaked = extraFromDesoBalances.reduce((s, w) => s + w.staked, 0);
    const sumDesoBalancesUnstaked = extraFromDesoBalances.reduce((s, w) => s + w.unstaked, 0);
    const unaccountedTotalUsd = Math.max(
      0,
      (hasOthers ? othersTotalUsd : 0) - sumFfTotalUsd - sumDesoBalancesTotalUsd
    );
    const unaccountedStaked = Math.max(
      0,
      (hasOthers ? othersDesoStaked : 0) - sumFfStaked - sumDesoBalancesStaked
    );
    // Token columns: Others minus top100 (top100 have 0 for OpenFund, Focus, dUSDC, etc.)
    const unaccountedOpenfund = hasOthers ? othersOpenfund : 0;
    const unaccountedFocus = hasOthers ? othersFocus : 0;
    const unaccountedDusdc = hasOthers ? othersDusdc : 0;
    const unaccountedDbtc = hasOthers ? othersDbtc : 0;
    const unaccountedDeth = hasOthers ? othersDeth : 0;
    const unaccountedDsol = hasOthers ? othersDsol : 0;
    // Non-DESO-only: Unaccounted DESO Unstaked = 12.2M - Foundation - AMM - Core - Exchange - DeSo Bulls - Others Staked - (Others DESO Unstaked excl Unaccounted)
    const unaccountedUnstakedDeso = desoOnlyView
      ? (() => {
          const unaccountedOtherColsUsd =
            unaccountedStaked * p.deso +
            unaccountedOpenfund * p.openfund +
            unaccountedFocus * p.focus +
            unaccountedDusdc +
            unaccountedDbtc * p.btc +
            unaccountedDeth * p.eth +
            unaccountedDsol * p.sol;
          const unaccountedUnstakedUsd = Math.max(0, unaccountedTotalUsd - unaccountedOtherColsUsd);
          return p.deso > 0 ? unaccountedUnstakedUsd / p.deso : 0;
        })()
      : Math.max(
          0,
          desoIssued -
            sumTrackedDeso -
            (hasOthers ? othersDesoStaked : 0) -
            (sumFfUnstaked + sumDesoBalancesUnstaked)
        );
    const unaccountedTotalUsdFinal =
      desoOnlyView
        ? unaccountedTotalUsd
        : unaccountedStaked * p.deso +
          unaccountedUnstakedDeso * p.deso +
          unaccountedOpenfund * p.openfund +
          unaccountedFocus * p.focus +
          unaccountedDusdc +
          unaccountedDbtc * p.btc +
          unaccountedDeth * p.eth +
          unaccountedDsol * p.sol;
    if (unaccountedTotalUsdFinal > 0 || unaccountedStaked > 0 || unaccountedUnstakedDeso > 0) {
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
        totalUsd: unaccountedTotalUsdFinal,
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
  }, [wallets, marketData, prices, freeFloatTop100, desoBalancesHolders, openfundFocusByPk, excludeFromOthersPks, desoOnlyView]);

  return { rows, prices, isLoading: walletsLoading || desoBalancesLoading || openfundFocusLoading || trackedPksLoading };
}
