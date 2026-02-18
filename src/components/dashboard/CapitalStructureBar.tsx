/**
 * Capital Structure: interactive bar by asset with drilldown.
 * Bar → click Staked DESO → validator heatmap → click validator → top accounts + Others.
 * Bar → click other token → Foundation / AMM / Core Team / DeSo Bulls / Others.
 */

import { useState } from 'react';
import { useCirculationTable } from '@/hooks/useCirculationTable';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';
import { formatUsd } from '@/lib/formatters';

type View = 'bar' | 'validator-heatmap' | 'validator-accounts' | 'token-breakdown';

const SEGMENT_COLORS: Record<string, string> = {
  staked: 'hsl(199, 89%, 48%)',
  ccv1: 'hsl(280, 65%, 55%)',
  openfund: 'hsl(152, 69%, 45%)',
  focus: 'hsl(45, 93%, 47%)',
  deso: 'hsl(215, 80%, 50%)',
  dbtc: 'hsl(30, 80%, 50%)',
  deth: 'hsl(220, 60%, 55%)',
  dsol: 'hsl(250, 70%, 60%)',
  dusdc: 'hsl(120, 50%, 45%)',
  ccv2amm: 'hsl(320, 60%, 55%)',
};

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export default function CapitalStructureBar() {
  const data = useCirculationTable();
  const [view, setView] = useState<View>('bar');
  const [selectedValidatorId, setSelectedValidatorId] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  if (data.isLoading) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  const totalUsd =
    data.staked.usdValue + data.unstaked.sections.reduce((s, x) => s + x.usdValue, 0);
  const segments: { id: string; label: string; usd: number }[] = [
    { id: 'staked', label: 'Staked DESO', usd: data.staked.usdValue },
    ...data.unstaked.sections.map((sec) => ({ id: sec.id, label: sec.label, usd: sec.usdValue })),
  ].filter((s) => s.usd > 0);

  const selectedValidator =
    selectedValidatorId != null
      ? data.staked.validators.find((v) => v.id === selectedValidatorId)
      : null;
  const selectedSection =
    selectedTokenId != null
      ? data.unstaked.sections.find((s) => s.id === selectedTokenId)
      : null;

  function handleSegmentClick(id: string) {
    if (id === 'staked') {
      setView('validator-heatmap');
      setSelectedValidatorId(null);
      setSelectedTokenId(null);
    } else {
      setView('token-breakdown');
      setSelectedTokenId(id);
      setSelectedValidatorId(null);
    }
  }

  function handleValidatorClick(validatorId: string) {
    setSelectedValidatorId(validatorId);
    setView('validator-accounts');
  }

  function backToBar() {
    setView('bar');
    setSelectedValidatorId(null);
    setSelectedTokenId(null);
  }

  function backToHeatmap() {
    setView('validator-heatmap');
    setSelectedValidatorId(null);
  }

  // —— Bar view ——
  if (view === 'bar') {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <p className="text-xs text-muted-foreground mb-2">Click a segment to drill down</p>
        <div className="h-10 w-full flex rounded-md overflow-hidden bg-muted/30">
          {segments.map((seg) => {
            const pct = totalUsd > 0 ? (seg.usd / totalUsd) * 100 : 0;
            const color = SEGMENT_COLORS[seg.id] ?? 'hsl(0,0%,50%)';
            return (
              <button
                key={seg.id}
                type="button"
                className="min-w-[2px] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: color }}
                title={`${seg.label}: ${formatUsd(seg.usd)} (${pct.toFixed(1)}%)`}
                onClick={() => handleSegmentClick(seg.id)}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {segments.map((seg) => {
            const pct = totalUsd > 0 ? (seg.usd / totalUsd) * 100 : 0;
            const color = SEGMENT_COLORS[seg.id] ?? 'hsl(0,0%,50%)';
            return (
              <button
                key={seg.id}
                type="button"
                className="flex items-center gap-1.5 hover:underline"
                onClick={() => handleSegmentClick(seg.id)}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="tabular-nums">{formatUsd(seg.usd)}</span>
                <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Validator heatmap ——
  if (view === 'validator-heatmap') {
    const maxAmount = Math.max(...data.staked.validators.map((v) => v.amount), 1);
    return (
      <div className="chart-container">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={backToBar}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Back to bar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="section-title mb-0">Staked DESO by Validator</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Click a validator for top accounts</p>
        <div className="space-y-2">
          {data.staked.validators.map((v) => {
            const intensity = maxAmount > 0 ? v.amount / maxAmount : 0;
            const pct = data.staked.total > 0 ? (v.amount / data.staked.total) * 100 : 0;
            return (
              <button
                key={v.id}
                type="button"
                className="w-full flex items-center gap-3 text-left rounded-md p-2 hover:bg-muted/50 transition-colors"
                onClick={() => handleValidatorClick(v.id)}
              >
                <div
                  className="h-8 w-32 rounded shrink-0"
                  style={{
                    backgroundColor: `hsl(199, 89%, ${50 - intensity * 35}%)`,
                  }}
                />
                <span className="font-medium min-w-[140px]">{v.validatorName}</span>
                <span className="text-muted-foreground tabular-nums">{fmtDeso(v.amount)} DESO</span>
                <span className="text-muted-foreground tabular-nums">{formatUsd(v.usdValue)}</span>
                <span className="text-muted-foreground text-xs">({pct.toFixed(1)}%)</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Validator accounts (top + Others) ——
  if (view === 'validator-accounts' && selectedValidator) {
    const v = selectedValidator;
    return (
      <div className="chart-container">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={backToHeatmap}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Back to validators"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="section-title mb-0">{v.validatorName} – Top accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Account</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 text-right">DESO</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              {v.accounts.map((acc, i) => (
                <tr key={`${acc.name}-${i}`} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-1.5 pr-4 font-mono">{acc.name}</td>
                  <td className="py-1.5 pr-4 text-muted-foreground">{acc.category}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(acc.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(acc.usdValue)}</td>
                </tr>
              ))}
              {v.othersCount > 0 && (
                <tr className="bg-muted/20 text-muted-foreground">
                  <td className="py-1.5 pr-4 italic">Others ({v.othersCount} accounts)</td>
                  <td className="py-1.5 pr-4" />
                  <td className="py-1.5 text-right font-mono">{fmtDeso(v.othersAmount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(v.othersUsd)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // —— Token breakdown (Foundation / AMM / Core Team / DeSo Bulls / Others) ——
  if (view === 'token-breakdown' && selectedSection) {
    const sec = selectedSection;
    const total = sec.byCategory.reduce((s, c) => s + c.amount, 0) || sec.amount;
    return (
      <div className="chart-container">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={backToBar}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Back to bar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="section-title mb-0">{sec.label} – by category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">US$</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {sec.byCategory.map((c) => {
                const pct = total > 0 ? (c.amount / total) * 100 : 0;
                return (
                  <tr key={c.label} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1.5 pr-4">{c.label}</td>
                    <td className="py-1.5 text-right font-mono">
                      {sec.unit === 'DESO' ? fmtDeso(c.amount) : c.amount.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right font-mono">{formatUsd(c.usdValue)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="pt-2 pr-4">Total</td>
                <td className="pt-2 text-right font-mono">
                  {sec.unit === 'DESO' ? fmtDeso(sec.amount) : sec.amount.toLocaleString()}
                </td>
                <td className="pt-2 text-right font-mono">{formatUsd(sec.usdValue)}</td>
                <td className="pt-2 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
