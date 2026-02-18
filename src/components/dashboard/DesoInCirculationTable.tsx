/**
 * DESO in Circulation – single table with 3-level drilldown:
 * Level 1: Staked | Unstaked
 * Level 2a (Staked): Validators → Level 3a: Top N accounts + Others (expandable)
 * Level 2b (Unstaked): CCv1, Openfund, Focus, DESO, dBTC, dETH, dSOL, dUSDC, CCv2 AMMs → Level 3b: Foundation, AMM, Core Team, DeSo Bulls, Others
 */

import React, { useState } from 'react';
import { useCirculationTable } from '@/hooks/useCirculationTable';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, Plus, Minus } from 'lucide-react';
import { formatUsd } from '@/lib/formatters';

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function fmtToken(amount: number, unit: 'DESO' | 'token') {
  if (unit === 'token' && amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  return fmtDeso(amount);
}

export default function DesoInCirculationTable() {
  const data = useCirculationTable();
  const [openStaked, setOpenStaked] = useState(true);
  const [openUnstaked, setOpenUnstaked] = useState(true);
  const [openValidators, setOpenValidators] = useState<Set<string>>(new Set());
  const [openValidatorAccounts, setOpenValidatorAccounts] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openOthers, setOpenOthers] = useState<Set<string>>(new Set());

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (data.isLoading && data.staked.validators.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title mb-4">DESO in Circulation</h3>
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }

  const totalDeso = data.staked.total + data.unstaked.total;
  const totalUsd = data.staked.usdValue + data.unstaked.usdValue;
  const pct = (amount: number, of: number) => (of > 0 ? ((amount / of) * 100).toFixed(1) : '0.0');

  return (
    <div className="chart-container overflow-hidden">
      <h3 className="section-title mb-4">DESO in Circulation</h3>
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="w-8" />
              <th className="text-left">Category</th>
              <th className="text-right w-28">DESO / Amount</th>
              <th className="text-right w-28">US$</th>
              <th className="text-right w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {/* Level 1: Staked */}
            <tr
              className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
              onClick={() => setOpenStaked((v) => !v)}
            >
              <td className="py-2">
                {openStaked ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </td>
              <td>Staked</td>
              <td className="text-right font-mono text-sm">{fmtDeso(data.staked.total)}</td>
              <td className="text-right font-mono text-sm">{formatUsd(data.staked.usdValue)}</td>
              <td className="text-right text-muted-foreground text-sm">{pct(data.staked.total, data.totalSupply)}%</td>
            </tr>
            {openStaked &&
              data.staked.validators.map((v) => {
                const isValidatorOpen = openValidators.has(v.id);
                return (
                  <React.Fragment key={v.id}>
                    <tr
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => toggle(setOpenValidators, v.id)}
                    >
                      <td className="pl-6 py-1.5">
                        {isValidatorOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="text-sm text-muted-foreground pl-2">{v.validatorName}</td>
                      <td className="text-right font-mono text-xs">{fmtDeso(v.amount)}</td>
                      <td className="text-right font-mono text-xs">{formatUsd(v.usdValue)}</td>
                      <td className="text-right text-muted-foreground text-xs">{pct(v.amount, data.staked.total)}%</td>
                    </tr>
                    {isValidatorOpen &&
                      v.accounts.map((acc, i) => (
                        <tr key={`${v.id}-acc-${i}`} className="text-xs">
                          <td className="pl-10" />
                          <td className="pl-4 text-muted-foreground">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-[10px] mr-1.5">
                              {acc.category}
                            </span>
                            {acc.name}
                          </td>
                          <td className="text-right font-mono">{fmtDeso(acc.amount)}</td>
                          <td className="text-right font-mono">{formatUsd(acc.usdValue)}</td>
                          <td className="text-right text-muted-foreground">{pct(acc.amount, v.amount)}%</td>
                        </tr>
                      ))}
                    {isValidatorOpen && v.othersCount > 0 && (
                      <tr className="text-xs bg-muted/20">
                        <td className="pl-10" />
                        <td className="pl-4 text-muted-foreground italic">Others ({v.othersCount} accounts)</td>
                        <td className="text-right font-mono">{fmtDeso(v.othersAmount)}</td>
                        <td className="text-right font-mono">{formatUsd(v.othersUsd)}</td>
                        <td className="text-right text-muted-foreground">{pct(v.othersAmount, v.amount)}%</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

            {/* Level 1: Unstaked */}
            <tr
              className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
              onClick={() => setOpenUnstaked((v) => !v)}
            >
              <td className="py-2">
                {openUnstaked ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </td>
              <td>Unstaked</td>
              <td className="text-right font-mono text-sm">{fmtDeso(data.unstaked.total)}</td>
              <td className="text-right font-mono text-sm">{formatUsd(data.unstaked.usdValue)}</td>
              <td className="text-right text-muted-foreground text-sm">{pct(data.unstaked.total, data.totalSupply)}%</td>
            </tr>
            {openUnstaked && (() => {
              const b = data.unstaked.breakdown;
              const renderSection = (sec: typeof b.nativeTokens.openfund, indentLevel = 1) => {
                const isOpen = openSections.has(sec.id);
                const hasByCategory = sec.byCategory.length > 0;
                const indentClass = indentLevel === 1 ? 'pl-6' : 'pl-8';
                return (
                  <React.Fragment key={sec.id}>
                    <tr
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => hasByCategory && toggle(setOpenSections, sec.id)}
                    >
                      <td className={`${indentClass} py-1.5`}>
                        {hasByCategory ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-4" />}
                      </td>
                      <td className="text-sm text-muted-foreground pl-2">{sec.label}</td>
                      <td className="text-right font-mono text-xs">{fmtToken(sec.amount, sec.unit)}</td>
                      <td className="text-right font-mono text-xs">{formatUsd(sec.usdValue)}</td>
                      <td className="text-right text-muted-foreground text-xs">
                        {sec.unit === 'DESO' ? `${pct(sec.amount, data.totalSupply)}%` : '—'}
                      </td>
                    </tr>
                    {isOpen && hasByCategory &&
                      sec.byCategory.map((c) => (
                        <tr key={`${sec.id}-${c.label}`} className="text-xs">
                          <td className="pl-10" />
                          <td className="pl-4 text-muted-foreground">{c.label}</td>
                          <td className="text-right font-mono">{fmtToken(c.amount, sec.unit)}</td>
                          <td className="text-right font-mono">{formatUsd(c.usdValue)}</td>
                          <td className="text-right text-muted-foreground">
                            {sec.amount > 0 ? `${pct(c.amount, sec.amount)}%` : '0.0%'}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              };
              return (
                <>
                  {/* DESO Native Tokens */}
                  <tr className="pl-6 py-1.5 bg-muted/20">
                    <td className="pl-6 py-1.5 font-medium text-xs text-muted-foreground" colSpan={5}>DESO Native Tokens</td>
                  </tr>
                  {renderSection(b.nativeTokens.openfund, 2)}
                  {renderSection(b.nativeTokens.focus, 2)}
                  {/* DESO Currency Tokens */}
                  <tr className="pl-6 py-1.5 bg-muted/20">
                    <td className="pl-6 py-1.5 font-medium text-xs text-muted-foreground" colSpan={5}>DESO Currency Tokens</td>
                  </tr>
                  {renderSection(b.currencyTokens.dusdc, 2)}
                  {renderSection(b.currencyTokens.dbtc, 2)}
                  {renderSection(b.currencyTokens.deth, 2)}
                  {renderSection(b.currencyTokens.dsol, 2)}
                  {/* DESO User Tokens */}
                  <tr className="pl-6 py-1.5 bg-muted/20">
                    <td className="pl-6 py-1.5 font-medium text-xs text-muted-foreground" colSpan={5}>DESO User Tokens</td>
                  </tr>
                  {renderSection(b.userTokens, 2)}
                  {/* Native DESO */}
                  <tr className="pl-6 py-1.5 bg-muted/20">
                    <td className="pl-6 py-1.5 font-medium text-xs text-muted-foreground" colSpan={5}>Native DESO</td>
                  </tr>
                  {renderSection(b.nativeDeso, 2)}
                </>
              );
            })()}

            <tr className="border-t-2 border-border font-medium">
              <td />
              <td>Total</td>
              <td className="text-right font-mono">{fmtDeso(totalDeso)}</td>
              <td className="text-right font-mono">{formatUsd(totalUsd)}</td>
              <td className="text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
