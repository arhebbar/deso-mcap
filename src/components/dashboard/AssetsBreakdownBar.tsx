/**
 * Doughnut chart of assets by user group: Foundation, AMM/Exchanges, Core+Affiliated, DeSo Bulls, Others.
 * When a segment is selected in Supply Distribution (Chart 1), shows that segment's breakdown by user group.
 * Clicking a segment expands only that section in the table below.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useCirculationTable, type UserGroupBreakdown } from '@/hooks/useCirculationTable';
import { formatUsd } from '@/lib/formatters';

export type SectionFilter = 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'OTHERS' | null;

const USER_GROUPS: { key: keyof UserGroupBreakdown; label: string; color: string }[] = [
  { key: 'Foundation', label: 'Foundation', color: 'hsl(280, 65%, 60%)' },
  { key: 'CoreAffiliated', label: 'Core+Affiliated', color: 'hsl(0, 72%, 51%)' },
  { key: 'AMMExchanges', label: 'AMM/Exchanges', color: 'hsl(38, 92%, 50%)' },
  { key: 'DeSoBulls', label: 'DeSo Bulls', color: 'hsl(262, 52%, 47%)' },
  { key: 'Others', label: 'Others', color: 'hsl(152, 69%, 45%)' },
];

interface AssetsBreakdownBarProps {
  /** When set, show breakdown of this supply segment by user group */
  selectedSupplySegment?: string | null;
  selectedSection: SectionFilter;
  onSectionClick: (section: SectionFilter) => void;
}

function userGroupToSectionFilter(key: keyof UserGroupBreakdown): SectionFilter {
  if (key === 'Foundation') return 'FOUNDATION';
  if (key === 'AMMExchanges') return 'AMM';
  if (key === 'CoreAffiliated') return 'FOUNDER';
  if (key === 'DeSoBulls') return 'DESO_BULL';
  return 'OTHERS';
}

export default function AssetsBreakdownBar({ selectedSupplySegment, selectedSection, onSectionClick }: AssetsBreakdownBarProps) {
  const { totalCirculationUsd, segmentUserGroupBreakdown, isLoading } = useCirculationTable();

  const breakdown: UserGroupBreakdown = selectedSupplySegment && segmentUserGroupBreakdown[selectedSupplySegment]
    ? segmentUserGroupBreakdown[selectedSupplySegment]
    : USER_GROUPS.reduce(
        (acc, g) => {
          acc[g.key] = Object.values(segmentUserGroupBreakdown).reduce((s, seg) => s + seg[g.key], 0);
          return acc;
        },
        {} as UserGroupBreakdown
      );

  const data = USER_GROUPS
    .map((g) => ({ name: g.label, value: breakdown[g.key], key: g.key, color: g.color }))
    .filter((d) => d.value > 0);

  const totalUsd = data.reduce((s, d) => s + d.value, 0);

  if (isLoading || totalUsd <= 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Assets by User-Group</h3>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : 'No data yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title">Assets by User-Group</h3>
      <p className="text-xs text-muted-foreground mb-2">
        {selectedSupplySegment
          ? `${selectedSupplySegment} by user group. Click a segment to expand in the table below.`
          : 'Total value across user groups. Click a segment in Supply Distribution to filter.'}
      </p>
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
                onClick={(entry: { key: keyof UserGroupBreakdown }) =>
                  onSectionClick(selectedSection === userGroupToSectionFilter(entry.key) ? null : userGroupToSectionFilter(entry.key))
                }
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, i) => {
                  const isSelected = selectedSection === userGroupToSectionFilter(entry.key);
                  return (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      stroke={isSelected ? 'hsl(var(--primary))' : 'none'}
                      strokeWidth={isSelected ? 3 : 0}
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
                formatter={(value: number, name: string, props: { payload?: { value: number } }) => {
                  const pct = totalUsd > 0 ? ((props.payload?.value ?? value) / totalUsd) * 100 : 0;
                  return [`${formatUsd(value)} (${pct.toFixed(1)}%)`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3">
          {data.map((item) => {
            const pct = totalUsd > 0 ? (item.value / totalUsd) * 100 : 0;
            const isSelected = selectedSection === userGroupToSectionFilter(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`flex items-center gap-2 text-left rounded px-1 -mx-1 cursor-pointer hover:bg-muted/50 ${isSelected ? 'ring-1 ring-primary' : ''}`}
                onClick={() => onSectionClick(selectedSection === userGroupToSectionFilter(item.key) ? null : userGroupToSectionFilter(item.key))}
              >
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <span className="text-xs text-foreground tabular-nums">{pct.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatUsd(item.value)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
