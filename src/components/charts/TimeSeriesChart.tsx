/**
 * Reusable Time Series Chart Component
 * Supports light/dark mode via CSS variables and accepts time-series data props
 */

import { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export interface TimeSeriesDataPoint {
  date: string | number | Date;
  [key: string]: string | number | Date;
}

export interface TimeSeriesLine {
  dataKey: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  dot?: boolean;
  type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
}

export interface TimeSeriesChartProps {
  /** Chart title */
  title: string;
  /** Time-series data array */
  data: TimeSeriesDataPoint[];
  /** Array of lines to render */
  lines: TimeSeriesLine[];
  /** Height of the chart */
  height?: number;
  /** Loading state */
  isLoading?: boolean;
  /** X-axis label formatter */
  xAxisFormatter?: (value: string | number | Date) => string;
  /** Y-axis label formatter */
  yAxisFormatter?: (value: number) => string;
  /** Tooltip formatter */
  tooltipFormatter?: (value: number, name: string) => [string, string];
  /** Tooltip label formatter */
  tooltipLabelFormatter?: (label: string | number | Date) => string;
  /** Show legend */
  showLegend?: boolean;
  /** Show grid */
  showGrid?: boolean;
  /** Y-axis domain */
  yAxisDomain?: [number | string, number | string];
}

const getThemeColors = (isDark: boolean) => {
  return {
    grid: isDark ? 'hsl(222, 25%, 14%)' : 'hsl(210, 20%, 90%)',
    tick: isDark ? 'hsl(215, 15%, 50%)' : 'hsl(215, 15%, 30%)',
    tooltipBg: isDark ? 'hsl(222, 47%, 11%)' : 'hsl(0, 0%, 100%)',
    tooltipBorder: isDark ? 'hsl(222, 25%, 14%)' : 'hsl(210, 20%, 85%)',
    tooltipText: isDark ? 'hsl(210, 20%, 95%)' : 'hsl(222, 47%, 11%)',
    legend: isDark ? 'hsl(215, 15%, 50%)' : 'hsl(215, 15%, 30%)',
  };
};

export default function TimeSeriesChart({
  title,
  data,
  lines,
  height = 300,
  isLoading = false,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
  tooltipLabelFormatter,
  showLegend = false,
  showGrid = true,
  yAxisDomain,
}: TimeSeriesChartProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default to dark
  });
  
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    };
    
    // Check on mount
    checkTheme();
    
    // Watch for class changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkTheme();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  
  // Default formatters
  const defaultXAxisFormatter = (value: string | number | Date) => {
    const d = new Date(value);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  
  const defaultTooltipLabelFormatter = (label: string | number | Date) => {
    return new Date(label).toLocaleDateString();
  };
  
  if (isLoading && data.length === 0) {
    return <Skeleton className="h-72 w-full rounded" />;
  }
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && (
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          )}
          <XAxis
            dataKey="date"
            tick={{ fill: colors.tick, fontSize: 10 }}
            tickFormatter={xAxisFormatter || defaultXAxisFormatter}
          />
          <YAxis
            tick={{ fill: colors.tick, fontSize: 10 }}
            tickFormatter={yAxisFormatter}
            domain={yAxisDomain}
          />
          <Tooltip
            wrapperStyle={{ zIndex: 9999 }}
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: '8px',
              fontSize: '12px',
              color: colors.tooltipText,
            }}
            labelStyle={{ color: colors.tooltipText }}
            itemStyle={{ color: colors.tooltipText }}
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter || defaultTooltipLabelFormatter}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', color: colors.legend }}
            />
          )}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || `hsl(var(--chart-${(index % 6) + 1}))`}
              strokeWidth={line.strokeWidth || 2}
              dot={line.dot !== undefined ? line.dot : false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
