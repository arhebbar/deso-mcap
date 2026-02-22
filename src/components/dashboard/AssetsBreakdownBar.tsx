/**
 * Bar chart of all assets by Foundation, AMM, Core Team, DeSo Bulls, Others.
 * Clicking a segment expands only that section in the table below.
 */

import { useWalletData } from '@/hooks/useWalletData';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd } from '@/lib/formatters';

export type SectionFilter = 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'OTHERS' | null;

const SEGMENTS: { key: SectionFilter; label: string; color: string }[] = [
  { key: 'FOUNDATION', label: 'Foundation', color: 'hsl(280, 65%, 60%)' },
  { key: 'AMM', label: 'AMM', color: 'hsl(38, 92%, 50%)' },
  { key: 'FOUNDER', label: 'Core Team', color: 'hsl(0, 72%, 51%)' },
  { key: 'DESO_BULL', label: 'DeSo Bulls', color: 'hsl(262, 52%, 47%)' },
  { key: 'OTHERS', label: 'Free Float', color: 'hsl(152, 69%, 45%)' },
];

interface AssetsBreakdownBarProps {
  selectedSection: SectionFilter;
  onSectionClick: (section: SectionFilter) => void;
}

export default function AssetsBreakdownBar({ selectedSection, onSectionClick }: AssetsBreakdownBarProps) {
  const { marketData } = useLiveData();
  const { ammDeso, foundationDeso, founderDeso, desoBullsDeso } = useWalletData();

  const foundationUsd = foundationDeso * marketData.desoPrice;
  const ammUsd = ammDeso * marketData.desoPrice;
  const founderUsd = founderDeso * marketData.desoPrice;
  const desoBullsUsd = desoBullsDeso * marketData.desoPrice;
  const totalTracked = foundationUsd + ammUsd + founderUsd + desoBullsUsd;
  const freeFloatUsd = Math.max(0, (marketData.desoTotalSupply - marketData.desoStaked - foundationDeso - ammDeso - founderDeso - desoBullsDeso) * marketData.desoPrice);
  const othersUsd = freeFloatUsd;

  const values: Record<string, number> = {
    FOUNDATION: foundationUsd,
    AMM: ammUsd,
    FOUNDER: founderUsd,
    DESO_BULL: desoBullsUsd,
    OTHERS: othersUsd,
  };
  const totalUsd = Object.values(values).reduce((s, v) => s + v, 0);
  const maxUsd = Math.max(...Object.values(values), 1);

  if (totalUsd <= 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Assets by Section</h3>
        <p className="text-sm text-muted-foreground">No data yet.</p>
      </div>
    );
  }

  const barHeightPx = 200;

  return (
    <div className="chart-container">
      <h3 className="section-title">Assets by Section</h3>
      <p className="text-xs text-muted-foreground mb-2">Click a column to expand only that section in the table below.</p>
      <div className="flex items-end justify-around gap-2 w-full" style={{ height: barHeightPx + 32 }}>
        {SEGMENTS.map((seg) => {
          const usd = values[seg.key ?? ''] ?? 0;
          const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
          const heightPct = maxUsd > 0 ? Math.min(100, (usd / maxUsd) * 100) : 0;
          const isSelected = selectedSection === seg.key;
          return (
            <button
              key={seg.key ?? 'OTHERS'}
              type="button"
              className={`flex flex-col items-center flex-1 min-w-0 max-w-[80px] transition-all focus:outline-none focus:ring-2 focus:ring-ring ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
              title={`${seg.label}: ${formatUsd(usd)} (${pct.toFixed(1)}%)`}
              onClick={() => onSectionClick(selectedSection === seg.key ? null : (seg.key ?? null))}
            >
              <div className="w-full flex flex-col justify-end rounded-t" style={{ height: barHeightPx }}>
                <span
                  className="w-full rounded-t"
                  style={{
                    height: usd > 0 ? `${Math.max(heightPct, 3)}%` : '0',
                    minHeight: usd > 0 ? 6 : 0,
                    backgroundColor: seg.color,
                  }}
                />
              </div>
              <span className="text-[10px] font-medium mt-1 truncate w-full text-center">{seg.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {SEGMENTS.map((seg) => {
          const usd = values[seg.key ?? ''] ?? 0;
          const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
          const isSelected = selectedSection === seg.key;
          return (
            <button
              key={seg.key ?? 'OTHERS'}
              type="button"
              className={`flex items-center gap-1.5 hover:underline ${isSelected ? 'ring-1 ring-primary rounded px-1' : ''}`}
              onClick={() => onSectionClick(selectedSection === seg.key ? null : (seg.key ?? null))}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="tabular-nums">{formatUsd(usd)}</span>
              <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
