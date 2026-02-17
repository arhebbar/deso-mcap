/**
 * Concentration Panel - shows wallet holdings by category with pie and bar charts.
 * Computes % supply owned by foundation, core (founder), AMMs, treasury, and cold wallets.
 * Reacts to filter toggles.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useSupply } from '@/contexts/SupplyContext';
import { formatUsd, formatPercent } from '@/lib/formatters';
import { sumDesoBalance } from '@/lib/utils';

const COLORS: Record<string, string> = {
  foundation: 'hsl(280, 65%, 60%)',
  core: 'hsl(0, 72%, 51%)',
  amm: 'hsl(38, 92%, 50%)',
  amms: 'hsl(38, 92%, 50%)',
  treasury: 'hsl(199, 89%, 48%)',
  cold: 'hsl(152, 69%, 45%)',
  'cold wallets': 'hsl(152, 69%, 45%)',
};

export default function ConcentrationPanel() {
  const { walletsByCategory, totalIssued, filters, prices } = useSupply();
  
  // Calculate totals for each category (only if filter is enabled)
  const categoryData = useMemo(() => {
    const data = [];
    
    if (filters.foundation) {
      const amount = sumDesoBalance(walletsByCategory.foundation, filters);
      const percent = totalIssued > 0 ? amount / totalIssued : 0;
      data.push({
        name: 'Foundation',
        key: 'foundation',
        amount,
        percent,
        usdValue: amount * prices.deso,
      });
    }
    
    if (filters.founder) {
      const amount = sumDesoBalance(walletsByCategory.founder, filters);
      const percent = totalIssued > 0 ? amount / totalIssued : 0;
      data.push({
        name: 'Core',
        key: 'core',
        amount,
        percent,
        usdValue: amount * prices.deso,
      });
    }
    
    if (filters.amm) {
      const amount = sumDesoBalance(walletsByCategory.amm, filters);
      const percent = totalIssued > 0 ? amount / totalIssued : 0;
      data.push({
        name: 'AMMs',
        key: 'amm',
        amount,
        percent,
        usdValue: amount * prices.deso,
      });
    }
    
    if (filters.treasury) {
      const amount = sumDesoBalance(walletsByCategory.treasury, filters);
      const percent = totalIssued > 0 ? amount / totalIssued : 0;
      data.push({
        name: 'Treasury',
        key: 'treasury',
        amount,
        percent,
        usdValue: amount * prices.deso,
      });
    }
    
    if (filters.cold) {
      const amount = sumDesoBalance(walletsByCategory.cold, filters);
      const percent = totalIssued > 0 ? amount / totalIssued : 0;
      data.push({
        name: 'Cold Wallets',
        key: 'cold',
        amount,
        percent,
        usdValue: amount * prices.deso,
      });
    }
    
    return data.sort((a, b) => b.amount - a.amount);
  }, [walletsByCategory, totalIssued, filters, prices]);
  
  // Prepare data for charts
  const pieData = useMemo(() => {
    return categoryData.map((item) => ({
      name: item.name,
      value: item.amount,
      percent: item.percent,
    }));
  }, [categoryData]);
  
  const barData = useMemo(() => {
    return [
      {
        name: 'Supply Concentration',
        ...categoryData.reduce((acc, item) => {
          acc[item.name] = item.percent * 100; // Convert to percentage for display
          return acc;
        }, {} as Record<string, number>),
      },
    ];
  }, [categoryData]);
  
  const totalTracked = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryData]);
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Wallet Concentration</h3>
      <div className="space-y-6">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <h4 className="text-sm font-medium mb-4">Distribution by Category</h4>
            <div className="flex items-center gap-6">
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((item, index) => {
                        const colorKey = item.name.toLowerCase().replace(/\s+/g, '');
                        return (
                          <Cell
                            key={item.name}
                            fill={COLORS[colorKey] || COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length]]}
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
                      formatter={(value: number, name: string, props: any) => [
                        `${formatPercent(props.payload.percent)} · ${(value / 1_000_000).toFixed(2)}M DESO`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {categoryData.map((item, index) => {
                  const color = COLORS[item.key] || COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length]];
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-xs text-foreground tabular-nums">
                        {formatPercent(item.percent)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Bar Chart */}
        {barData.length > 0 && Object.keys(barData[0]).length > 1 && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <h4 className="text-sm font-medium mb-4">Percentage of Supply</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" barSize={40}>
                  <XAxis
                    type="number"
                    tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    domain={[0, 'dataMax']}
                  />
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
                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', color: 'hsl(215, 15%, 50%)' }}
                  />
                  {categoryData.map((item, index) => {
                    const color = COLORS[item.key] || COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length]];
                    const isLast = index === categoryData.length - 1;
                    return (
                      <Bar
                        key={item.name}
                        dataKey={item.name}
                        stackId="a"
                        fill={color}
                        radius={isLast ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Total Tracked</div>
            <div className="text-2xl font-bold">{formatUsd(totalTracked * prices.deso)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPercent(totalTracked / totalIssued)} of supply
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Untracked</div>
            <div className="text-2xl font-bold">
              {formatUsd((totalIssued - totalTracked) * prices.deso)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPercent((totalIssued - totalTracked) / totalIssued)} of supply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
