import { useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import SupplyPieChart from '@/components/dashboard/SupplyPieChart';
import TrendCharts from '@/components/dashboard/TrendCharts';
import DesoInCirculationTable from '@/components/dashboard/DesoInCirculationTable';
import AssetsBreakdownBar from '@/components/dashboard/AssetsBreakdownBar';
import type { SectionFilter } from '@/components/dashboard/AssetsBreakdownBar';
import CapitalStructureBreakdownChart from '@/components/dashboard/CapitalStructureBreakdownChart';
import TreasuryAddressTable from '@/components/dashboard/TreasuryAddressTable';
import TokenHoldingsTable from '@/components/dashboard/TokenHoldingsTable';
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
  const [circulationExpanded, setCirculationExpanded] = useState(false);

  const totalSupply = marketData.desoTotalSupply;
  const desoPrice = marketData.desoPrice;
  // Supply Distribution from DESO in Circulation: Staked, CCv1, User/Project Tokens, Currency Tokens, Unstaked DESO
  const sections = circulation.unstaked?.sections ?? [];
  const getSection = (id: string) => sections.find((s) => s.id === id);
  const ccv1Section = getSection('ccv1');
  const openfundSection = getSection('openfund');
  const focusSection = getSection('focus');
  const ccv2Section = getSection('ccv2amm');
  const desoSection = getSection('deso');
  const dusdcSection = getSection('dusdc');
  const dbtcSection = getSection('dbtc');
  const dethSection = getSection('deth');
  const dsolSection = getSection('dsol');
  const stakedDeso = circulation.isLoading ? marketData.desoStaked : circulation.staked.total;
  const ccv1Locked = ccv1Section?.amount ?? 0;
  const userProjectTokens =
    (openfundSection?.amount ?? 0) + (focusSection?.amount ?? 0) + (ccv2Section?.amount ?? 0);
  const currencyUsd =
    (dusdcSection?.usdValue ?? 0) +
    (dbtcSection?.usdValue ?? 0) +
    (dethSection?.usdValue ?? 0) +
    (dsolSection?.usdValue ?? 0);
  const currencyTokensDesoEquiv = desoPrice > 0 ? currencyUsd / desoPrice : 0;
  const unstakedDeso = desoSection?.amount ?? 0;
  const supplyData = [
    { name: 'Staked DESO', value: stakedDeso },
    { name: 'DeSo CCv1 Locked', value: ccv1Locked },
    { name: 'User/Project Tokens', value: userProjectTokens },
    { name: 'Currency Tokens', value: currencyTokensDesoEquiv },
    { name: 'Unstaked DESO', value: unstakedDeso },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="px-4 md:px-6 pt-4 pb-6 space-y-4 max-w-[1600px] mx-auto">
        {/* KPI Row - show cached/static values first, then refresh with live data */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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

        {/* Charts Row: Supply Distribution | Assets by User Group | Capital Charts (1/3 each) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SupplyPieChart
            data={supplyData}
            desoPrice={desoPrice}
            totalSupply={totalSupply}
            highlightedSegment={highlightedSupplySegment}
            onSegmentClick={(name) => setHighlightedSupplySegment((prev) => (prev === name ? null : name))}
          />
          <AssetsBreakdownBar
            selectedSection={tableSectionFilter}
            onSectionClick={(s) => setTableSectionFilter(s ?? (undefined as SectionFilter))}
          />
          <CapitalStructureBreakdownChart />
        </div>

        {/* Token Holdings: bar click expands/filters by section */}
        <TokenHoldingsTable
          expandedSectionOnly={tableSectionFilter === undefined ? undefined : tableSectionFilter === 'OTHERS' ? null : tableSectionFilter}
        />

        {/* Historical Trends */}
        <TrendCharts />

        {/* DESO in Circulation – minimized by default; expand to drill down */}
        <div className="border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setCirculationExpanded((e) => !e)}
          >
            <h3 className="section-title mb-0">DESO in Circulation</h3>
            <span className="text-sm text-muted-foreground">
              {circulationExpanded ? 'Collapse' : 'Expand'} table
            </span>
          </button>
          {circulationExpanded && (
            <div className="border-t">
              <DesoInCirculationTable />
            </div>
          )}
        </div>

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
