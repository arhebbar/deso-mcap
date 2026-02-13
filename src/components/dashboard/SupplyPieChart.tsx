import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(199, 89%, 48%)',  // Staked
  'hsl(152, 69%, 45%)',  // Free Float
  'hsl(280, 65%, 60%)',  // Foundation
  'hsl(38, 92%, 50%)',   // AMM
  'hsl(0, 72%, 51%)',    // Founder
];

interface SupplyPieChartProps {
  data: { name: string; value: number }[];
}

export default function SupplyPieChart({ data }: SupplyPieChartProps) {
  return (
    <div className="chart-container">
      <h3 className="section-title">Supply Distribution</h3>
      <div className="flex items-center gap-6">
        <div className="h-64 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
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
                formatter={(value: number, name: string) => [`${(value / 1_000_000).toFixed(2)}M DESO`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <span className="text-xs text-foreground tabular-nums">{(item.value / 1_000_000).toFixed(2)}M</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
