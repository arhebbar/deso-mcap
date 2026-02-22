/**
 * DESO in Circulation – table with 3-level drilldown:
 * Level 1: Staked | DESO Native Tokens | DESO Currency Tokens | Unstaked DESO
 * Level 2a (Staked): Validators → Level 3a: Top N accounts + Others (expandable)
 * Level 2b: Under each category, sub-sections (Openfund/Focus, dUSDC/dBTC/dETH/dSOL, Unstaked DESO + CCv2 with Others)
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

            {/* Level 1: DESO Native Tokens */}
            {(() => {
              const b = data.unstaked.breakdown;
              const nativeTokensDeso = b.nativeTokens.openfund.amount + b.nativeTokens.focus.amount;
              const nativeTokensUsd = b.nativeTokens.openfund.usdValue + b.nativeTokens.focus.usdValue;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenNativeTokens((v) => !v)}
                  >
                    <td className="py-2">
                      {openNativeTokens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>DESO Native Tokens</td>
                    <td className="text-right font-mono text-sm">{fmtDeso(nativeTokensDeso)}</td>
                    <td className="text-right font-mono text-sm">{formatUsd(nativeTokensUsd)}</td>
                    <td className="text-right text-muted-foreground text-sm">{pct(nativeTokensDeso, data.totalSupply)}%</td>
                  </tr>
                  {openNativeTokens && (() => {
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
                    return <>{renderSection(b.nativeTokens.openfund, 1)} {renderSection(b.nativeTokens.focus, 1)}</>;
                  })()}
                </>
              );
            })()}
            {/* Level 1: DESO Currency Tokens */}
            {(() => {
              const b = data.unstaked.breakdown;
              const currDeso = b.currencyTokens.dusdc.amount + b.currencyTokens.dbtc.amount + b.currencyTokens.deth.amount + b.currencyTokens.dsol.amount;
              const currUsd = b.currencyTokens.dusdc.usdValue + b.currencyTokens.dbtc.usdValue + b.currencyTokens.deth.usdValue + b.currencyTokens.dsol.usdValue;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenCurrencyTokens((v) => !v)}
                  >
                    <td className="py-2">
                      {openCurrencyTokens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>DESO Currency Tokens</td>
                    <td className="text-right font-mono text-sm">{fmtToken(currDeso, 'token')}</td>
                    <td className="text-right font-mono text-sm">{formatUsd(currUsd)}</td>
                    <td className="text-right text-muted-foreground text-sm">—</td>
                  </tr>
                  {openCurrencyTokens && (() => {
                    const renderSection = (sec: typeof b.currencyTokens.dusdc) => {
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
                            <td className="text-right font-mono text-xs">{fmtToken(sec.amount, sec.unit)}</td>
                            <td className="text-right font-mono text-xs">{formatUsd(sec.usdValue)}</td>
                            <td className="text-right text-muted-foreground text-xs">—</td>
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
                        {renderSection(b.currencyTokens.dusdc)}
                        {renderSection(b.currencyTokens.dbtc)}
                        {renderSection(b.currencyTokens.deth)}
                        {renderSection(b.currencyTokens.dsol)}
                      </>
                    );
                  })()}
                </>
              );
            })()}
            {/* Level 1: Unstaked DESO (Native DESO + CCv2 AMMs) */}
            {(() => {
              const b = data.unstaked.breakdown;
              const unstakedDesoTotal = b.nativeDeso.amount + b.userTokens.amount;
              const unstakedDesoUsd = b.nativeDeso.usdValue + b.userTokens.usdValue;
              return (
                <>
                  <tr
                    className="bg-muted/40 font-medium cursor-pointer hover:bg-muted/60"
                    onClick={() => setOpenUnstakedDeso((v) => !v)}
                  >
                    <td className="py-2">
                      {openUnstakedDeso ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td>Unstaked DESO</td>
                    <td className="text-right font-mono text-sm">{fmtDeso(unstakedDesoTotal)}</td>
                    <td className="text-right font-mono text-sm">{formatUsd(unstakedDesoUsd)}</td>
                    <td className="text-right text-muted-foreground text-sm">{pct(unstakedDesoTotal, data.totalSupply)}%</td>
                  </tr>
                  {openUnstakedDeso && (() => {
                    const renderSection = (sec: typeof b.nativeDeso) => {
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
                                <td className="pl-4 text-muted-foreground whitespace-nowrap" title={c.label}>{c.label}</td>
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
                        {renderSection(b.nativeDeso)}
                        {renderSection(b.userTokens)}
                      </>
                    );
                  })()}
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
