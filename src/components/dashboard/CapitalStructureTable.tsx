/**
 * Capital Structure Table: filtered by Supply Distribution Doughnut selection.
 * When "Staked" is clicked, shows Validator Table (Top 10 + Others).
 * Caches data to avoid blank on load.
 */

import { useMemo } from 'react';
import { useCirculationTable } from '@/hooks/useCirculationTable';
import { useWalletData } from '@/hooks/useWalletData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsd } from '@/lib/formatters';

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

const TOP_N_VALIDATORS = 10;

export default function CapitalStructureTable({ highlightedSegment }: { highlightedSegment: string | null }) {
  const data = useCirculationTable();
  const { ammDeso, foundationDeso, founderDeso, desoBullsDeso } = useWalletData();

  // Cache data to avoid blank on load
  const cachedData = useMemo(() => {
    if (data.isLoading && data.staked.validators.length === 0) return null;
    return {
      validators: data.staked.validators,
      openfundSection: data.unstaked.sections.find((s) => s.id === 'openfund'),
      focusSection: data.unstaked.sections.find((s) => s.id === 'focus'),
      desoPrice: data.desoPrice,
      ammUsd: ammDeso * data.desoPrice,
      coreTeamUsd: founderDeso * data.desoPrice,
      desoBullsUsd: desoBullsDeso * data.desoPrice,
    };
  }, [data.isLoading, data.staked.validators.length, data.staked.validators, data.unstaked.sections, data.desoPrice, ammDeso, founderDeso, desoBullsDeso]);

  if (data.isLoading && !cachedData) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  const displayData = cachedData || {
    validators: data.staked.validators,
    openfundSection: data.unstaked.sections.find((s) => s.id === 'openfund'),
    focusSection: data.unstaked.sections.find((s) => s.id === 'focus'),
    desoPrice: data.desoPrice,
    ammUsd: ammDeso * data.desoPrice,
    coreTeamUsd: founderDeso * data.desoPrice,
    desoBullsUsd: desoBullsDeso * data.desoPrice,
  };

  // Filter based on highlighted segment
  const segment = highlightedSegment?.toLowerCase() ?? null;
  const showStaked = segment === 'staked' || segment === null;
  const showOpenfund = segment === 'openfund' || segment === null;
  const showFocus = segment === 'focus' || segment === null;
  const showAmm = segment === 'amm' || segment === null;
  const showCoreTeam = segment === 'core team' || segment === null;
  const showDeSoBulls = segment === 'deso bulls' || segment === null;

  if (showStaked) {
    const sortedValidators = [...displayData.validators].sort((a, b) => b.amount - a.amount);
    const topValidators = sortedValidators.slice(0, TOP_N_VALIDATORS);
    const others = sortedValidators.slice(TOP_N_VALIDATORS);
    const othersTotal = others.reduce((s, v) => s + v.amount, 0);
    const othersUsd = othersTotal * displayData.desoPrice;

    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure - Validators</h3>
        <p className="text-xs text-muted-foreground mb-3">Top {TOP_N_VALIDATORS} validators by staked DESO (click "Staked" in doughnut to filter)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Validator Name</th>
                <th className="pb-2 text-right">DESO</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              {topValidators.map((v) => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{v.validatorName}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(v.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(v.usdValue)}</td>
                </tr>
              ))}
              {others.length > 0 && (
                <tr className="border-t font-medium bg-muted/20">
                  <td className="py-1.5 pr-4 italic">Others ({others.length} validators)</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(othersTotal)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(othersUsd)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show other sections as a simple table
  const rows: { label: string; deso?: number; usd: number }[] = [];
  if (showOpenfund && displayData.openfundSection) {
    rows.push({
      label: 'OpenFund',
      deso: displayData.openfundSection.amount,
      usd: displayData.openfundSection.usdValue,
    });
  }
  if (showFocus && displayData.focusSection) {
    rows.push({
      label: 'Focus',
      deso: displayData.focusSection.amount,
      usd: displayData.focusSection.usdValue,
    });
  }
  if (showAmm) {
    rows.push({ label: 'AMMs', usd: displayData.ammUsd });
  }
  if (showCoreTeam) {
    rows.push({ label: 'Core Team', usd: displayData.coreTeamUsd });
  }
  if (showDeSoBulls) {
    rows.push({ label: 'DeSo Bulls', usd: displayData.desoBullsUsd });
  }

  if (rows.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <p className="text-sm text-muted-foreground">Click a segment in the Supply Distribution chart to filter.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital Structure</h3>
      <p className="text-xs text-muted-foreground mb-3">Filtered by selected segment (click doughnut to change)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-left">
              <th className="pb-2 pr-4">Category</th>
              {rows.some((r) => r.deso != null) && <th className="pb-2 text-right">DESO</th>}
              <th className="pb-2 text-right">US$</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/50">
                <td className="py-1.5 pr-4">{r.label}</td>
                {r.deso != null && <td className="py-1.5 text-right font-mono">{fmtDeso(r.deso)}</td>}
                <td className="py-1.5 text-right font-mono">{formatUsd(r.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
