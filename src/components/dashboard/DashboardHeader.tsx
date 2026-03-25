import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Shield, WifiOff, BarChart3, LayoutDashboard, ArrowLeft, Server, CircleDollarSign } from 'lucide-react';
import { getGraphqlProvider, setGraphqlProvider, type GraphqlProvider } from '@/api/graphqlEndpoint';
import { clearGraphqlCaches } from '@/api/analyticsStatsApi';

interface DashboardHeaderProps {
  isLive?: boolean;
  lastUpdated?: number | null;
}

export default function DashboardHeader({ isLive = false, lastUpdated }: DashboardHeaderProps) {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';
  const isRevenue = location.pathname === '/revenue';
  const [provider, setProviderState] = useState<GraphqlProvider>(() => getGraphqlProvider());
  const queryClient = useQueryClient();

  useEffect(() => {
    const onSwitch = () => setProviderState(getGraphqlProvider());
    window.addEventListener('graphql-provider-changed', onSwitch);
    return () => window.removeEventListener('graphql-provider-changed', onSwitch);
  }, []);

  const handleSwitchGraphql = () => {
    const next: GraphqlProvider = provider === 'deso' ? 'safetynet' : 'deso';
    setGraphqlProvider(next);
    setProviderState(next);
    clearGraphqlCaches();
    queryClient.invalidateQueries();
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-primary/12 text-primary shadow-glow-sm ring-1 ring-primary/25'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  return (
    <div className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3.5 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/"
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 ring-1 ring-primary/20 shadow-glow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Shield className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              DESO Analytics
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">Treasury &amp; structure intelligence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleSwitchGraphql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border border-border/50 transition-colors"
            title={provider === 'deso' ? 'Switch to SafetyNet GraphQL (may be faster)' : 'Switch to DeSo Foundation GraphQL'}
          >
            <Server className="h-3.5 w-3.5 opacity-80" />
            <span className="font-mono">{provider === 'deso' ? 'DeSo' : 'SafetyNet'}</span>
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground">
            {isLive ? (
              <>
                <Activity className="h-3 w-3 animate-pulse-glow text-success shrink-0" />
                <span className="font-mono text-foreground/90">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-warning shrink-0" />
                <span className="font-mono">Cached</span>
              </>
            )}
          </div>
          {(isAnalytics || isRevenue) && (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          )}
          <span className="font-mono text-xs text-muted-foreground tabular-nums hidden sm:inline">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>
      <nav className="border-t border-border/30 bg-muted/15 px-4 md:px-6 pb-2 pt-1">
        <div className="flex flex-wrap gap-1.5 max-w-[1600px] mx-auto">
          <Link to="/" className={tabClass(location.pathname === '/')}>
            <LayoutDashboard className="h-4 w-4 opacity-90" />
            Capital &amp; Treasury
          </Link>
          <Link to="/analytics" className={tabClass(isAnalytics && !isRevenue)}>
            <BarChart3 className="h-4 w-4 opacity-90" />
            Protocol Activity
          </Link>
          <Link to="/orders" className={tabClass(location.pathname === '/orders')}>
            Orders
          </Link>
          <Link to="/revenue" className={tabClass(isRevenue)}>
            <CircleDollarSign className="h-4 w-4 opacity-90" />
            Revenue
          </Link>
        </div>
      </nav>
    </div>
  );
}
