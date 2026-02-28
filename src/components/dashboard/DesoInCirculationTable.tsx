/**
 * DESO in Circulation – table with drilldown:
 * Level 1: DESO - Staked | User/Project Tokens (Openfund, Focus, CCv2 AMMs) | Currency/Liquidity Tokens | DESO - Unstaked
 * Columns: DESO - Staked, Price, # of Tokens, US$, %, DESO - Unstaked (last).
 * Others in DESO - Unstaked = 12.2M × DESO Price − sum(tracked); DESO - Unstaked column at end.
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

function fmtPrice(p: number): string {
  if (p >= 1) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(2);
}

export default function DesoInCirculationTable() {
  const data = useCirculationTable();
  const [openStaked, setOpenStaked] = useState(true);
  const [openNativeTokens, setOpenNativeTokens] = useState(true);
  const [openCurrencyTokens, setOpenCurrencyTokens] = useState(true);
  const [openUnstakedDeso, setOpenUnstakedDeso] = useState(true);
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
              <th className="text-right w-24">DESO - Staked</th>
              <th className="text-right w-20">Price</th>
              <th className="text-right w-20"># of Tokens</th>
              <th className="text-right w-28">US$</th>
              <th className="text-right w-12">%</th>
              <th className="text-right w-24">DESO - Unstaked</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
              onClick={() => setOpenStaked((v) => !v)}
            >
              <td className="py-2">
                {openStaked ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </td>
              <td>DESO - Staked</td>
              <td className="text-right font-mono text-sm">{fmtDeso(data.staked.total)}</td>
              <td className="text-right text-muted-foreground text-sm">—</td>
              <td className="text-right text-muted-foreground text-sm">—</td>
              <td className="text-right font-mono text-sm">{formatUsd(data.staked.usdValue)}</td>
              <td className="text-right text-muted-foreground text-sm">{pct(data.staked.total, data.totalSupply)}%</td>
              <td className="text-right text-muted-foreground text-sm">—</td>
            </tr>{openStaked &&
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
                      <td className="text-right text-muted-foreground text-xs">—</td>
                      <td className="text-right text-muted-foreground text-xs">—</td>
                      <td className="text-right font-mono text-xs">{formatUsd(v.usdValue)}</td>
                      <td className="text-right text-muted-foreground text-xs">{pct(v.amount, data.staked.total)}%</td>
                      <td className="text-right text-muted-foreground text-xs">—</td>
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
                          <td className="text-right text-muted-foreground">—</td>
                          <td className="text-right text-muted-foreground">—</td>
                          <td className="text-right font-mono">{formatUsd(acc.usdValue)}</td>
                          <td className="text-right text-muted-foreground">{pct(acc.amount, v.amount)}%</td>
                          <td className="text-right text-muted-foreground">—</td>
                        </tr>
                      ))}
                    {isValidatorOpen && v.othersCount > 0 && (
                      <tr className="text-xs bg-muted/20">
                        <td className="pl-10" />
                        <td className="pl-4 text-muted-foreground italic">Others ({v.othersCount} accounts)</td>
                        <td className="text-right font-mono">{fmtDeso(v.othersAmount)}</td>
                        <td className="text-right text-muted-foreground">—</td>
                        <td className="text-right text-muted-foreground">—</td>
                        <td className="text-right font-mono">{formatUsd(v.othersUsd)}</td>
                        <td className="text-right text-muted-foreground">{pct(v.othersAmount, v.amount)}%</td>
                        <td className="text-right text-muted-foreground">—</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}{(() => {
              const b = data.unstaked.breakdown;
              const nt = b.nativeTokens;
              const nativeTokensDeso = nt.openfund.amount + nt.focus.amount + nt.userTokens.amount;
              const nativeTokensUsd = nt.openfund.usdValue + nt.focus.usdValue + nt.userTokens.usdValue;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenNativeTokens((v) => !v)}
                  >
                    <td className="py-2">
                      {openNativeTokens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>User/Project Tokens</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right font-mono text-sm">{formatUsd(nativeTokensUsd)}</td>
                    <td className="text-right text-muted-foreground text-sm">{pct(nativeTokensDeso, data.totalSupply)}%</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                  </tr>
                  {openNativeTokens && (() => {
                    const renderSection = (sec: typeof nt.openfund, indentLevel = 1) => {
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
                            <td className="text-right text-muted-foreground text-xs">—</td>
                            <td className="text-right font-mono text-xs">{sec.price != null ? fmtPrice(sec.price) : '—'}</td>
                            <td className="text-right font-mono text-xs">{sec.tokenCount != null ? fmtToken(sec.tokenCount, 'token') : '—'}</td>
                            <td className="text-right font-mono text-xs">{formatUsd(sec.usdValue)}</td>
                            <td className="text-right text-muted-foreground text-xs">
                              {sec.unit === 'DESO' ? `${pct(sec.amount, data.totalSupply)}%` : '—'}
                            </td>
                            <td className="text-right text-muted-foreground text-xs">—</td>
                          </tr>
                          {isOpen && hasByCategory &&
                            sec.byCategory.map((c) => (
                              <tr key={`${sec.id}-${c.label}`} className="text-xs">
                                <td className="pl-10" />
                                <td className="pl-4 text-muted-foreground">{c.label}</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right font-mono">{formatUsd(c.usdValue)}</td>
                                <td className="text-right text-muted-foreground">
                                  {sec.amount > 0 ? `${pct(c.amount, sec.amount)}%` : '0.0%'}
                                </td>
                                <td className="text-right text-muted-foreground">—</td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    };
                    return <>{renderSection(nt.openfund, 1)} {renderSection(nt.focus, 1)} {renderSection(nt.userTokens, 1)}</>;
                  })()}
                </>
              );
            })()}{(() => {
              const b = data.unstaked.breakdown;
              const ct = b.currencyTokens;
              const currDeso = ct.dusdc.amount + ct.dbtc.amount + ct.deth.amount + ct.dsol.amount;
              const currUsd = ct.dusdc.usdValue + ct.dbtc.usdValue + ct.deth.usdValue + ct.dsol.usdValue;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenCurrencyTokens((v) => !v)}
                  >
                    <td className="py-2">
                      {openCurrencyTokens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>Currency/Liquidity Tokens</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right font-mono text-sm">{formatUsd(currUsd)}</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                  </tr>
                  {openCurrencyTokens && (() => {
                    const renderSection = (sec: typeof ct.dusdc) => {
                      const isOpen = openSections.has(sec.id);
                      const hasByCategory = sec.byCategory.length > 0;
                      return (
                        <React.Fragment key={sec.id}>
                          <tr
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => hasByCategory && toggle(setOpenSections, sec.id)}
                          >
                            <td className="pl-6 py-1.5">
                              {hasByCategory ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-4" />}
                            </td>
                            <td className="text-sm text-muted-foreground pl-2">{sec.label}</td>
                            <td className="text-right text-muted-foreground text-xs">—</td>
                            <td className="text-right font-mono text-xs">{sec.price != null ? (sec.id === 'dusdc-nf' ? '$1' : formatUsd(sec.price)) : '—'}</td>
                            <td className="text-right font-mono text-xs">{sec.tokenCount != null ? fmtToken(sec.tokenCount, 'token') : '—'}</td>
                            <td className="text-right font-mono text-xs">{formatUsd(sec.usdValue)}</td>
                            <td className="text-right text-muted-foreground text-xs">—</td>
                            <td className="text-right text-muted-foreground text-xs">—</td>
                          </tr>
                          {isOpen && hasByCategory &&
                            sec.byCategory.map((c) => (
                              <tr key={`${sec.id}-${c.label}`} className="text-xs">
                                <td className="pl-10" />
                                <td className="pl-4 text-muted-foreground">{c.label}</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right text-muted-foreground">—</td>
                                <td className="text-right font-mono">{formatUsd(c.usdValue)}</td>
                                <td className="text-right text-muted-foreground">
                                  {sec.amount > 0 ? `${pct(c.amount, sec.amount)}%` : '0.0%'}
                                </td>
                                <td className="text-right text-muted-foreground">—</td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    };
                    return (
                      <>
                        {renderSection(ct.dusdc)}
                        {renderSection(ct.dbtc)}
                        {renderSection(ct.deth)}
                        {renderSection(ct.dsol)}
                      </>
                    );
                  })()}
                </>
              );
            })()}{(() => {
              const b = data.unstaked.breakdown;
              const nd = b.nativeDeso;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenUnstakedDeso((v) => !v)}
                  >
                    <td className="py-2">
                      {openUnstakedDeso ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>DESO - Unstaked</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                    <td className="text-right font-mono text-sm">{formatUsd(nd.usdValue)}</td>
                    <td className="text-right text-muted-foreground text-sm">{pct(nd.amount, data.totalSupply)}%</td>
                    <td className="text-right font-mono text-sm">{fmtDeso(nd.amount)}</td>
                  </tr>
                  {openUnstakedDeso &&
                    nd.byCategory.map((c) => (
                      <tr key={`${nd.id}-${c.label}`} className="text-xs">
                        <td className="pl-10" />
                        <td className="pl-4 text-muted-foreground whitespace-nowrap min-w-[7rem]" title={c.label}>{c.label}</td>
                        <td className="text-right text-muted-foreground">—</td>
                        <td className="text-right text-muted-foreground">—</td>
                        <td className="text-right text-muted-foreground">—</td>
                        <td className="text-right font-mono">{formatUsd(c.usdValue)}</td>
                        <td className="text-right text-muted-foreground">
                          {nd.amount > 0 ? `${pct(c.amount, nd.amount)}%` : '0.0%'}
                        </td>
                        <td className="text-right font-mono">{fmtDeso(c.amount)}</td>
                      </tr>
                    ))}
                </>
              );
            })()}<tr className="border-t-2 border-border font-medium">
              <td />
              <td>Total</td>
              <td className="text-right font-mono">{fmtDeso(data.staked.total)}</td>
              <td className="text-right text-muted-foreground">—</td>
              <td className="text-right text-muted-foreground">—</td>
              <td className="text-right font-mono">{formatUsd(totalUsd)}</td>
              <td className="text-right">100%</td>
              <td className="text-right font-mono">{fmtDeso(data.unstaked.breakdown.nativeDeso.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
