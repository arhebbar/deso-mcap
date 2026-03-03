/**
 * Spreadsheet-style token holdings table with Category column and sortable token columns.
 * Default order: Foundation, AMM, Core Team, DeSo Bulls, Others (each category sorted by Total US$).
 * When Default Order: section headers with expand/collapse and sub-totals per category.
 * Bar filter (expandedSectionOnly): in default order expands only that section; in other sort filters to that category.
 */

import { useMemo, useState, useEffect, Fragment, useCallback } from 'react';
import { useTokenHoldingsTable, type TokenHoldingsRow, type HoldingsCategory } from '@/hooks/useTokenHoldingsTable';
import { useCCv1NetworkTotal } from '@/hooks/useCCv1NetworkTotal';
import { formatUsd, formatNumberShort } from '@/lib/formatters';
import { Plus, Minus, Copy } from 'lucide-react';
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

const CATEGORY_ORDER: HoldingsCategory[] = ['Foundation', 'AMM', 'Core Team', 'DeSo Bulls', 'Others'];

/** Display name for Others category in Token Holdings */
const FREE_FLOAT_LABEL = 'Free Float';
const FREE_FLOAT_TOOLTIP = 'FREE FLOAT excluding Core, Foundation and DeSo Bulls Community';

function categoryDisplayName(cat: HoldingsCategory): string {
  return cat === 'Others' ? FREE_FLOAT_LABEL : cat;
}

function AccountCell({ row, displayOverride }: { row: TokenHoldingsRow; displayOverride?: string }) {
  const account = displayOverride ?? row.account ?? '–';
  const pk = row.publicKey;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pk) navigator.clipboard?.writeText(pk);
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
            {account}
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
        </span>
      </td>
    );
  }

  return <td className="py-1.5 px-3 font-medium">{account}</td>;
}

// Order: DESO Staked, OpenFund, Focus, CCv1, CCv2, dUSDC, dBTC, dETH, dSOL, DESO Unstaked (no DESO Total; row total in Total column)
const TOKEN_COLS = ['DESOStaked', 'OpenFund', 'Focus', 'CCv1', 'CCv2', 'dUSDC', 'dBTC', 'dETH', 'dSOL', 'DESOUnstaked'] as const;
type AltCol = 'DESOStaked' | 'CCv1' | 'DESOUnstaked';
type TokenCol = (typeof TOKEN_COLS)[number];

const TOKEN_COL_LABELS: Record<TokenCol, string> = {
  DESOStaked: 'DESO Staked',
  OpenFund: 'OpenFund',
  Focus: 'Focus',
  CCv1: 'CCv1',
  CCv2: 'CCv2',
  dUSDC: 'dUSDC',
  dBTC: 'dBTC',
  dETH: 'dETH',
  dSOL: 'dSOL',
  DESOUnstaked: 'DESO Unstaked',
};

const ALT_COL_LABELS: Record<AltCol, string> = {
  DESOStaked: 'DESO Staked',
  CCv1: 'CCv1',
  DESOUnstaked: 'DESO Unstaked',
};

function getSortKey(
  row: TokenHoldingsRow,
  col: TokenCol | AltCol | 'category' | 'account' | 'total' | 'defaultOrder'
): number | string {
  if (col === 'defaultOrder') return row.defaultOrder ?? 999;
  if (col === 'category') return row.category ?? '';
  if (col === 'account') return row.account ?? '';
  if (col === 'total') return row.totalUsd ?? 0;
  const v = row[col as TokenCol];
  return typeof v === 'number' ? v : 0;
}

interface TokenHoldingsTableProps {
  /** When set (from Assets bar click), in default order expands only this section; in other sort filters to this category */
  expandedSectionOnly?: SectionFilter | null;
}

type ValueMode = 'usd' | 'deso' | 'tokens';

type ViewMode = 'standard' | 'deso-backed';

const ALT_COLS: AltCol[] = ['DESOStaked', 'CCv1', 'DESOUnstaked'];

export default function TokenHoldingsTable({ expandedSectionOnly }: TokenHoldingsTableProps = {}) {
  const { rows, prices, isLoading } = useTokenHoldingsTable();
  const { ccv1NetworkTotalDeso } = useCCv1NetworkTotal();
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [valueMode, setValueMode] = useState<ValueMode>('usd'); // Value in US$ | Value in DESOs | # of Tokens
  const [sortCol, setSortCol] = useState<TokenCol | AltCol | 'category' | 'account' | 'total' | 'defaultOrder' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [useDefaultOrder, setUseDefaultOrder] = useState(true);
  const [namedOnly, setNamedOnly] = useState(false);

  const categoryFromFilter = expandedSectionOnly != null ? SECTION_FILTER_TO_CATEGORY[expandedSectionOnly] : undefined;
  const displayCols = viewMode === 'deso-backed' ? ALT_COLS : ([...TOKEN_COLS] as (TokenCol | AltCol)[]);
  const getColLabel = (col: TokenCol | AltCol) =>
    viewMode === 'deso-backed' ? ALT_COL_LABELS[col as AltCol] : TOKEN_COL_LABELS[col as TokenCol];

  /** In DESO-backed view, Total = Staked + CCv1 + Unstaked only (avoids double-counting OpenFund/Focus etc.) */
  const getTotalForDisplay = useCallback(
    (row: TokenHoldingsRow): number | null | undefined => {
      if (viewMode === 'standard') return row.totalUsd;
      const staked = row.DESOStaked ?? 0;
      const ccv1 = row.type === 'issued' ? (ccv1NetworkTotalDeso ?? 0) : (row.CCv1 ?? 0);
      const unstaked = row.DESOUnstaked ?? 0;
      const totalDeso = staked + ccv1 + unstaked;
      return totalDeso * prices.deso;
    },
    [viewMode, prices.deso, ccv1NetworkTotalDeso]
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
    const header = rows.filter((r) => r.type === 'issued' || r.type === 'heldByIssuer' || r.type === 'price');
    let data = rows.filter((r) => r.type === 'account');
    if (namedOnly) data = data.filter((r) => r.isNamed === true);
    const footer = rows.filter((r) => r.type === 'overallTotal');
    return { headerRows: header, dataRows: data, footerRows: footer };
  }, [rows, namedOnly]);

  const sortedDataRows = useMemo(() => {
    let sorted = [...dataRows];
    if (useDefaultOrder) {
      sorted.sort((a, b) => {
        const orderA = getSortKey(a, 'defaultOrder') as number;
        const orderB = getSortKey(b, 'defaultOrder') as number;
        if (orderA !== orderB) return orderA - orderB;
        const totalA = getTotalForDisplay(a) ?? 0;
        const totalB = getTotalForDisplay(b) ?? 0;
        return totalB - totalA;
      });
    } else if (sortCol) {
      sorted.sort((a, b) => {
        const ka = sortCol === 'total' ? (getTotalForDisplay(a) ?? 0) : getSortKey(a, sortCol);
        const kb = sortCol === 'total' ? (getTotalForDisplay(b) ?? 0) : getSortKey(b, sortCol);
        const cmp = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    if (!useDefaultOrder && categoryFromFilter != null) {
      sorted = sorted.filter((r) => r.category === categoryFromFilter);
    }
    return sorted;
  }, [dataRows, sortCol, sortDir, useDefaultOrder, categoryFromFilter, getTotalForDisplay]);

  const fullSortedForGrouping = useMemo(() => {
    const sorted = [...dataRows];
    if (useDefaultOrder) {
      sorted.sort((a, b) => {
        const orderA = getSortKey(a, 'defaultOrder') as number;
        const orderB = getSortKey(b, 'defaultOrder') as number;
        if (orderA !== orderB) return orderA - orderB;
        if (sortCol) {
          const ka = sortCol === 'total' ? (getTotalForDisplay(a) ?? 0) : getSortKey(a, sortCol);
          const kb = sortCol === 'total' ? (getTotalForDisplay(b) ?? 0) : getSortKey(b, sortCol);
          const cmp = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
          return sortDir === 'asc' ? cmp : -cmp;
        }
        return (getTotalForDisplay(b) ?? 0) - (getTotalForDisplay(a) ?? 0);
      });
    }
    return sorted;
  }, [dataRows, useDefaultOrder, sortCol, sortDir, getTotalForDisplay]);

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

  const handleSort = (col: TokenCol | AltCol | 'category' | 'account' | 'total') => {
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

  const renderCell = (row: TokenHoldingsRow, col: TokenCol | AltCol) => {
    // DESO-backed Issued row: CCv1 uses network total from CC Locked
    const v =
      viewMode === 'deso-backed' && row.type === 'issued' && col === 'CCv1'
        ? (ccv1NetworkTotalDeso ?? row.CCv1 ?? 0)
        : row[col as TokenCol];

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
      if (col === 'DESOStaked' || col === 'DESOUnstaked') return '–';
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
            {viewMode === 'deso-backed'
              ? 'DESO-backed: Staked, CCv1, and Unstaked (12.2M). Openfund/Focus etc. are DeSo-backed.'
              : 'Sort by any column to see top holders by category (Foundation, Core Team, AMMs, DeSo Bulls).'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="token-holdings-named-only" checked={namedOnly} onCheckedChange={setNamedOnly} />
            <Label htmlFor="token-holdings-named-only" className="text-sm cursor-pointer whitespace-nowrap">
              Named accounts only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">View:</span>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1 text-xs rounded border ${
                viewMode === 'standard'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              Token breakdown
            </button>
            <button
              onClick={() => setViewMode('deso-backed')}
              className={`px-3 py-1 text-xs rounded border ${
                viewMode === 'deso-backed'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
              title="Staked, CCv1, and Unstaked only; Openfund/Focus etc. are DeSo-backed"
            >
              DESO-backed
            </button>
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
                  {getColLabel(col)} {sortCol === col && !useDefaultOrder && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-muted/80"
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
                  <td className="text-right py-1.5 px-3">
                    {formatTotal(getTotalForDisplay(totalRow))}
                  </td>
                </tr>
              );
            })()}
          </thead>
          <tbody>
            {headerRows.map((row, idx) => (
              <tr key={row.id} className="border-b border-border bg-muted/30">
                <td className="py-1.5 px-3">{idx + 1}</td>
                <td className="py-1.5 px-3" />
                <AccountCell row={row} />
                          {displayCols.map((col) => (
                  <td key={col} className="text-right py-1.5 px-3">
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="text-right py-1.5 px-3">
                  {(row.type === 'issued' || row.type === 'heldByIssuer') && getTotalForDisplay(row) != null ? formatTotal(getTotalForDisplay(row)) : '–'}
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
                        <td className="text-right py-1.5 px-3 font-medium">
                          {formatTotal(subTotalUsd)}
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
                              displayOverride={viewMode === 'deso-backed' && row.account === 'Unaccounted' ? 'Others-Unaccounted' : undefined}
                            />
                            {displayCols.map((col) => (
                              <td key={col} className="text-right py-1.5 px-3">
                                {renderCell(row, col)}
                              </td>
                            ))}
                            <td className="text-right py-1.5 px-3">
                              {formatTotal(getTotalForDisplay(row))}
                            </td>
                          </tr>
                        ))}
                      {open && sub && (
                        <tr key={`sub-${cat}`} className="border-b border-border bg-muted/30 font-medium">
                          <td className="py-1.5 px-3" />
                          <td className="py-1.5 px-3" />
                          <AccountCell row={sub} />
                          {displayCols.map((col) => (
                            <td key={col} className="text-right py-1.5 px-3">
                              {renderCell(sub, col)}
                            </td>
                          ))}
                          <td className="text-right py-1.5 px-3">
                            {formatTotal(getTotalForDisplay(sub))}
                          </td>
                        </tr>
                      )}
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
                      displayOverride={viewMode === 'deso-backed' && row.account === 'Unaccounted' ? 'Others-Unaccounted' : undefined}
                    />
                          {displayCols.map((col) => (
                      <td key={col} className="text-right py-1.5 px-3">
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="text-right py-1.5 px-3">
                      {formatTotal(getTotalForDisplay(row))}
                    </td>
                  </tr>
                ))}
            {footerRows.map((row) => (
              <tr key={row.id} className="border-b border-border bg-muted/30 font-medium">
                <td className="py-1.5 px-3" />
                <td className="py-1.5 px-3" />
                <AccountCell row={row} />
                          {displayCols.map((col) => (
                  <td key={col} className="text-right py-1.5 px-3">
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="text-right py-1.5 px-3">
                  {formatTotal(getTotalForDisplay(row))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
