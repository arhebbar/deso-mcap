/**
 * Market Cap Chart - reusable component using TimeSeriesChart
 */

import { useMemo } from 'react';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import TimeSeriesChart, { TimeSeriesLine } from './TimeSeriesChart';
import { formatUsd } from '@/lib/formatters';

export default function MarketCapChart() {
  const { data, isLoading } = useHistoricalData(30);
  
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date,
      marketCap: d.marketCap,
    }));
  }, [data]);
  
  const lines: TimeSeriesLine[] = useMemo(() => [
    {
      dataKey: 'marketCap',
      name: 'Market Cap',
      color: 'hsl(var(--chart-1))', // Uses theme-aware chart color
      strokeWidth: 2,
      dot: false,
      type: 'monotone',
    },
  ], []);
  
  return (
    <TimeSeriesChart
      title="Market Cap Over Time"
      data={chartData}
      lines={lines}
      height={300}
      isLoading={isLoading}
      yAxisFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
      tooltipFormatter={(value) => [formatUsd(value), 'Market Cap']}
      showLegend={false}
      showGrid={true}
    />
  );
}
