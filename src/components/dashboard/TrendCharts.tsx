import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useState, useMemo } from 'react';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import { useBtcPriceHistory } from '@/hooks/useBtcPriceHistory';
import { useTreasuryData } from '@/hooks/useTreasuryData';
import { EXTERNAL_TREASURY } from '@/data/desoData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 365 * 5 },
];

const METRICS = [
  { key: 'marketCap', label: 'Market Cap', color: 'hsl(199, 89%, 48%)' },
  { key: 'btcTreasury', label: 'BTC Treasury', color: 'hsl(38, 92%, 50%)' },
  { key: 'ammLiquidity', label: 'AMM Liquidity', color: 'hsl(152, 69%, 45%)' },
];

export default function TrendCharts() {
  const [range, setRange] = useState(30);
  const [activeMetric, setActiveMetric] = useState('marketCap');
  const { data, isLoading, isLive } = useHistoricalData(range);
  const { data: btcPriceData } = useBtcPriceHistory(range);
  const { btcAmount } = useTreasuryData();

  // Merge accurate BTC prices and recalculate BTC Treasury (using historical holdings per date)
  const chartData = useMemo(() => {
    if (!data.length) return data;
    const btcByDate = new Map(btcPriceData.map((p) => [p.date, p.price]));
    const fallbackHoldings = btcAmount > 0 ? btcAmount : EXTERNAL_TREASURY.btcHoldings;
    return data.map((d) => {
      const btcPrice = btcByDate.get(d.date) ?? d.btcPrice;
      const holdings = d.btcHoldings ?? fallbackHoldings;
      return {
        ...d,
        btcPrice,
        btcTreasury: btcPrice > 0 ? holdings * btcPrice : d.btcTreasury,
      };
    });
  }, [data, btcPriceData, btcAmount]);

  return (
    <div className="chart-container">
      <Alert className="mb-4 border-muted-foreground/30 bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription>
          Snapshot — Historical data is point-in-time and is not live.
        </AlertDescription>
      </Alert>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="section-title mb-0">Historical Trends</h3>
          {isLive && (
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Live data
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                range === r.days
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeMetric === m.key
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="h-2 w-2 rounded-full" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-72 relative">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(222, 25%, 14%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                domain={[0, 'dataMax']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 10 }}
                tickFormatter={(v) =>
                  activeMetric === 'btcTreasury'
                    ? `$${(v / 1_000).toFixed(0)}K`
                    : `$${v.toFixed(2)}`
                }
                domain={[0, 'dataMax']}
              />
              <Tooltip
                wrapperStyle={{ zIndex: 9999 }}
                contentStyle={{
                  background: 'hsl(222, 41%, 12%)',
                  border: '1px solid hsl(222, 25%, 22%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(210, 20%, 95%)',
                }}
                labelStyle={{ color: 'hsl(210, 15%, 75%)' }}
                itemStyle={{ color: 'hsl(210, 20%, 95%)' }}
                formatter={(value: number, _name: string, entry: { dataKey?: string }) => {
                  const dataKey = entry?.dataKey ?? '';
                  const label =
                    dataKey === 'btcPrice' ? 'BTC Price' : dataKey === 'desoPrice' ? 'DESO Price' : METRICS.find((m) => m.key === dataKey)?.label ?? dataKey;
                  const formatted =
                    dataKey === 'btcPrice'
                      ? `$${(value / 1_000).toFixed(0)}K`
                      : dataKey === 'desoPrice'
                        ? `$${value.toFixed(2)}`
                        : `$${(value / 1_000_000).toFixed(2)}M`;
                  return [formatted, label];
                }}
              />
              <Line
                type="monotone"
                dataKey={activeMetric}
                yAxisId="left"
                stroke={METRICS.find((m) => m.key === activeMetric)?.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={activeMetric === 'btcTreasury' ? 'btcPrice' : 'desoPrice'}
                yAxisId="right"
                stroke="hsl(210, 20%, 60%)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name={activeMetric === 'btcTreasury' ? 'BTC Price' : 'DESO Price'}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
