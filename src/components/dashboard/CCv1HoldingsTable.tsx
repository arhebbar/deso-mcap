/**
 * DESO locked in CCv1 – top Creator Coins by DESO locked.
 * Data from GraphQL; cached and filled in background up to 10K rows. Total reflects all cached data.
 */

import { useMemo, useState, useEffect } from 'react';
import { useCCv1HoldingsTable } from '@/hooks/useCCv1HoldingsTable';
import { useLiveData } from '@/hooks/useLiveData';
import { formatNumberShort, formatUsd } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { CCv1HoldingRow } from '@/api/walletApi';

const ROWS_PER_PAGE = 50;

export default function CCv1HoldingsTable() {
  const { marketData } = useLiveData();
  const desoPrice = marketData.desoPrice;
  const { rows, isLoading, isBackgroundLoading, totalDesoLocked, totalUsd, error, jobMeta } = useCCv1HoldingsTable();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => rows.slice(safePage * ROWS_PER_PAGE, (safePage + 1) * ROWS_PER_PAGE),
    [rows, safePage]
  );

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">DESO locked in CCv1</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Top creator coins by DESO locked (cached, up to 10K)
          </p>
        </div>
        <div className="p-4">
          <Skeleton className="h-64 w-full rounded" />
        </div>
      </section>
    );
  }

  if (error || (rows.length === 0 && !isLoading)) {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">DESO locked in CCv1</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Top creator coins by DESO locked (cached, up to 10K)
          </p>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          {rows.length === 0 ? 'No creator coins with DESO locked.' : 'Failed to load CCv1 holdings.'}
        </div>
      </section>
    );
  }

  const startIndex = safePage * ROWS_PER_PAGE;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">DESO locked in CCv1</h2>
          <p className="text-xs text-muted-foreground mt-1">
            *CCv1 Total from Locked Table – factors in only Top {rows.length} creator coins by value locked. Cached, up to 25K.
            {isBackgroundLoading && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading more…
              </span>
            )}
            {jobMeta && !isBackgroundLoading && (
              <span className="ml-2 text-muted-foreground" title={jobMeta.lastPageInfo ? `lastPageInfo: ${JSON.stringify(jobMeta.lastPageInfo)}` : undefined}>
                Job stopped: {jobMeta.stoppedReason}
                {jobMeta.lastPageInfo && ` (hasNextPage: ${jobMeta.lastPageInfo.hasNextPage})`}
              </span>
            )}
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage <= 0}
              className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Page {safePage + 1} of {totalPages} ({rows.length} creators)
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-2 px-3 w-12">#</th>
              <th className="text-left py-2 px-3">Creator</th>
              <th className="text-right py-2 px-3">DESO locked</th>
              <th className="text-right py-2 px-3">DESO locked (US$)</th>
              <th className="text-right py-2 px-3">Coin price (DESO)</th>
              <th className="text-right py-2 px-3">Coin price (US$)</th>
              <th className="text-right py-2 px-3">Coins in circulation</th>
              <th className="text-right py-2 px-3">Reserved CC</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row: CCv1HoldingRow, idx: number) => (
              <tr key={row.username ?? startIndex + idx} className="border-b border-border/50 hover:bg-muted/20">
                <td className="py-1.5 px-3 text-muted-foreground">{startIndex + idx + 1}</td>
                <td className="py-1.5 px-3 font-medium">{row.username ?? '—'}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatNumberShort(row.desoLocked)}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatUsd(row.desoLocked * desoPrice)}</td>
                <td className="py-1.5 px-3 text-right font-mono">
                  {row.coinPriceDeso != null ? formatNumberShort(row.coinPriceDeso) : '—'}
                </td>
                <td className="py-1.5 px-3 text-right font-mono">
                  {row.coinPriceDeso != null ? formatUsd(row.coinPriceDeso * desoPrice) : '—'}
                </td>
                <td className="py-1.5 px-3 text-right font-mono">
                  {row.ccCoinsInCirculation != null ? formatNumberShort(row.ccCoinsInCirculation) : '—'}
                </td>
                <td className="py-1.5 px-3 text-right font-mono">
                  {row.isReserved ? 'Yes' : '—'}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/30 font-medium">
              <td className="py-2 px-3" />
              <td className="py-2 px-3">CCv1 Total* ({rows.length} creators)</td>
              <td className="py-2 px-3 text-right font-mono">{formatNumberShort(totalDesoLocked)}</td>
              <td className="py-2 px-3 text-right font-mono">{formatUsd(totalUsd)}</td>
              <td className="py-2 px-3 text-right">—</td>
              <td className="py-2 px-3 text-right">—</td>
              <td className="py-2 px-3 text-right">—</td>
              <td className="py-2 px-3 text-right">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
