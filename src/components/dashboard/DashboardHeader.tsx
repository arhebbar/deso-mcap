import { Activity, Shield, WifiOff } from 'lucide-react';

interface DashboardHeaderProps {
  isLive?: boolean;
  lastUpdated?: number | null;
}

export default function DashboardHeader({ isLive = false, lastUpdated }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">DeSo Capital Intelligence</h1>
          <p className="text-xs text-muted-foreground">Treasury & Structure Analytics</p>
        </div>
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
