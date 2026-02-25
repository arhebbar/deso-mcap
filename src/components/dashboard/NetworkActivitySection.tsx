/**
 * Network & activity analytics – Beyond Social–style layout:
 * Current Status, Last 30 days, 30 Day Trend chart, All Time, Content.
 * Uses placeholder/mock data; can be wired to DeSo network APIs (block height, tx counts, etc.) when available.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Users,
  Link2,
  Hourglass,
  Flame,
  Activity,
  Wallet,
  UserPlus,
  MessageCircle,
  FileText,
  Heart,
  Image,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { useNetworkStats } from '@/hooks/useNetworkStats';
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats';

/** Generate mock 30-day trend data (Active Wallets, Transactions, New Wallets) */
function useMock30DayTrend() {
  const days = 30;
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    data.push({
      date: dateStr,
      activeWallets: 200 + Math.round(250 * Math.sin(i / 5) + 50 * Math.random()),
      transactions: 20000 + Math.round(25000 * Math.sin(i / 4) + 5000 * Math.random()),
      newWallets: 50 + Math.round(80 * Math.sin(i / 6) + 30 * Math.random()),
    });
  }
  return data;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 ${colorClass}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function NetworkActivitySection() {
  const { blockHeight, nodeSynced, nodeReachable, mempoolOrNextBlockTxnCount, isLoading: statsLoading } = useNetworkStats();
  const { totalUsers, isLoading: analyticsLoading } = useAnalyticsStats();
  const trendData = useMock30DayTrend();

  return (
    <section className="space-y-8">
      <h3 className="section-title">Network & activity</h3>
      <p className="text-sm text-muted-foreground -mt-4">
        DeSo network metrics. Block height, mempool (next-block txns), and total users are live when the node and GraphQL provide them; other stats show placeholders where public APIs do not expose aggregates.
      </p>

      {/* Current Status */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">Current status</h4>
          <span className="text-xs font-mono text-muted-foreground">
            {statsLoading ? 'Node: Checking…' : nodeReachable ? (nodeSynced ? 'Node: Synced' : 'Node: Not synced') : 'Node: Unreachable'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Online users"
            value="—"
            icon={Users}
            colorClass="border-emerald-500/30 bg-emerald-500/5"
          />
          <StatCard
            label="Blockheight"
            value={
              statsLoading
                ? '…'
                : blockHeight != null
                  ? blockHeight.toLocaleString()
                  : '—'
            }
            icon={Link2}
            colorClass="border-blue-500/30 bg-blue-500/5"
          />
          <StatCard
            label="Mempool"
            value={
              statsLoading
                ? '…'
                : mempoolOrNextBlockTxnCount != null
                  ? String(mempoolOrNextBlockTxnCount)
                  : '0'
            }
            icon={Hourglass}
            colorClass="border-amber-500/30 bg-amber-500/5"
          />
          <StatCard
            label="Gas fee"
            value={'>$.01'}
            icon={Flame}
            colorClass="border-rose-500/30 bg-rose-500/5"
          />
        </div>
      </div>

      {/* Last 30 days */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Last 30 days</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Socially active"
            value="—"
            icon={Activity}
            colorClass="border-emerald-500/30 bg-emerald-500/5"
          />
          <StatCard
            label="Transactions"
            value="—"
            icon={Zap}
            colorClass="border-blue-500/30 bg-blue-500/5"
          />
          <StatCard
            label="New wallets"
            value="—"
            icon={UserPlus}
            colorClass="border-cyan-500/30 bg-cyan-500/5"
          />
          <StatCard
            label="Active wallets"
            value="—"
            icon={Wallet}
            colorClass="border-amber-500/30 bg-amber-500/5"
          />
        </div>
      </div>

      {/* 30 Day Trend */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">30 day trend</h4>
          <span className="text-xs text-muted-foreground">Sample trend (wire API for real data)</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.toLocaleString()}
                  label={{ value: 'Users', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  label={{ value: 'Transaction count', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    name === 'transactions' ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString(),
                    name === 'activeWallets' ? 'Active wallets' : name === 'newWallets' ? 'New wallets' : 'Transactions',
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === 'activeWallets'
                      ? 'Active wallets'
                      : value === 'newWallets'
                        ? 'New wallets'
                        : 'Transactions'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="activeWallets"
                  yAxisId="left"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2}
                  dot={false}
                  name="activeWallets"
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  yAxisId="right"
                  stroke="hsl(199, 89%, 48%)"
                  strokeWidth={2}
                  dot={false}
                  name="transactions"
                />
                <Line
                  type="monotone"
                  dataKey="newWallets"
                  yAxisId="left"
                  stroke="hsl(173, 80%, 40%)"
                  strokeWidth={2}
                  dot={false}
                  name="newWallets"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* All Time */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">All time</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Transactions" value="—" icon={Zap} colorClass="" />
          <StatCard
            label="Users"
            value={
              analyticsLoading ? '…' : totalUsers != null ? totalUsers.toLocaleString() : '—'
            }
            icon={Users}
            colorClass=""
          />
          <StatCard label="Coin txns" value="—" icon={TrendingUp} colorClass="" />
          <StatCard label="Interactions" value="—" icon={Heart} colorClass="" />
          <StatCard label="NFT txns" value="—" icon={Image} colorClass="" />
          <StatCard label="DEX txns" value="—" icon={TrendingUp} colorClass="" />
        </div>
      </div>

      {/* Content */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Content</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Posts" value="—" icon={MessageCircle} colorClass="" />
          <StatCard label="Blogs" value="—" icon={FileText} colorClass="" />
          <StatCard label="Comments" value="—" icon={MessageCircle} colorClass="" />
        </div>
      </div>
    </section>
  );
}
