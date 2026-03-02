import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Shield, WifiOff, BarChart3, LayoutDashboard, ArrowLeft, Server } from 'lucide-react';
import { getGraphqlProvider, setGraphqlProvider, type GraphqlProvider } from '@/api/graphqlEndpoint';
import { clearGraphqlCaches } from '@/api/analyticsStatsApi';

interface DashboardHeaderProps {
  isLive?: boolean;
  lastUpdated?: number | null;
}

export default function DashboardHeader({ isLive = false, lastUpdated }: DashboardHeaderProps) {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';
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

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DESO Analytics</h1>
            <p className="text-xs text-muted-foreground">Treasury & Structure Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSwitchGraphql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={provider === 'deso' ? 'Switch to SafetyNet GraphQL (may be faster)' : 'Switch to DeSo Foundation GraphQL'}
          >
            <Server className="h-3.5 w-3.5" />
            <span className="font-mono">{provider === 'deso' ? 'DeSo' : 'SafetyNet'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isLive ? (
              <>
                <Activity className="h-3 w-3 animate-pulse-glow text-success" />
                <span className="font-mono">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-warning" />
                <span className="font-mono">Cached</span>
              </>
            )}
          </div>
          {isAnalytics && (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>
      {/* Tab bar – BI style, just below header */}
      <nav className="border-b border-border bg-muted/30 px-4 md:px-6">
        <div className="flex gap-1 max-w-[1600px] mx-auto">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-4 py-3 rounded-t-md text-sm font-medium transition-colors border-b-2 -mb-px ${
              !isAnalytics
                ? 'bg-background text-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Capital & Treasury
          </Link>
          <Link
            to="/analytics"
            className={`flex items-center gap-1.5 px-4 py-3 rounded-t-md text-sm font-medium transition-colors border-b-2 -mb-px ${
              isAnalytics
                ? 'bg-background text-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Protocol Activity
          </Link>
        </div>
      </nav>
    </>
  );
}
