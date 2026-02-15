import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWalletData } from '@/hooks/useWalletData';
import { getUsernameForLink } from '@/api/walletApi';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd, formatRelativeTime } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export default function DeSoBullsTable() {
  const { desoBullsWallets, isLoading, isLive, dataSource, cachedAt } = useWalletData();
  const { marketData } = useLiveData();

  const allWallets = useMemo(() => {
    const withUsd = desoBullsWallets.map((w) => {
      const b = w.balances;
      const usdValue =
        (b.DESO || 0) * marketData.desoPrice +
        (b.dUSDC || 0) +
        (b.Focus || 0) * marketData.focusPrice +
        (b.Openfund || 0) * marketData.openfundPrice +
        (b.dBTC || 0) * marketData.btcPrice +
        (b.dETH || 0) * marketData.ethPrice +
        (b.dSOL || 0) * marketData.solPrice;
      return { ...w, usdValue };
    });
    return [...withUsd].sort((a, b) => b.usdValue - a.usdValue);
  }, [desoBullsWallets, marketData]);

  const totalUsd = allWallets.reduce((s, w) => s + w.usdValue, 0);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(2);

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">DeSo Bulls</h3>
        {isLive ? (
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Live data
          </span>
        ) : (
          <span
            className="text-[10px] text-amber-500/90 font-medium uppercase tracking-wider"
            title="Values are from cache or static fallback, not live API"
          >
            {dataSource === 'cached' && cachedAt
              ? `Cached · ${formatRelativeTime(cachedAt)}`
              : 'Not live · Static data'}
          </span>
        )}
      </div>
      {desoBullsWallets.length === 0 && isLoading ? (
        <Skeleton className="h-48 w-full rounded" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Key Holdings</th>
                <th className="text-right">USD Value</th>
              </tr>
            </thead>
            <tbody>
              {allWallets.map((w) => (
                <tr key={w.name}>
                  <td className="font-mono text-xs">
                    <Link to={`/u/${encodeURIComponent(getUsernameForLink(w.name))}`} className="text-primary hover:underline">
                      {w.name}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {(() => {
                      const tokens = ['DESO', 'Openfund', 'Focus', 'dUSDC', 'dBTC', 'dETH', 'dSOL'] as const;
                      const items: { key: string; label: string; amt: number }[] = [];
                      const hasStakeBreakdown = w.desoStaked != null || w.desoUnstaked != null;
                      const staked = w.desoStaked ?? 0;
                      const unstaked = w.desoUnstaked ?? 0;
                      for (const token of tokens) {
                        const amt = w.balances[token] ?? 0;
                        if (amt <= 0) continue;
                        if (token === 'DESO' && hasStakeBreakdown && (staked > 0 || unstaked > 0)) {
                          if (unstaked > 0) items.push({ key: 'DESO-unstaked', label: 'DESO (unstaked)', amt: unstaked });
                          if (staked > 0) items.push({ key: 'DESO-staked', label: 'DESO (staked)', amt: staked });
                        } else {
                          items.push({ key: token, label: token, amt });
                        }
                      }
                      if (items.length === 0) return <span className="text-muted-foreground/60">—</span>;
                      return items.map(({ key, label, amt }) => (
                        <span key={key} className="mr-3">
                          <span className="text-foreground font-mono">{fmt(amt)}</span> {label}
                        </span>
                      ));
                    })()}
                  </td>
                  <td className="text-right font-mono text-sm">{formatUsd(w.usdValue)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td colSpan={2} className="text-xs pt-2">
                  Total
                </td>
                <td className="text-right font-mono text-sm pt-2">{formatUsd(totalUsd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
