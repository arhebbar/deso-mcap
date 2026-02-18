import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatUsd } from '@/lib/formatters';

const COLORS = [
  'hsl(199, 89%, 48%)',  // Staked
  'hsl(280, 65%, 60%)',  // Foundation
  'hsl(38, 92%, 50%)',   // AMM
  'hsl(0, 72%, 51%)',    // Core Team
  'hsl(262, 52%, 47%)',  // DeSo Bulls
  'hsl(152, 69%, 45%)',  // Others (float)
];

export interface SupplySlice {
  name: string;
  value: number;  // DESO amount
}

interface SupplyPieChartProps {
  /** DESO amounts by category (Staked, Foundation, AMM, etc.) */
  data: SupplySlice[];
  /** DESO price for USD display */
  desoPrice: number;
  /** Total supply so we can show % of supply (and % of float if needed) */
  totalSupply: number;
  /** When set, used as filter: highlights this segment and syncs with heatmap */
  highlightedSegment?: string | null;
  /** Called when a segment is clicked (use as filter) */
  onSegmentClick?: (name: string) => void;
}

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export default function SupplyPieChart({ data, desoPrice, totalSupply, highlightedSegment = null, onSegmentClick }: SupplyPieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const dataWithPct = data
    .map((d) => ({
      ...d,
      pctSupply: totalSupply > 0 ? (d.value / totalSupply) * 100 : 0,
      pctFloat: total > 0 ? (d.value / total) * 100 : 0,
      usd: d.value * desoPrice,
    }))
    .filter((d) => d.value > 0);

  if (dataWithPct.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Supply Distribution</h3>
        <p className="text-sm text-muted-foreground">No supply data yet. Waiting for wallet and staked data.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title">Supply Distribution</h3>
      <p className="text-xs text-muted-foreground mb-2">Click a segment to filter the heatmap. % of supply and USD.</p>
      <div className="flex items-center gap-6">
        <div className="h-64 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPct}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                onClick={onSegmentClick ? (entry: { name: string }) => onSegmentClick(entry.name) : undefined}
                style={{ cursor: onSegmentClick ? 'pointer' : undefined }}
              >
                {dataWithPct.map((_, i) => {
                  const isHighlighted = highlightedSegment != null && dataWithPct[i].name === highlightedSegment;
                  return (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke={isHighlighted ? 'hsl(var(--primary))' : 'none'}
                      strokeWidth={isHighlighted ? 3 : 0}
                    />
                  );
                })}
              </Pie>
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
                formatter={(value: number, name: string, props: { payload?: { pctSupply?: number } }) => {
                  const pct = props.payload?.pctSupply ?? 0;
                  const usd = value * desoPrice;
                  return [`${fmtDeso(value)} DESO · ${pct.toFixed(1)}% · ${formatUsd(usd)}`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3">
          {dataWithPct.map((item, i) => {
            const pct = totalSupply > 0 ? (item.value / totalSupply) * 100 : 0;
            const usd = item.value * desoPrice;
            const isHighlighted = highlightedSegment != null && item.name === highlightedSegment;
            const Wrapper = onSegmentClick ? 'button' : 'div';
            return (
              <Wrapper
                key={item.name}
                type={onSegmentClick ? 'button' : undefined}
                onClick={onSegmentClick ? () => onSegmentClick(item.name) : undefined}
                className={`flex items-center gap-2 text-left rounded px-1 -mx-1 ${onSegmentClick ? 'cursor-pointer hover:bg-muted/50' : ''} ${isHighlighted ? 'ring-1 ring-primary' : ''}`}
              >
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <span className="text-xs text-foreground tabular-nums">{pct.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatUsd(usd)}</span>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}
