/**
 * Analytics – Generic DeSo analytics page.
 * Focuses on network & activity metrics (BeyondSocial-style), while the main
 * dashboard (Index) stays focused on market cap, circulation & coverage.
 */

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import NetworkActivitySection from '@/components/dashboard/NetworkActivitySection';
import { useLiveData } from '@/hooks/useLiveData';

const Analytics = () => {
  const {
    isLive,
    lastUpdated,
  } = useLiveData();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="px-4 md:px-6 pt-2 md:pt-3 pb-6 space-y-3 max-w-[1600px] mx-auto">
        <NetworkActivitySection />

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

export default Analytics;
