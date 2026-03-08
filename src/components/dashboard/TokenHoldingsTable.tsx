/**
 * Spreadsheet-style token holdings table with Category column and sortable token columns.
 * Default order: Foundation, AMM, Core Team, DeSo Bulls, Others (each category sorted by Total US$).
 * When Default Order: section headers with expand/collapse and sub-totals per category.
 * Bar filter (expandedSectionOnly): in default order expands only that section; in other sort filters to that category.
 */

import { useMemo, useState, useEffect, Fragment, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTokenHoldingsTable, type TokenHoldingsRow, type HoldingsCategory } from '@/hooks/useTokenHoldingsTable';
import { useCCv1HoldingsTable } from '@/hooks/useCCv1HoldingsTable';
import { formatUsd, formatNumberShort } from '@/lib/formatters';
import { Plus, Minus, Copy, UserPlus } from 'lucide-react';
import { setClassificationOverride } from '@/lib/classificationOverrides';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { SectionFilter } from '@/components/dashboard/AssetsBreakdownBar';

const SECTION_FILTER_TO_CATEGORY: Record<NonNullable<SectionFilter>, HoldingsCategory> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Core Team',
  DESO_BULL: 'DeSo Bulls',
  OTHERS: 'Others',
};

const CATEGORY_ORDER: HoldingsCategory[] = [
  'Foundation',
  'AMM',
  'Core Team',
  'Core Affiliated',
  'Exchange Accounts',
  'DeSo Bulls',
  'Others',
];

/** Display name for Others category in Token Holdings */
const FREE_FLOAT_LABEL = 'Free Float';
const FREE_FLOAT_TOOLTIP = 'FREE FLOAT excluding Core, Foundation and DeSo Bulls Community';

function categoryDisplayName(cat: HoldingsCategory): string {
  if (cat === 'Others') return FREE_FLOAT_LABEL;
  return cat;
}

function AccountCell({ row, displayOverride }: { row: TokenHoldingsRow; displayOverride?: string }) {
  const queryClient = useQueryClient();
  const pk = row.publicKey;
  const account = displayOverride ?? row.account ?? '–';
  const truncatedPk = pk ? `${pk.slice(0, 8)}…${pk.slice(-6)}` : '';
  /** When public key is shown: prefer username/account if available (e.g. Richwolfru007) over truncated pk */
  const display = pk ? (account && account !== truncatedPk ? account : truncatedPk) : account;
  const canTagAsDeSoBull = pk && row.category === 'Others' && row.account !== 'Unaccounted';

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pk) navigator.clipboard?.writeText(pk);
  };

  const handleTagAsDeSoBull = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pk) {
      setClassificationOverride(pk, 'DESO_BULL');
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['all-staked-deso'] });
    }
  };

  if (pk) {
    return (
      <td className="py-1.5 px-3 font-medium">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <a
            href={`https://explorer.deso.com/u/${encodeURIComponent(pk)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-mono truncate"
          >
            {display}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Copy public key"
            aria-label="Copy public key"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {canTagAsDeSoBull && (
            <button
              type="button"
              onClick={handleTagAsDeSoBull}
              className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Tag as DeSo Bull"
              aria-label="Tag as DeSo Bull"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </td>
    );
  }

  return <td className="py-1.5 px-3 font-medium">{account}</td>;
}

// Base columns: DESO Staked, CCv1, DeSo Unstaked (expandable)
const BASE_COLS = ['DESOStaked', 'CCv1', 'DESOUnstaked'] as const;
// Unstaked sub-columns when expanded: Openfund, Focus, CCv2, dUSDC, dBTC, dETH, dSOL, DESO
const UNSTAKED_SUB_COLS = ['OpenFund', 'Focus', 'CCv2', 'dUSDC', 'dBTC', 'dETH', 'dSOL', 'DESOUnstaked'] as const;
type TokenCol = (typeof BASE_COLS)[number] | (typeof UNSTAKED_SUB_COLS)[number];

const TOKEN_COL_LABELS: Record<string, string> = {
  DESOStaked: 'DESO Staked',
  CCv1: 'CCv1',
  DESOUnstaked: 'DeSo Unstaked',
  OpenFund: 'Openfund',
  Focus: 'Focus',
  CCv2: 'CCv2',
  dUSDC: 'dUSDC',
  dBTC: 'dBTC',
  dETH: 'dETH',
  dSOL: 'dSOL',
};

function getSortKey(
  row: TokenHoldingsRow,
  col: TokenCol | 'category' | 'account' | 'total' | 'defaultOrder',
  getUnstakedUsd: (r: TokenHoldingsRow) => number
): number | string {
  if (col === 'defaultOrder') return row.defaultOrder ?? 999;
  if (col === 'category') return row.category ?? '';
  if (col === 'account') return row.account ?? '';
  if (col === 'total') return row.totalUsd ?? 0;
  if (col === 'DESOUnstaked') return getUnstakedUsd(row);
  const v = row[col as keyof TokenHoldingsRow];
  return typeof v === 'number' ? v : 0;
}

interface TokenHoldingsTableProps {
  /** When set (from Assets bar click), in default order expands only this section; in other sort filters to this category */
  expandedSectionOnly?: SectionFilter | null;
}

type ValueMode = 'usd' | 'deso' | 'tokens';

export default function TokenHoldingsTable({ expandedSectionOnly }: TokenHoldingsTableProps = {}) {
  const [valueMode, setValueMode] = useState<ValueMode>('usd'); // Value in US$ | Value in DESOs | # of Tokens
  const [unstakedExpanded, setUnstakedExpanded] = useState(false);
  const [desoOnlyView, setDesoOnlyView] = useState(false);
  const { rows, prices, isLoading } = useTokenHoldingsTable(desoOnlyView);
  const { totalDesoLocked: ccv1TableTotalDeso } = useCCv1HoldingsTable();
  const [sortCol, setSortCol] = useState<TokenCol | 'category' | 'account' | 'total' | 'defaultOrder' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [useDefaultOrder, setUseDefaultOrder] = useState(true);
  const [namedOnly, setNamedOnly] = useState(false);

  const categoryFromFilter = expandedSectionOnly != null ? SECTION_FILTER_TO_CATEGORY[expandedSectionOnly] : undefined;

  /** Unstaked = Openfund + Focus + CCv2 + dUSDC + dBTC + dETH + dSOL + DESO (in USD). DeSo only: just DESO. */
  const getUnstakedUsd = useCallback(
    (row: TokenHoldingsRow): number => {
      const p = prices;
      if (desoOnlyView) return (row.DESOUnstaked ?? 0) * p.deso;
      return (
        (row.OpenFund ?? 0) * p.openfund +
        (row.Focus ?? 0) * p.focus +
        (row.CCv2 ?? 0) * p.deso +
        (row.dUSDC ?? 0) * 1 +
        (row.dBTC ?? 0) * p.btc +
        (row.dETH ?? 0) * p.eth +
        (row.dSOL ?? 0) * p.sol +
        (row.DESOUnstaked ?? 0) * p.deso
      );
    },
    [prices, desoOnlyView]
  );

  const displayCols = desoOnlyView
    ? BASE_COLS
    : unstakedExpanded
      ? ([...BASE_COLS.slice(0, 2), ...UNSTAKED_SUB_COLS] as const)
      : BASE_COLS;

  const getColLabel = (col: string) => {
    const base =
      !desoOnlyView && unstakedExpanded && col === 'DESOUnstaked' ? 'DESO' : (TOKEN_COL_LABELS[col] ?? col);
    if ((col === 'DESOStaked' || col === 'DESOUnstaked') && prices.deso > 0) {
      return `${base} ($${prices.deso.toFixed(2)})`;
    }
    return base;
  };

  /** Total = DESO Staked + CCv1 + DeSo Unstaked (always) */
  const getTotalForDisplay = useCallback(
    (row: TokenHoldingsRow): number | null | undefined => {
      const staked = row.DESOStaked ?? 0;
      const ccv1 = row.type === 'issued' || row.type === 'overallTotal' ? (ccv1TableTotalDeso ?? 0) : (row.CCv1 ?? 0);
      const unstakedDeso = desoOnlyView ? (row.DESOUnstaked ?? 0) : (getUnstakedUsd(row) / (prices.deso || 1));
      return (staked + ccv1 + unstakedDeso) * prices.deso;
    },
    [prices.deso, ccv1TableTotalDeso, getUnstakedUsd, desoOnlyView]
  );

  const [openSections, setOpenSections] = useState<Record<HoldingsCategory, boolean>>(() =>
    CATEGORY_ORDER.reduce((acc, cat) => ({ ...acc, [cat]: false }), {} as Record<HoldingsCategory, boolean>)
  );
  useEffect(() => {
    if (categoryFromFilter !== undefined) {
      setOpenSections((prev) =>
        CATEGORY_ORDER.reduce(
          (acc, cat) => ({ ...acc, [cat]: cat === categoryFromFilter }),
          {} as Record<HoldingsCategory, boolean>
        )
      );
    }
  }, [categoryFromFilter]);

  const { headerRows, dataRows, footerRows } = useMemo(() => {
    let header = rows.filter((r) => r.type === 'issued' || r.type === 'heldByIssuer' || r.type === 'price');
    if (desoOnlyView) header = header.filter((r) => r.type === 'issued'); // Hide Held by own account, Token Price
    let data = rows.filter((r) => r.type === 'account');
    if (namedOnly) data = data.filter((r) => r.isNamed === true);
    const footer = rows.filter((r) => r.type === 'overallTotal');
    return { headerRows: header, dataRows: data, footerRows: footer };
  }, [rows, namedOnly, desoOnlyView]);

  const sortedDataRows = useMemo(() => {
    let sorted = [...dataRows];
    if (useDefaultOrder) {
      sorted.sort((a, b) => {
        const orderA = getSortKey(a, 'defaultOrder', getUnstakedUsd) as number;
        const orderB = getSortKey(b, 'defaultOrder', getUnstakedUsd) as number;
        if (orderA !== orderB) return orderA - orderB;
        const totalA = getTotalForDisplay(a) ?? 0;
        const totalB = getTotalForDisplay(b) ?? 0;
        return totalB - totalA;
      });
    } else if (sortCol) {
      sorted.sort((a, b) => {
        const ka = sortCol === 'total' ? (getTotalForDisplay(a) ?? 0) : getSortKey(a, sortCol, getUnstakedUsd);
        const kb = sortCol === 'total' ? (getTotalForDisplay(b) ?? 0) : getSortKey(b, sortCol, getUnstakedUsd);
        const cmp = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    if (!useDefaultOrder && categoryFromFilter != null) {
      sorted = sorted.filter((r) => r.category === categoryFromFilter);
    }
    return sorted;
  }, [dataRows, sortCol, sortDir, useDefaultOrder, categoryFromFilter, getTotalForDisplay, getUnstakedUsd]);

  const fullSortedForGrouping = useMemo(() => {
    const sorted = [...dataRows];
    if (useDefaultOrder) {
      sorted.sort((a, b) => {
        const orderA = getSortKey(a, 'defaultOrder', getUnstakedUsd) as number;
        const orderB = getSortKey(b, 'defaultOrder', getUnstakedUsd) as number;
        if (orderA !== orderB) return orderA - orderB;
        if (sortCol) {
          const ka = sortCol === 'total' ? (getTotalForDisplay(a) ?? 0) : getSortKey(a, sortCol, getUnstakedUsd);
          const kb = sortCol === 'total' ? (getTotalForDisplay(b) ?? 0) : getSortKey(b, sortCol, getUnstakedUsd);
          const cmp = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
          return sortDir === 'asc' ? cmp : -cmp;
        }
        return (getTotalForDisplay(b) ?? 0) - (getTotalForDisplay(a) ?? 0);
      });
    }
    return sorted;
  }, [dataRows, useDefaultOrder, sortCol, sortDir, getTotalForDisplay, getUnstakedUsd]);

  const rowsByCategory = useMemo(() => {
    const map = new Map<HoldingsCategory, TokenHoldingsRow[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const row of fullSortedForGrouping) {
      if (row.category && map.has(row.category)) map.get(row.category)!.push(row);
    }
    return map;
  }, [fullSortedForGrouping]);

  const categorySubtotals = useMemo(() => {
    const out: Record<HoldingsCategory, TokenHoldingsRow> = {} as Record<HoldingsCategory, TokenHoldingsRow>;
    for (const cat of CATEGORY_ORDER) {
      const list = rowsByCategory.get(cat) ?? [];
      const totalUsd = list.reduce((s, r) => s + (r.totalUsd ?? 0), 0);
      const sum = (col: keyof TokenHoldingsRow) => list.reduce((s, r) => s + ((r[col] as number) ?? 0), 0);
      out[cat] = {
        id: `subtotal-${cat}`,
        type: 'account',
        category: cat,
        account: `${cat} Total`,
        DESO: sum('DESO'),
        DESOStaked: sum('DESOStaked'),
        DESOUnstaked: sum('DESOUnstaked'),
        OpenFund: sum('OpenFund'),
        Focus: sum('Focus'),
        dUSDC: sum('dUSDC'),
        dBTC: sum('dBTC'),
        dETH: sum('dETH'),
        dSOL: sum('dSOL'),
        CCv1: sum('CCv1'),
        CCv2: sum('CCv2'),
        totalUsd: totalUsd,
      };
    }
    return out;
  }, [rowsByCategory]);

  const handleSort = (col: TokenCol | 'category' | 'account' | 'total') => {
    setUseDefaultOrder(false);
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir(col === 'account' || col === 'category' ? 'asc' : 'desc');
    }
  };

  const handleDefaultOrder = () => {
    setUseDefaultOrder(true);
    setSortCol(null);
  };

  const formatTotal = (totalUsd: number | null | undefined) => {
    if (totalUsd == null) return '–';
    if (valueMode === 'usd') return formatUsd(totalUsd);
    if (valueMode === 'deso') return formatNumberShort(prices.deso > 0 ? totalUsd / prices.deso : 0);
    return '–';
  };

  /** Overall supply (12.2M DESO equiv + tokens) for % calculation */
  const totalSupplyUsd = useMemo(() => {
    if (footerRows.length === 0) return 0;
    return getTotalForDisplay(footerRows[0]) ?? 0;
  }, [footerRows, getTotalForDisplay]);

  const formatTotalWithPct = useCallback(
    (totalUsd: number | null | undefined, showPct: boolean) => {
      const formatted =
        totalUsd == null
          ? '–'
          : valueMode === 'usd'
            ? formatUsd(totalUsd)
            : valueMode === 'deso'
              ? formatNumberShort(prices.deso > 0 ? totalUsd / prices.deso : 0)
              : '–';
      if (formatted === '–' || !showPct || totalSupplyUsd <= 0) return formatted;
      const pct = totalUsd != null ? (totalUsd / totalSupplyUsd) * 100 : 0;
      return `${formatted} (${pct.toFixed(1)}%)`;
    },
    [valueMode, prices.deso, totalSupplyUsd]
  );

  const renderCell = (row: TokenHoldingsRow, col: string) => {
    // Collapsed DeSo Unstaked = sum of Openfund, Focus, CCv2, dUSDC, dBTC, dETH, dSOL, DESO
    if (col === 'DESOUnstaked' && !unstakedExpanded) {
      const unstakedUsd = getUnstakedUsd(row);
      if (row.type === 'heldByIssuer' || row.type === 'price') return '–';
      if (valueMode === 'usd') return formatUsd(unstakedUsd);
      if (valueMode === 'deso') return formatNumberShort(prices.deso > 0 ? unstakedUsd / prices.deso : 0);
      return formatNumberShort(prices.deso > 0 ? unstakedUsd / prices.deso : 0);
    }

    // Issued row: CCv1 uses network total from CC Locked
    const v =
      row.type === 'issued' && col === 'CCv1'
        ? (ccv1TableTotalDeso ?? row.CCv1 ?? 0)
        : row[col as keyof TokenHoldingsRow];

    // Issued row: show as # (B/M/K, no $)
    if (row.type === 'issued') {
      return formatNumberShort((v ?? 0) as number);
    }

    // Held by own account row: show # of tokens (same as Issued)
    if (row.type === 'heldByIssuer') {
      if (v == null || (v as number) === 0) return '–';
      return formatNumberShort((v as number));
    }

    // Token Price ($) row: show in $ or in DESO. Focus uses more decimals (e.g. $0.0002357).
    if (row.type === 'price') {
      if (col === 'DESOStaked') return '–';
      if (col === 'DESOUnstaked') return formatUsd(prices.deso); // native DESO price
      if (v == null) return '–';
      const priceUsd =
        col === 'OpenFund' || col === 'Focus' ? (v as number) * prices.deso : (v as number);
      if (valueMode === 'deso')
        return prices.deso > 0 ? formatNumberShort(priceUsd / prices.deso) : '–';
      if (col === 'OpenFund') return formatUsd((v as number) * prices.deso);
      if (col === 'Focus') {
        const focusPriceUsd = (v as number) * prices.deso;
        if (focusPriceUsd < 0.01) return `$${focusPriceUsd.toFixed(7)}`;
        return formatUsd(focusPriceUsd);
      }
      if (col === 'dUSDC') return '$1.00';
      if (col === 'dBTC') return formatUsd(v as number);
      if (col === 'dETH') return formatUsd(v as number);
      if (col === 'dSOL') return formatUsd(v as number);
      return '–';
    }

    // Data rows (account/overallTotal): show Value in US$ or # of Tokens; null = '–'
    if (v == null) return '–';
    const mult =
      col === 'DESOStaked' || col === 'DESOUnstaked' || col === 'CCv1' || col === 'CCv2'
        ? prices.deso
        : col === 'OpenFund'
          ? prices.openfund
          : col === 'Focus'
            ? prices.focus
            : col === 'dUSDC'
              ? 1
              : col === 'dBTC'
                ? prices.btc
                : col === 'dETH'
                  ? prices.eth
                  : col === 'dSOL'
                    ? prices.sol
                    : 1;
    const valueUsd = (v as number) * mult;
    if (valueMode === 'usd') return formatUsd(valueUsd);
    if (valueMode === 'deso') return formatNumberShort(prices.deso > 0 ? valueUsd / prices.deso : 0);
    return formatNumberShort(v as number);
  };

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold mb-4">Token Holdings</h2>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Token Holdings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {desoOnlyView
              ? 'DeSo only: Total = DESO Staked + CCv1 + DeSo Unstaked (12.2M). Foundation + Core share of supply.'
              : 'Total = DESO Staked + CCv1 + DeSo Unstaked. Expand DeSo Unstaked (+) to see Openfund, Focus, CCv2, dUSDC, dBTC, dETH, dSOL, DESO.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="token-holdings-deso-only" checked={desoOnlyView} onCheckedChange={setDesoOnlyView} />
            <Label htmlFor="token-holdings-deso-only" className="text-sm cursor-pointer whitespace-nowrap">
              DeSo only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="token-holdings-named-only" checked={namedOnly} onCheckedChange={setNamedOnly} />
            <Label htmlFor="token-holdings-named-only" className="text-sm cursor-pointer whitespace-nowrap">
              Named accounts only
            </Label>
          </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show:</span>
            <button
              onClick={() => setValueMode('usd')}
              className={`px-3 py-1 text-xs rounded border ${
                valueMode === 'usd'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              Value in US$
            </button>
            <button
              onClick={() => setValueMode('deso')}
              className={`px-3 py-1 text-xs rounded border ${
                valueMode === 'deso'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              Value in DESOs
            </button>
            <button
              onClick={() => setValueMode('tokens')}
              className={`px-3 py-1 text-xs rounded border ${
                valueMode === 'tokens'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              # of Tokens
            </button>
          </div>
          <button
            onClick={handleDefaultOrder}
            className="px-3 py-1 text-xs rounded border border-border bg-background text-foreground hover:bg-muted"
          >
            Default Order
          </button>
        </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-2 px-3 w-12">Sl. No</th>
              <th
                className="text-left py-2 px-3 cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('category')}
              >
                Category {sortCol === 'category' && !useDefaultOrder && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left py-2 px-3 cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('account')}
              >
                Accounts {sortCol === 'account' && !useDefaultOrder && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              {displayCols.map((col) => (
                <th
                  key={col}
                  className="text-right py-2 px-3 cursor-pointer hover:bg-muted/80 whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    {getColLabel(col)}
                    {col === 'DESOUnstaked' && !desoOnlyView && !unstakedExpanded && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUnstakedExpanded(true); }}
                        className="p-0.5 rounded hover:bg-muted"
                        title="Expand to show Openfund, Focus, CCv2, dUSDC, dBTC, dETH, dSOL, DESO"
                        aria-label="Expand"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                    {col === 'DESOUnstaked' && !desoOnlyView && unstakedExpanded && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUnstakedExpanded(false); }}
                        className="p-0.5 rounded hover:bg-muted"
                        title="Collapse DeSo Unstaked"
                        aria-label="Collapse"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                    {sortCol === col && !useDefaultOrder && (sortDir === 'asc' ? '↑' : '↓')}
                  </span>
                </th>
              ))}
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-muted/80 min-w-[140px]"
                onClick={() => handleSort('total')}
              >
                Total {sortCol === 'total' && !useDefaultOrder && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
            {footerRows.length > 0 && (() => {
              const totalRow = footerRows[0];
              return (
                <tr className="border-b border-border bg-muted/40 font-medium">
                  <td className="py-1.5 px-3 w-12" />
                  <td className="py-1.5 px-3" />
                  <AccountCell row={totalRow} />
                          {displayCols.map((col) => (
                    <td key={col} className="text-right py-1.5 px-3">
                      {renderCell(totalRow, col)}
                    </td>
                  ))}
                  <td className="text-right py-1.5 px-3 min-w-[140px] whitespace-nowrap">
                    {formatTotalWithPct(getTotalForDisplay(totalRow), true)}
                  </td>
                </tr>
              );
            })()}
          </thead>
          <tbody>
            {headerRows.map((row, idx) => (
              <tr key={row.id} className="border-b border-border bg-muted/30">
                <td className="py-1.5 px-3 w-12">{row.type === 'issued' || row.type === 'heldByIssuer' || row.type === 'price' ? '' : idx + 1}</td>
                <td className="py-1.5 px-3" />
                <AccountCell row={row} />
                          {displayCols.map((col) => (
                  <td key={col} className="text-right py-1.5 px-3">
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="text-right py-1.5 px-3 min-w-[140px] whitespace-nowrap">
                  {(row.type === 'issued' || row.type === 'heldByIssuer') && getTotalForDisplay(row) != null ? formatTotalWithPct(getTotalForDisplay(row), true) : '–'}
                </td>
              </tr>
            ))}
            {useDefaultOrder
              ? CATEGORY_ORDER.map((cat) => {
                  const open = openSections[cat];
                  const accountRows = rowsByCategory.get(cat) ?? [];
                  const sub = categorySubtotals[cat];
                  const subTotalUsd = sub ? (getTotalForDisplay(sub) ?? 0) : 0;
                  return (
                    <Fragment key={cat}>
                      <tr
                        className="border-b border-border bg-muted/20 cursor-pointer hover:bg-muted/40 select-none"
                        onClick={() => setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                      >
                        <td className="py-1.5 px-3 w-12" />
                        <td className="py-1.5 px-3 font-medium">
                          <span className="inline-flex items-center gap-1">
                            {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {cat}
                          </span>
                        </td>
                        <td className="py-1.5 px-3" />
                        {displayCols.map((col) => (
                          <td key={col} className="text-right py-1.5 px-3">
                            {sub ? renderCell(sub, col) : '–'}
                          </td>
                        ))}
                        <td className="text-right py-1.5 px-3 font-medium min-w-[140px] whitespace-nowrap">
                          {formatTotalWithPct(subTotalUsd, true)}
                        </td>
                      </tr>
                      {open &&
                        accountRows.map((row, idx) => (
                          <tr
                            key={row.id}
                            className="border-b border-border hover:bg-muted/20"
                            data-category={row.category}
                            data-backed-by={row.backedByWallet ?? undefined}
                            data-highlight={row.highlight ?? undefined}
                          >
                            <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                            <td className="py-1.5 px-3 text-muted-foreground pl-6">{row.category ?? '–'}</td>
                            <AccountCell
                              row={row}
                              displayOverride={row.account === 'Unaccounted' ? 'Others-Unaccounted' : undefined}
                            />
                            {displayCols.map((col) => (
                              <td key={col} className="text-right py-1.5 px-3">
                                {renderCell(row, col)}
                              </td>
                            ))}
                            <td className="text-right py-1.5 px-3 min-w-[140px] whitespace-nowrap">
                              {formatTotalWithPct(getTotalForDisplay(row), true)}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              : sortedDataRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/20"
                    data-category={row.category}
                    data-backed-by={row.backedByWallet ?? undefined}
                    data-highlight={row.highlight ?? undefined}
                  >
                    <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{row.category ?? '–'}</td>
                    <AccountCell
                      row={row}
                      displayOverride={row.account === 'Unaccounted' ? 'Others-Unaccounted' : undefined}
                    />
                          {displayCols.map((col) => (
                      <td key={col} className="text-right py-1.5 px-3">
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="text-right py-1.5 px-3 min-w-[140px] whitespace-nowrap">
                      {formatTotalWithPct(getTotalForDisplay(row), true)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
