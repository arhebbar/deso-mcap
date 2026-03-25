/**
 * DESO Protocol Revenue — NEAR Revenue Dashboard–style view.
 * Uses GraphQL dashboard + filtered transaction counts; fee DESO values use a documented nanos/tx model.
 */

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, TrendingUp } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useLiveData } from '@/hooks/useLiveData';
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats';
import { use30DayTrend } from '@/hooks/use30DayTrend';
import { useFilteredCountsWithPrevious } from '@/hooks/useFilteredCounts';
import type { TimeWindow } from '@/api/analyticsStatsApi';
import { MARKET_DATA } from '@/data/desoData';
import { dashboardBlockHeight } from '@/api/analyticsStatsApi';
import type { DashboardStatsNode } from '@/api/analyticsStatsApi';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Rough average fee per transaction (nanos) for *display estimates* — not on-chain accounting. */
const EST_NANOS_PER_TX = 2800;

function parseStat(s: string | null | undefined): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function estDesoFromTxCount(tx: number): number {
  return (tx * EST_NANOS_PER_TX) / 1e9;
}

function formatDeso(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

function formatUsd(deso: number, desoUsd: number): string {
  if (!Number.isFinite(deso)) return '—';
  const usd = deso * desoUsd;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

type RangeKey = '24h' | '7d' | '30d' | 'ytd' | '1y';

const RANGE_TO_WINDOW: Record<Exclude<RangeKey, '24h'>, TimeWindow> = {
  '7d': '7d',
  '30d': '30d',
  'ytd': '90d',
  '1y': '365d',
};

function MetricCard({
  title,
  subtitle,
  desoValue,
  usdHint,
  loading,
  info,
}: {
  title: string;
  subtitle: string;
  desoValue: string;
  usdHint: string;
  loading: boolean;
  info?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {info && (
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{info}</TooltipContent>
              </UiTooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight font-mono tabular-nums">{desoValue}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{usdHint}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function categoryShare(d: DashboardStatsNode | null): { name: string; pct: number }[] {
  if (!d) return [];
  const social = parseStat(d.txnCountSocial) ?? 0;
  const cc = parseStat(d.txnCountCreatorCoin) ?? 0;
  const dex = parseStat(d.txnCountDex) ?? 0;
  const nft = parseStat(d.txnCountNft) ?? 0;
  const sum = social + cc + dex + nft;
  if (sum <= 0) return [];
  return [
    { name: 'Social', pct: (social / sum) * 100 },
    { name: 'Creator coins', pct: (cc / sum) * 100 },
    { name: 'DEX / trades', pct: (dex / sum) * 100 },
    { name: 'NFT', pct: (nft / sum) * 100 },
  ].filter((x) => x.pct > 0.5);
}

export default function DesoRevenue() {
  const { isLive, lastUpdated } = useLiveData();
  const { dashboard, isLoading: statsLoading } = useAnalyticsStats();
  const { data: trend, isLoading: trendLoading } = use30DayTrend();
  const [range, setRange] = useState<RangeKey>('30d');

  const windowKey: TimeWindow = range === '24h' ? '30d' : RANGE_TO_WINDOW[range as Exclude<RangeKey, '24h'>];
  const { current: filtered, isLoading: filteredLoading } = useFilteredCountsWithPrevious(windowKey);

  const txnAll = parseStat(dashboard?.txnCountAll);
  const txn30dNode = parseStat(dashboard?.txnCount30D);
  const blockHeight = dashboardBlockHeight(dashboard);
  const totalSupply = parseStat(dashboard?.totalSupply);

  const txnsForRange = useMemo(() => {
    if (range === '24h') {
      const base = parseStat(filtered?.txnCount30D) ?? txn30dNode;
      if (base == null) return null;
      return Math.max(1, Math.round(base / 30));
    }
    if (range === '7d' || range === '30d' || range === 'ytd' || range === '1y') {
      return parseStat(filtered?.txnCount30D);
    }
    return null;
  }, [range, filtered?.txnCount30D, txn30dNode]);

  const loading = statsLoading || filteredLoading;

  const allTimeFeesDeso = txnAll != null ? estDesoFromTxCount(txnAll) : null;
  const rangeFeesDeso = txnsForRange != null ? estDesoFromTxCount(txnsForRange) : null;

  const desoUsd = MARKET_DATA.desoPrice;

  const chartData = useMemo(() => {
    return trend.map((p) => ({
      date: p.date.slice(5),
      txns: p.transactions,
      estFeesDeso: estDesoFromTxCount(p.transactions),
    }));
  }, [trend]);

  const categories = categoryShare(dashboard);

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="min-h-screen">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-violet-950/20 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground mb-4">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">DESO</span>
            <span>Last updated: {lastUpdatedLabel}</span>
            {blockHeight != null && <span>· Block {blockHeight.toLocaleString()}</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">DESO Revenue</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl text-sm md:text-base">
            Protocol &amp; network fee activity tracker. Estimates derive from indexed transaction counts × a
            fixed nanos-per-tx model — not official on-chain fee accounting.
          </p>

          {/* Range toggles */}
          <div className="mt-8 flex flex-wrap gap-2">
            {(['24h', '7d', '30d', 'ytd', '1y'] as RangeKey[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium font-mono transition-colors ${
                  range === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'ytd' ? 'YTD' : r === '1y' ? '1Y' : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-10 pb-12">
        {/* Top metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Total fees (est., all time)"
            subtitle="Cumulative — from GraphQL txn count × model"
            desoValue={allTimeFeesDeso != null ? `${formatDeso(allTimeFeesDeso)} DESO` : '—'}
            usdHint={allTimeFeesDeso != null ? `≈ ${formatUsd(allTimeFeesDeso, desoUsd)} @ $${desoUsd} DESO` : '—'}
            loading={loading}
            info="Uses dashboardStats.txnCountAll from the indexer. Each transaction is multiplied by a fixed nanos estimate for display."
          />
          <MetricCard
            title="Window fees (est.)"
            subtitle={range === '24h' ? '24h ≈ 1/30 of last 30d count' : `Filtered window: ${windowKey}`}
            desoValue={rangeFeesDeso != null ? `${formatDeso(rangeFeesDeso)} DESO` : '—'}
            usdHint={rangeFeesDeso != null ? `≈ ${formatUsd(rangeFeesDeso, desoUsd)}` : '—'}
            loading={loading}
            info="Window transaction counts come from filtered GraphQL queries (date range). 24h uses a simple daily average from 30d data when intraday is unavailable."
          />
        </div>

        {/* Chart */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Estimated fee activity (30d)
            </CardTitle>
            <CardDescription>Daily transactions from GraphQL trend; right axis shows DESO × fee model.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] w-full">
            {trendLoading && chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Fetching on-chain activity…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => formatDeso(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'estFeesDeso' ? `${formatDeso(value)} DESO` : value.toLocaleString(),
                      name === 'estFeesDeso' ? 'Est. DESO/day' : 'Transactions',
                    ]}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="txns"
                    name="txns"
                    stroke="hsl(var(--primary))"
                    fill="url(#fillTx)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="estFeesDeso"
                    name="estFeesDeso"
                    stroke="hsl(var(--chart-2))"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs supply (illustrative) */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity vs supply context</CardTitle>
              <CardDescription className="text-xs">
                Indexed total supply (GraphQL) vs estimated 30d fee DESO — not tokenomics advice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total supply (indexer)</span>
                <span>{totalSupply != null ? totalSupply.toLocaleString() : '—'} DESO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">30d txn count</span>
                <span>{txn30dNode != null ? txn30dNode.toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">30d fees (est.)</span>
                <span>
                  {txn30dNode != null
                    ? `${formatDeso(estDesoFromTxCount(txn30dNode))} DESO`
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category mix (cumulative index)</CardTitle>
              <CardDescription className="text-xs">Share of tagged activity buckets in dashboard stats.</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No breakdown available.</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((c) => (
                    <li key={c.name} className="flex justify-between text-sm font-mono">
                      <span>{c.name}</span>
                      <span>{c.pct.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Wallet-style table — protocol context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where fees accrue (overview)</CardTitle>
            <CardDescription className="text-xs">
              DeSo spreads fees across validators, creators, and burns; there is no single “revenue wallet” like some
              L1 dashboards. Below is an illustrative split by activity type.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Est. share</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.name} className="border-b border-border/60">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 font-mono">{c.pct.toFixed(1)}%</td>
                    <td className="py-2 text-muted-foreground text-xs">From dashboard txn type buckets</td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted-foreground">
                      Load dashboard stats to see category mix.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full border border-border rounded-lg divide-y divide-border">
            <AccordionItem value="1" className="border-0 px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                How is “revenue” different from transaction count?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">
                This page does not show audited protocol revenue. It shows <strong>estimated</strong> cumulative fee
                activity by multiplying indexed transaction counts by a constant nanos-per-transaction assumption. Real
                fees vary by transaction type and gas.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-0 px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                Why doesn’t 24h match my node?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">
                Intraday aggregates are not queried here; 24h uses a rough daily average from the last 30d window when
                fine-grained data is unavailable. Use the Protocol Activity tab for more granular network stats.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3" className="border-0 px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                What is the data source?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">
                Figures come from the configured DeSo GraphQL endpoint (see header provider toggle) —{' '}
                <code className="rounded bg-muted px-1">dashboardStats</code> and filtered transaction counts. Switching
                provider may change totals slightly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4" className="border-0 px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                Where can I learn more about DeSo economics?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">
                See{' '}
                <a
                  href="https://docs.deso.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  docs.deso.org
                </a>{' '}
                and the DeSo whitepaper for staking, creator coins, and fee mechanics.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <footer className="text-center py-6 text-xs text-muted-foreground font-mono">
          Model: {EST_NANOS_PER_TX} nanos / tx (display only) · DESO ≈ ${desoUsd} (dashboard fallback)
        </footer>
      </main>
    </div>
  );
}
