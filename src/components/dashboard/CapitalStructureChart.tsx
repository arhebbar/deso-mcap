import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CapitalStructureChartProps {
  external: number;
  internal: number;
  intangible: number;
}

export default function CapitalStructureChart({ external, internal, intangible }: CapitalStructureChartProps) {
  const data = [
    {
      name: 'Capital Structure',
      External: external / 1_000_000,
      Internal: internal / 1_000_000,
      Intangible: intangible / 1_000_000,
    },
  ];

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital Structure Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barSize={40}>
            <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }} tickFormatter={(v) => `$${v}M`} />
            <YAxis type="category" dataKey="name" hide />
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
              formatter={(value: number, name: string) => [`$${value.toFixed(1)}M`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'hsl(215, 15%, 50%)' }}
            />
            <Bar dataKey="External" stackId="a" fill="hsl(152, 69%, 45%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Internal" stackId="a" fill="hsl(199, 89%, 48%)" />
            <Bar dataKey="Intangible" stackId="a" fill="hsl(280, 65%, 60%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { label: 'External Hard Assets', value: external, color: 'hsl(152, 69%, 45%)' },
          { label: 'Internal Ecosystem', value: internal, color: 'hsl(199, 89%, 48%)' },
          { label: 'Intangible Premium', value: intangible, color: 'hsl(280, 65%, 60%)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm tabular-nums">${(item.value / 1_000_000).toFixed(1)}M</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
