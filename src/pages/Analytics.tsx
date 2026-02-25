/**
 * Analytics – Generic DeSo analytics page.
 * Focuses on network & activity metrics (BeyondSocial-style), while the main
 * dashboard (Index) stays focused on market cap, circulation & coverage.
 */

import { Link } from 'react-router-dom';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import NetworkActivitySection from '@/components/dashboard/NetworkActivitySection';
import { useLiveData } from '@/hooks/useLiveData';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  const {
    isLive,
    lastUpdated,
  } = useLiveData();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="p-6 space-y-8 max-w-[1600px] mx-auto">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Generic DeSo network & activity analytics
            </p>
          </div>
          <Link
            to="/"
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>

        {/* 0. Network & activity (Beyond Social–style) */}
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
