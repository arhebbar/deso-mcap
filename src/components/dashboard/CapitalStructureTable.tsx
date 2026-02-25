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

  // Filter based on Supply Distribution segment (Staked DESO, DeSo CCv1 Locked, User/Project Tokens, Currency Tokens, Unstaked DESO)
  const segment = highlightedSegment?.toLowerCase() ?? null;
  const showStaked = segment === 'staked deso' || segment === null;
  const showCcv1 = segment === 'deso ccv1 locked';
  const showUserProject = segment === 'user/project tokens';
  const showCurrency = segment === 'currency tokens';
  const showUnstakedDeso = segment === 'unstaked deso';

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

  // One level of drill-down for non-Staked: show accounts and DESO value from circulation
  const breakdown = data.unstaked?.breakdown;
  const openfundSec = data.unstaked?.sections?.find((s) => s.id === 'openfund');
  const focusSec = data.unstaked?.sections?.find((s) => s.id === 'focus');
  const ccv2Sec = data.unstaked?.sections?.find((s) => s.id === 'ccv2amm');
  const dusdcSec = data.unstaked?.sections?.find((s) => s.id === 'dusdc');
  const dbtcSec = data.unstaked?.sections?.find((s) => s.id === 'dbtc');
  const dethSec = data.unstaked?.sections?.find((s) => s.id === 'deth');
  const dsolSec = data.unstaked?.sections?.find((s) => s.id === 'dsol');

  if (showCcv1) {
    const sec = data.unstaked?.sections?.find((s) => s.id === 'ccv1');
    if (!sec) return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <p className="text-sm text-muted-foreground">Click a segment in the Supply Distribution chart to filter.</p>
      </div>
    );
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure – CCv1 Locked</h3>
        <p className="text-xs text-muted-foreground mb-3">DESO locked in Creator Coins v1 (network total, no per-account breakdown)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 text-right">DESO</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-4">CCv1 Locked</td>
                <td className="py-1.5 text-right font-mono">{fmtDeso(sec.amount)}</td>
                <td className="py-1.5 text-right font-mono">{formatUsd(sec.usdValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showUserProject && breakdown) {
    const rows: { label: string; amount: number; usdValue: number }[] = [];
    if (openfundSec) rows.push({ label: 'Openfund', amount: openfundSec.amount, usdValue: openfundSec.usdValue });
    if (focusSec) rows.push({ label: 'Focus', amount: focusSec.amount, usdValue: focusSec.usdValue });
    if (ccv2Sec) rows.push({ label: 'CCv2 AMMs', amount: ccv2Sec.amount, usdValue: ccv2Sec.usdValue });
    const byCat = [
      ...(openfundSec?.byCategory ?? []).map((c) => ({ label: `Openfund: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
      ...(focusSec?.byCategory ?? []).map((c) => ({ label: `Focus: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
      ...(ccv2Sec?.byCategory ?? []).map((c) => ({ label: `CCv2: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
    ].filter((r) => r.amount > 0 || r.usdValue > 0);
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure – User/Project Tokens</h3>
        <p className="text-xs text-muted-foreground mb-3">DESO equivalent in Openfund, Focus, CCv2 AMMs (by account/category)</p>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Account / Category</th>
                <th className="pb-2 text-right">DESO equiv.</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              {byCat.length > 0 ? byCat.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(r.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(r.usdValue)}</td>
                </tr>
              )) : rows.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(r.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(r.usdValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showCurrency && (dusdcSec || dbtcSec || dethSec || dsolSec)) {
    const rows = [
      dusdcSec && { label: 'dUSDC', amount: dusdcSec.amount, usdValue: dusdcSec.usdValue },
      dbtcSec && { label: 'dBTC', amount: dbtcSec.amount, usdValue: dbtcSec.usdValue },
      dethSec && { label: 'dETH', amount: dethSec.amount, usdValue: dethSec.usdValue },
      dsolSec && { label: 'dSOL', amount: dsolSec.amount, usdValue: dsolSec.usdValue },
    ].filter(Boolean) as { label: string; amount: number; usdValue: number }[];
    const byCat = [
      ...(dusdcSec?.byCategory ?? []).map((c) => ({ label: `dUSDC: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
      ...(dbtcSec?.byCategory ?? []).map((c) => ({ label: `dBTC: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
      ...(dethSec?.byCategory ?? []).map((c) => ({ label: `dETH: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
      ...(dsolSec?.byCategory ?? []).map((c) => ({ label: `dSOL: ${c.label}`, amount: c.amount, usdValue: c.usdValue })),
    ].filter((r) => r.amount > 0 || r.usdValue > 0);
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure – Currency Tokens</h3>
        <p className="text-xs text-muted-foreground mb-3">dUSDC, dBTC, dETH, dSOL (by account/category)</p>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Account / Category</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              {byCat.length > 0 ? byCat.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(r.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(r.usdValue)}</td>
                </tr>
              )) : rows.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(r.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(r.usdValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showUnstakedDeso && breakdown?.nativeDeso) {
    const nd = breakdown.nativeDeso;
    const byCat = nd.byCategory ?? [];
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure – Unstaked DESO</h3>
        <p className="text-xs text-muted-foreground mb-3">Native DESO by category (excl. staked)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 text-right">DESO</th>
                <th className="pb-2 text-right">US$</th>
              </tr>
            </thead>
            <tbody>
              {byCat.map((c) => (
                <tr key={c.label} className="border-b border-border/50">
                  <td className="py-1.5 pr-4">{c.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmtDeso(c.amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(c.usdValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital Structure</h3>
      <p className="text-sm text-muted-foreground">Click a segment in the Supply Distribution chart to filter.</p>
    </div>
  );
}
