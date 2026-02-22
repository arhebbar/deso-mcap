import { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import SupplyPieChart from '@/components/dashboard/SupplyPieChart';
import CapitalStructureTable from '@/components/dashboard/CapitalStructureTable';
import TrendCharts from '@/components/dashboard/TrendCharts';
import DesoInCirculationTable from '@/components/dashboard/DesoInCirculationTable';
import AssetsBreakdownBar from '@/components/dashboard/AssetsBreakdownBar';
import type { SectionFilter } from '@/components/dashboard/AssetsBreakdownBar';
import CapitalStructureBreakdownChart from '@/components/dashboard/CapitalStructureBreakdownChart';
import TreasuryAddressTable from '@/components/dashboard/TreasuryAddressTable';
import TokenHoldingsTable from '@/components/dashboard/TokenHoldingsTable';
import FreeFloatSection from '@/components/dashboard/FreeFloatSection';
import { useLiveData } from '@/hooks/useLiveData';
import { useWalletData } from '@/hooks/useWalletData';
import { useCirculationTable } from '@/hooks/useCirculationTable';
import { formatUsd, formatRatio, formatPercent } from '@/lib/formatters';

const Index = () => {
  const {
    marketData,
    marketCap,
    ammDeso,
    freeFloat,
    floatAdjustedMcap,
    btcTreasuryValue,
    treasuryCoverage,
    dusdcBacking,
    isLive,
    isLoading,
    lastUpdated,
  } = useLiveData();
  const { foundationDeso, founderDeso, desoBullsDeso } = useWalletData();
  const circulation = useCirculationTable();
  const [highlightedSupplySegment, setHighlightedSupplySegment] = useState<string | null>(null);
  const [tableSectionFilter, setTableSectionFilter] = useState<SectionFilter | undefined>(undefined);

  const totalSupply = marketData.desoTotalSupply;
  // Use same staked total as Capital Structure / circulation so both charts match
  const staked = circulation.isLoading ? marketData.desoStaked : circulation.staked.total;
  const others = Math.max(0, totalSupply - staked - foundationDeso - ammDeso - founderDeso - desoBullsDeso);
  const supplyData = [
    { name: 'Staked', value: staked },
    { name: 'Foundation', value: foundationDeso },
    { name: 'AMM', value: ammDeso },
    { name: 'Core Team', value: founderDeso },
    { name: 'DeSo Bulls', value: desoBullsDeso },
    { name: 'Others', value: others },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* KPI Row - show cached/static values first, then refresh with live data */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="DESO Market Cap" value={formatUsd(marketCap)} subtitle={isLoading ? 'Updating…' : `$${marketData.desoPrice.toFixed(2)}/DESO`} />
          <KpiCard label="Float-Adjusted MCap" value={formatUsd(floatAdjustedMcap)} subtitle={isLoading ? 'Updating…' : `${formatPercent(freeFloat / marketData.desoTotalSupply)} float`} />
          <KpiCard label="BTC Treasury" value={formatUsd(btcTreasuryValue)} subtitle={isLoading ? 'Updating…' : `$${marketData.btcPrice.toLocaleString()}/BTC`} />
          <KpiCard
            label="Treasury Coverage"
            value={formatRatio(treasuryCoverage)}
            subtitle="BTC / MCap"
            status={treasuryCoverage > 1 ? 'positive' : 'warning'}
          />
          <KpiCard
            label="dUSDC Backing"
            value={formatRatio(dusdcBacking)}
            subtitle={dusdcBacking >= 1 ? 'Fully Backed' : 'Underbacked'}
            status={dusdcBacking >= 1 ? 'positive' : 'negative'}
          />
        </div>

        <div className="glow-line" />

        {/* Charts Row: Doughnut as filter on left, Heatmap on right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SupplyPieChart
            data={supplyData}
            desoPrice={marketData.desoPrice}
            totalSupply={totalSupply}
            highlightedSegment={highlightedSupplySegment}
            onSegmentClick={(name) => setHighlightedSupplySegment((prev) => (prev === name ? null : name))}
          />
          <CapitalStructureTable highlightedSegment={highlightedSupplySegment} />
        </div>

        {/* Trend Charts */}
        <TrendCharts />

        {/* DESO in Circulation – single table with 3-level drilldown */}
        <DesoInCirculationTable />

        {/* Assets by Section + Capital Structure by Section side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetsBreakdownBar
            selectedSection={tableSectionFilter}
            onSectionClick={(s) => setTableSectionFilter(s ?? (undefined as SectionFilter))}
          />
          <CapitalStructureBreakdownChart />
        </div>

        {/* Token Holdings: Category + Accounts + token columns; bar click expands/filters by section */}
        <TokenHoldingsTable
          expandedSectionOnly={tableSectionFilter === undefined ? undefined : tableSectionFilter === 'OTHERS' ? null : tableSectionFilter}
        />

        {/* Free Float: unaccounted total + anonymous wallets sorted high to low */}
        <FreeFloatSection />

        {/* Foundation Treasury + AMM Funds */}
        <TreasuryAddressTable />

        <footer className="text-center py-4">
          <p className="text-xs text-muted-foreground font-mono">
            {isLive ? 'Live prices · Refreshing every 60s' : 'Using cached data'} · Last updated{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
