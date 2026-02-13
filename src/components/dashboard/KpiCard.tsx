import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  status?: 'positive' | 'negative' | 'warning' | 'neutral';
}

export default function KpiCard({ label, value, change, subtitle, status = 'neutral' }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className={`kpi-value mt-2 ${status === 'positive' ? 'status-positive' : status === 'negative' ? 'status-negative' : status === 'warning' ? 'status-warning' : 'text-foreground'}`}>
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-mono ${change > 0 ? 'status-positive' : change < 0 ? 'status-negative' : 'text-muted-foreground'}`}>
            {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}
