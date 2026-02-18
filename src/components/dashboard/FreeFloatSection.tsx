/**
 * Free Float: total unaccounted DESO (and USD) plus list of anonymous (untracked) wallets
 * sorted by Unstaked DESO (top 10), with sort options. Wallets are clickable to wallet.deso.com.
 */

import { useMemo, useState } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { useStakedDesoData } from '@/hooks/useStakedDesoData';
import { useWalletData } from '@/hooks/useWalletData';
import { formatUsd } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown } from 'lucide-react';

type SortField = 'unstaked' | 'staked' | 'usd';

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export default function FreeFloatSection() {
  const { marketData, freeFloat } = useLiveData();
  const { validatorBuckets, isLoading } = useStakedDesoData();
  const { wallets } = useWalletData();
  const [sortField, setSortField] = useState<SortField>('unstaked');
  const [sortDesc, setSortDesc] = useState(true);

  const { freeFloatDeso, freeFloatUsd, anonymousWallets } = useMemo(() => {
    const freeFloatDeso = freeFloat;
    const freeFloatUsd = freeFloatDeso * marketData.desoPrice;

    const byPk = new Map<string, { name: string; pk: string; staked: number; unstaked: number; tokens: Record<string, number> }>();
    const trackedPks = new Set(wallets.map((w) => w.name.toLowerCase()));

    for (const b of validatorBuckets) {
      for (const r of [...b.foundation, ...b.community]) {
        if (r.classification !== 'COMMUNITY') continue;
        const cur = byPk.get(r.stakerPk);
        const name = r.stakerName || `${r.stakerPk.slice(0, 8)}…`;
        if (cur) {
          byPk.set(r.stakerPk, { ...cur, staked: cur.staked + r.amount });
        } else {
          byPk.set(r.stakerPk, { name, pk: r.stakerPk, staked: r.amount, unstaked: 0, tokens: {} });
        }
      }
    }

    // Note: Anonymous wallets are untracked, so we don't have their unstaked/token balances
    // We only have staked amounts from the validator data

    const walletsList = Array.from(byPk.values()).map((w) => {
      const tokensUsd = Object.entries(w.tokens).reduce((sum, [token, amt]) => {
        if (token === 'Openfund') return sum + (amt * marketData.openfundPrice);
        if (token === 'Focus') return sum + (amt * marketData.focusPrice);
        if (token === 'dBTC') return sum + (amt * marketData.btcPrice);
        if (token === 'dETH') return sum + (amt * marketData.ethPrice);
        if (token === 'dSOL') return sum + (amt * marketData.solPrice);
        if (token === 'dUSDC') return sum + amt;
        return sum;
      }, 0);
      const stakedUsd = w.staked * marketData.desoPrice;
      const unstakedUsd = w.unstaked * marketData.desoPrice;
      const totalUsd = stakedUsd + unstakedUsd + tokensUsd;
      return {
        ...w,
        stakedUsd,
        unstakedUsd,
        tokensUsd,
        totalUsd,
      };
    });

    const sorted = [...walletsList].sort((a, b) => {
      const aVal = sortField === 'unstaked' ? a.unstaked : sortField === 'staked' ? a.staked : a.totalUsd;
      const bVal = sortField === 'unstaked' ? b.unstaked : sortField === 'staked' ? b.staked : b.totalUsd;
      return sortDesc ? bVal - aVal : aVal - bVal;
    });

    return { freeFloatDeso, freeFloatUsd, anonymousWallets: sorted.slice(0, 10) };
  }, [freeFloat, marketData, validatorBuckets, wallets, sortField, sortDesc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Free Float</h3>
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title">Free Float</h3>
      <p className="text-xs text-muted-foreground mb-3">Unaccounted DESO (supply minus staked minus tracked wallets). Anonymous = untracked stakers.</p>
      <div className="mb-4 p-4 rounded-lg bg-muted/30">
        <div className="text-2xl font-bold tabular-nums">{formatUsd(freeFloatUsd)}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {fmtDeso(freeFloatDeso)} DESO unaccounted
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Top 10 Anonymous wallets (click wallet to open in DeSo Wallet)</h4>
        {anonymousWallets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No untracked stakers in current data.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 pr-4">Wallet</th>
                  <th className="pb-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('unstaked')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Unstaked DESO
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'unstaked' ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  </th>
                  <th className="pb-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('staked')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Staked DESO
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'staked' ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  </th>
                  <th className="pb-2 text-right">Tokens</th>
                  <th className="pb-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('usd')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Total US$
                      <ArrowUpDown className={`h-3 w-3 ${sortField === 'usd' ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {anonymousWallets.map((w) => {
                  const tokenList = Object.keys(w.tokens).length > 0
                    ? Object.entries(w.tokens)
                        .filter(([_, amt]) => amt > 0)
                        .map(([token, amt]) => `${fmtDeso(amt)} ${token}`)
                        .join(', ')
                    : '—';
                  const hasFullData = w.unstaked > 0 || Object.keys(w.tokens).length > 0;
                  return (
                    <tr key={w.pk} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-1.5 pr-4">
                        <a
                          href={`https://wallet.deso.com/?tab=activity&user=${encodeURIComponent(w.pk)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline block"
                        >
                          {w.name}
                        </a>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 break-all">{w.pk}</div>
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {w.unstaked > 0 ? fmtDeso(w.unstaked) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-1.5 text-right font-mono">{fmtDeso(w.staked)}</td>
                      <td className="py-1.5 text-right text-xs text-muted-foreground">{tokenList}</td>
                      <td className="py-1.5 text-right font-mono">
                        {hasFullData ? formatUsd(w.totalUsd) : formatUsd(w.stakedUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
