/**
 * Free Float: total unaccounted DESO (and USD) plus list of anonymous (untracked) wallets
 * sorted by Unstaked DESO (top 10), with sort options. Wallets are clickable to explorer.deso.com.
 * Fetches balance (get-users-stateless) for anonymous wallet PKs so displayed holdings match chain.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveData } from '@/hooks/useLiveData';
import { useStakedDesoData } from '@/hooks/useStakedDesoData';
import { fetchBalancesForPublicKeys } from '@/api/walletApi';
import { formatUsd } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type SortField = 'unstaked' | 'staked' | 'usd';

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export default function FreeFloatSection() {
  const { marketData, freeFloat } = useLiveData();
  const { validatorBuckets, isLoading } = useStakedDesoData();
  const [sortField, setSortField] = useState<SortField>('usd');
  const [sortDesc, setSortDesc] = useState(true);
  const [includeTracked, setIncludeTracked] = useState(false);
  const [namedOnly, setNamedOnly] = useState(false);

  const anonymousPks = useMemo(() => {
    const pks = new Set<string>();
    for (const b of validatorBuckets) {
      for (const r of [...b.foundation, ...b.community]) {
        if (includeTracked) {
          pks.add(r.stakerPk);
        } else if (r.classification === 'COMMUNITY') {
          pks.add(r.stakerPk);
        }
      }
    }
    return Array.from(pks);
  }, [validatorBuckets, includeTracked]);

  const { data: balanceByPk } = useQuery({
    queryKey: ['anonymous-wallet-balances', [...anonymousPks].sort().join(',')],
    queryFn: () => fetchBalancesForPublicKeys(anonymousPks),
    enabled: anonymousPks.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const { freeFloatDeso, freeFloatUsd, anonymousWallets } = useMemo(() => {
    const freeFloatDeso = freeFloat;
    const freeFloatUsd = freeFloatDeso * marketData.desoPrice;

    const byPk = new Map<string, { name: string; pk: string; staked: number; unstaked: number; tokens: Record<string, number>; isNamed: boolean }>();

    for (const b of validatorBuckets) {
      for (const r of [...b.foundation, ...b.community]) {
        if (!includeTracked && r.classification !== 'COMMUNITY') continue;
        const cur = byPk.get(r.stakerPk);
        const name = r.stakerName || `${r.stakerPk.slice(0, 8)}…`;
        const isNamed = r.hasUsername;
        if (cur) {
          byPk.set(r.stakerPk, { ...cur, staked: cur.staked + r.amount, isNamed: cur.isNamed || isNamed });
        } else {
          byPk.set(r.stakerPk, { name, pk: r.stakerPk, staked: r.amount, unstaked: 0, tokens: {}, isNamed });
        }
      }
    }

    // Unstaked = total DESO (from chain) - staked; fetch balances so displayed holdings match chain
    for (const [pk, w] of byPk) {
      const totalDeso = balanceByPk?.get(pk) ?? 0;
      w.unstaked = Math.max(0, totalDeso - w.staked);
    }

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

    const filtered = namedOnly ? walletsList.filter((w) => w.isNamed) : walletsList;
    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortField === 'unstaked' ? a.unstaked : sortField === 'staked' ? a.staked : a.totalUsd;
      const bVal = sortField === 'unstaked' ? b.unstaked : sortField === 'staked' ? b.staked : b.totalUsd;
      return sortDesc ? bVal - aVal : aVal - bVal;
    });

    return { freeFloatDeso, freeFloatUsd, anonymousWallets: sorted.slice(0, includeTracked ? 200 : 100) };
  }, [freeFloat, marketData, validatorBuckets, sortField, sortDesc, balanceByPk, includeTracked, namedOnly]);

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
      <h3 className="section-title">FREE FLOAT</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Unaccounted DESO (supply minus staked minus tracked wallets). Sorted by Total Value (US$) by default. Use toggles to include Foundation/AMM/DeSo Bulls or to show only Top named accounts across DESO.
      </p>
      <div className="flex flex-wrap items-center gap-6 mb-3">
        <div className="flex items-center gap-2">
          <Switch id="include-tracked" checked={includeTracked} onCheckedChange={setIncludeTracked} />
          <Label htmlFor="include-tracked" className="text-sm cursor-pointer">Include Foundation / AMM / DeSo Bulls</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="named-only" checked={namedOnly} onCheckedChange={setNamedOnly} />
          <Label htmlFor="named-only" className="text-sm cursor-pointer">Named accounts only (exclude anonymous wallets)</Label>
        </div>
      </div>
      <div className="mb-4 p-4 rounded-lg bg-muted/30">
        <div className="text-2xl font-bold tabular-nums">{formatUsd(freeFloatUsd)}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {fmtDeso(freeFloatDeso)} DESO unaccounted
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">First 100 Anonymous wallets (click to open in DeSo Explorer)</h4>
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
                          href={`https://explorer.deso.com/u/${encodeURIComponent(w.name !== `${w.pk.slice(0, 8)}…` ? w.name : w.pk)}`}
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
