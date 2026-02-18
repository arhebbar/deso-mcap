/**
 * Analytics Dashboard - Composable analytics dashboard using SupplyContext.
 */

import { SupplyProvider } from '@/contexts/SupplyContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MarketOverview from '@/components/panels/MarketOverview';
import FreeFloatPanel from '@/components/panels/FreeFloatPanel';
import BackingPanel from '@/components/panels/BackingPanel';
import ConcentrationPanel from '@/components/panels/ConcentrationPanel';
import WalletFilters from '@/components/panels/WalletFilters';
import MarketCapChart from '@/components/charts/MarketCapChart';
import FloatChart from '@/components/charts/FloatChart';
import BackingRatioChart from '@/components/charts/BackingRatioChart';
import { useSupply } from '@/contexts/SupplyContext';

function AnalyticsContent() {
  const { isLive, isLoading } = useSupply();
  const lastUpdated = new Date().toISOString();
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Wallet Category Filters */}
        <WalletFilters />
        
        {/* Market Overview */}
        <MarketOverview />
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MarketCapChart />
          <FloatChart />
          <BackingRatioChart />
        </div>
        
        {/* Panels Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FreeFloatPanel />
          <BackingPanel />
        </div>
        
        {/* Concentration Panel */}
        <ConcentrationPanel />
        
        <footer className="text-center py-4">
          <p className="text-xs text-muted-foreground font-mono">
            {isLive ? 'Live data · Refreshing every 60s' : 'Using cached data'} · Last updated{' '}
            {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function Analytics() {
  return (
    <SupplyProvider>
      <AnalyticsContent />
    </SupplyProvider>
  );
}
