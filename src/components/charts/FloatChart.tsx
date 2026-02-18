/**
 * Float Chart - reusable component using TimeSeriesChart
 */

import { useMemo } from 'react';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import TimeSeriesChart, { TimeSeriesLine } from './TimeSeriesChart';
import { MARKET_DATA } from '@/data/desoData';

export default function FloatChart() {
  const { data, isLoading } = useHistoricalData(30);
  
  const chartData = useMemo(() => {
    return data.map((d) => {
      const approximateFloat = d.desoPrice > 0 ? (d.marketCap / d.desoPrice) - MARKET_DATA.desoStaked : 0;
      return {
        date: d.date,
        float: Math.max(0, approximateFloat),
      };
    });
  }, [data]);
  
  const lines: TimeSeriesLine[] = useMemo(() => [
    {
      dataKey: 'float',
      name: 'Free Float',
      color: 'hsl(var(--chart-2))', // Uses theme-aware chart color
      strokeWidth: 2,
      dot: false,
      type: 'monotone',
    },
  ], []);
  
  return (
    <TimeSeriesChart
      title="Free Float Over Time"
      data={chartData}
      lines={lines}
      height={300}
      isLoading={isLoading}
      yAxisFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
      tooltipFormatter={(value) => [`${(value / 1_000_000).toFixed(2)}M DESO`, 'Free Float']}
      showLegend={false}
      showGrid={true}
    />
  );
}
