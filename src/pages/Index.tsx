import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import SupplyPieChart from '@/components/dashboard/SupplyPieChart';
import CapitalStructureChart from '@/components/dashboard/CapitalStructureChart';
import TrendCharts from '@/components/dashboard/TrendCharts';
import WalletTable from '@/components/dashboard/WalletTable';
import TreasuryAddressTable from '@/components/dashboard/TreasuryAddressTable';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd, formatRatio, formatPercent } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

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
    externalAssets,
    internalEcosystem,
    intangible,
    isLive,
    isLoading,
    lastUpdated,
  } = useLiveData();

  const supplyData = [
    { name: 'Staked', value: marketData.desoStaked },
    { name: 'Free Float', value: freeFloat },
    { name: 'Foundation', value: 0 },
    { name: 'AMM', value: ammDeso },
    { name: 'Founder', value: 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <KpiCard label="DESO Market Cap" value={formatUsd(marketCap)} subtitle={`$${marketData.desoPrice.toFixed(2)}/DESO`} />
              <KpiCard label="Float-Adjusted MCap" value={formatUsd(floatAdjustedMcap)} subtitle={`${formatPercent(freeFloat / marketData.desoTotalSupply)} float`} />
              <KpiCard label="BTC Treasury" value={formatUsd(btcTreasuryValue)} subtitle={`$${marketData.btcPrice.toLocaleString()}/BTC`} />
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
            </>
          )}
        </div>

        <div className="glow-line" />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SupplyPieChart data={supplyData} />
          <CapitalStructureChart external={externalAssets} internal={internalEcosystem} intangible={intangible} />
        </div>

        {/* Trend Charts */}
        <TrendCharts />

        {/* Wallet Table (Foundation, Team, DeSo Bulls) */}
        <WalletTable />

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
