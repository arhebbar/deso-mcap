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
    <div className="min-h-screen">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="relative z-10 px-4 md:px-6 pt-6 pb-10 space-y-6 max-w-[1600px] mx-auto">
        <NetworkActivitySection />

        <footer className="text-center pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground font-mono tracking-wide">
            {isLive ? 'Live prices · Refreshing every 60s' : 'Using cached data'} · Last updated{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Analytics;
