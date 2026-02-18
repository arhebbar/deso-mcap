/**
 * Backing Ratio Chart - reusable component using TimeSeriesChart
 */

import { useMemo } from 'react';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import TimeSeriesChart, { TimeSeriesLine } from './TimeSeriesChart';
import { formatRatio } from '@/lib/formatters';

export default function BackingRatioChart() {
  const { data, isLoading } = useHistoricalData(30);
  
  const chartData = useMemo(() => {
    return data.map((d) => {
      const ratio = d.marketCap > 0 ? d.btcTreasury / d.marketCap : 0;
      return {
        date: d.date,
        backingRatio: ratio,
        reference: 1.0, // Reference line at 1.0 (fully backed)
      };
    });
  }, [data]);
  
  const lines: TimeSeriesLine[] = useMemo(() => [
    {
      dataKey: 'backingRatio',
      name: 'Backing Ratio',
      color: 'hsl(var(--chart-3))', // Uses theme-aware chart color
      strokeWidth: 2,
      dot: false,
      type: 'monotone',
    },
    {
      dataKey: 'reference',
      name: 'Fully Backed (1.0x)',
      color: 'hsl(142, 76%, 36%)',
      strokeWidth: 1,
      dot: false,
      type: 'monotone',
    },
  ], []);
  
  return (
    <TimeSeriesChart
      title="Backing Ratio Over Time"
      data={chartData}
      lines={lines}
      height={300}
      isLoading={isLoading}
      yAxisFormatter={(v) => formatRatio(v)}
      tooltipFormatter={(value) => [formatRatio(value), 'Backing Ratio']}
      showLegend={true}
      showGrid={true}
    />
  );
}
