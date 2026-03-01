import { Link, useLocation } from 'react-router-dom';
import { Activity, Shield, WifiOff, BarChart3, LayoutDashboard, ArrowLeft } from 'lucide-react';

interface DashboardHeaderProps {
  isLive?: boolean;
  lastUpdated?: number | null;
}

export default function DashboardHeader({ isLive = false, lastUpdated }: DashboardHeaderProps) {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DESO Analytics</h1>
            <p className="text-xs text-muted-foreground">Treasury & Structure Analytics</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {isAnalytics && (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          )}
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isAnalytics ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            to="/analytics"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isAnalytics ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
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
        <span className="font-mono text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </header>
  );
}
