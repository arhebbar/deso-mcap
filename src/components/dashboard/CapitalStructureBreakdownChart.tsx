/**
 * 100% stacked bar chart: Foundation, AMM, Core Team, DeSo Bulls, Others.
 * One stacked bar per metric (Users, DESO, $) so the real mix is clear.
 */

import { useMemo } from 'react';
import { useWalletData } from '@/hooks/useWalletData';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd } from '@/lib/formatters';

const SECTIONS: { key: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'OTHERS'; label: string; color: string }[] = [
  { key: 'FOUNDATION', label: 'Foundation', color: 'hsl(280, 65%, 60%)' },
  { key: 'AMM', label: 'AMM', color: 'hsl(38, 92%, 50%)' },
  { key: 'FOUNDER', label: 'Core Team', color: 'hsl(0, 72%, 51%)' },
  { key: 'DESO_BULL', label: 'DeSo Bulls', color: 'hsl(262, 52%, 47%)' },
  { key: 'OTHERS', label: 'Free Float', color: 'hsl(152, 69%, 45%)' },
];

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(1);
}

export default function CapitalStructureBreakdownChart() {
  const { wallets, foundationDeso, ammDeso, founderDeso, desoBullsDeso, isLoading } = useWalletData();
  const { marketData } = useLiveData();

  const stats = useMemo(() => {
    const bySection: Record<string, { users: number; deso: number; usd: number }> = {
      FOUNDATION: { users: 0, deso: 0, usd: 0 },
      AMM: { users: 0, deso: 0, usd: 0 },
      FOUNDER: { users: 0, deso: 0, usd: 0 },
      DESO_BULL: { users: 0, deso: 0, usd: 0 },
      OTHERS: { users: 0, deso: 0, usd: 0 },
    };
    for (const w of wallets) {
      const k = w.classification;
      if (!bySection[k]) continue;
      const deso = w.balances.DESO ?? 0;
      const usd =
        deso * marketData.desoPrice +
        (w.balances.Openfund ?? 0) * marketData.openfundPrice +
        (w.balances.Focus ?? 0) * marketData.focusPrice +
        (w.balances.dUSDC ?? 0) +
        (w.balances.dBTC ?? 0) * marketData.btcPrice +
        (w.balances.dETH ?? 0) * marketData.ethPrice +
        (w.balances.dSOL ?? 0) * marketData.solPrice +
        (w.ccv1ValueDeso ?? 0) * marketData.desoPrice;
      bySection[k].users += 1;
      bySection[k].deso += deso;
      bySection[k].usd += usd;
    }
    const trackedDeso = foundationDeso + ammDeso + founderDeso + desoBullsDeso;
    const trackedUsd = bySection.FOUNDATION.usd + bySection.AMM.usd + bySection.FOUNDER.usd + bySection.DESO_BULL.usd;
    bySection.OTHERS.deso = Math.max(0, marketData.desoTotalSupply - trackedDeso);
    bySection.OTHERS.usd = Math.max(0, marketData.desoTotalSupply * marketData.desoPrice - trackedUsd);
    return bySection;
  }, [wallets, marketData, foundationDeso, ammDeso, founderDeso, desoBullsDeso]);

  const totals = useMemo(() => ({
    users: SECTIONS.reduce((s, sec) => s + stats[sec.key].users, 0),
    deso: SECTIONS.reduce((s, sec) => s + stats[sec.key].deso, 0),
    usd: SECTIONS.reduce((s, sec) => s + stats[sec.key].usd, 0),
  }), [stats]);

  if (isLoading) return null;

  // Use USD share for both DESO and Value bars so % is the same between user groups
  const totalUsd = totals.usd;
  const stackedBars = [
    { label: 'Users', key: 'users' as const, total: totals.users, format: (v: number) => (v > 0 ? String(v) : ''), useUsdShare: false },
    { label: 'DESO', key: 'deso' as const, total: totals.deso, format: fmtDeso, useUsdShare: true },
    { label: 'Value (USD)', key: 'usd' as const, total: totals.usd, format: (v: number) => (v > 0 ? formatUsd(v) : ''), useUsdShare: true },
  ];

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital</h3>
      <p className="text-xs text-muted-foreground mb-3">100% stacked: share of users, DESO, and $ value (hover for values)</p>
      <div className="space-y-4">
        {stackedBars.map((bar) => (
          <div key={bar.key} className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{bar.label}</span>
              <span>{bar.key === 'usd' && bar.total > 0 ? formatUsd(bar.total) : bar.key === 'deso' && bar.total > 0 ? fmtDeso(bar.total) : bar.total}</span>
            </div>
            <div className="h-8 w-full flex rounded overflow-hidden bg-muted/30">
              {SECTIONS.map((sec) => {
                const value = stats[sec.key][bar.key];
                const usdValue = stats[sec.key].usd;
                const pct = bar.useUsdShare && totalUsd > 0
                  ? (usdValue / totalUsd) * 100
                  : bar.total > 0 ? (value / bar.total) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <span
                    key={sec.key}
                    className="flex items-center justify-center min-w-0 overflow-hidden text-[10px] font-mono text-white transition-opacity hover:opacity-90"
                    style={{ width: `${pct}%`, backgroundColor: sec.color }}
                    title={`${sec.label}: ${bar.format(value)} (${pct.toFixed(1)}%)`}
                  >
                    {pct >= 8 ? bar.format(value) : ''}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        {SECTIONS.map((sec) => (
          <span key={sec.key} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
            <span className="text-muted-foreground">{sec.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
