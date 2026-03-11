/**
 * Bar chart: two-level drilldown by Supply Distribution selection.
 * Staked DESO → Core/Community Validators, by Validator
 * CCv1 → Individual CC (top 8-10), Others
 * User/Project Tokens → Openfund/Focus/CCv2
 * Currency Tokens → dSOL/dUSDC/dBTC/dETH
 * Unstaked DESO → Top Users (by category) and Others
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCirculationTable } from '@/hooks/useCirculationTable';
import { useCCv1HoldingsTable } from '@/hooks/useCCv1HoldingsTable';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd } from '@/lib/formatters';

const SEGMENT_COLORS: Record<string, string> = {
  staked: 'hsl(199, 89%, 48%)',
  ccv1: 'hsl(280, 65%, 55%)',
  openfund: 'hsl(152, 69%, 45%)',
  focus: 'hsl(45, 93%, 47%)',
  ccv2: 'hsl(320, 60%, 55%)',
  deso: 'hsl(215, 80%, 50%)',
  dbtc: 'hsl(30, 80%, 50%)',
  deth: 'hsl(220, 60%, 55%)',
  dsol: 'hsl(250, 70%, 60%)',
  dusdc: 'hsl(120, 50%, 45%)',
  core: 'hsl(199, 89%, 48%)',
  community: 'hsl(199, 70%, 60%)',
  others: 'hsl(0, 0%, 55%)',
};

const TOP_CCV1 = 10;

export default function CapitalStructureBreakdownChart({
  selectedSupplySegment,
}: {
  selectedSupplySegment?: string | null;
}) {
  const circulation = useCirculationTable();
  const { rows: ccv1Rows, totalDesoLocked: ccv1TotalDeso } = useCCv1HoldingsTable();
  const { marketData } = useLiveData();
  const desoPrice = marketData.desoPrice;

  const { barData, title, subtitle } = useMemo(() => {
    const seg = selectedSupplySegment?.toLowerCase() ?? null;

    if (!seg) {
      const sections = circulation.unstaked?.sections ?? [];
      const stakedUsd = circulation.staked.usdValue;
      const ccv1Sec = sections.find((s) => s.id === 'ccv1');
      const openfundSec = sections.find((s) => s.id === 'openfund');
      const focusSec = sections.find((s) => s.id === 'focus');
      const ccv2Sec = sections.find((s) => s.id === 'ccv2amm');
      const desoSec = sections.find((s) => s.id === 'deso');
      const dusdcSec = sections.find((s) => s.id === 'dusdc');
      const dbtcSec = sections.find((s) => s.id === 'dbtc');
      const dethSec = sections.find((s) => s.id === 'deth');
      const dsolSec = sections.find((s) => s.id === 'dsol');

      const currencyUsd = (dusdcSec?.usdValue ?? 0) + (dbtcSec?.usdValue ?? 0) + (dethSec?.usdValue ?? 0) + (dsolSec?.usdValue ?? 0);
      const userProjectUsd = (openfundSec?.usdValue ?? 0) + (focusSec?.usdValue ?? 0) + (ccv2Sec?.usdValue ?? 0);

      return {
        title: 'Capital Structure',
        subtitle: 'Click a segment in Supply Distribution to drill down.',
        barData: [
          { id: 'staked', label: 'Staked DESO', value: stakedUsd },
          { id: 'ccv1', label: 'DeSo CCv1 Locked', value: ccv1Sec?.usdValue ?? 0 },
          { id: 'userproject', label: 'User/Project Tokens', value: userProjectUsd },
          { id: 'currency', label: 'Currency Tokens', value: currencyUsd },
          { id: 'unstaked', label: 'Unstaked DESO', value: desoSec?.usdValue ?? 0 },
        ].filter((d) => d.value > 0),
      };
    }

    if (seg === 'staked deso') {
      const validators = circulation.staked.validators;
      return {
        title: 'Staked DESO – by Validator',
        subtitle: 'Core vs Community validators, then by validator.',
        barData: validators.map((v) => ({
          id: v.id,
          label: v.validatorName,
          value: v.usdValue,
          color: v.validatorType === 'core' ? SEGMENT_COLORS.core : SEGMENT_COLORS.community,
        })),
      };
    }

    if (seg === 'deso ccv1 locked') {
      const topRows = ccv1Rows.slice(0, TOP_CCV1);
      const topUsd = topRows.reduce((s, r) => s + r.desoLocked * desoPrice, 0);
      const totalUsd = ccv1TotalDeso * desoPrice;
      const othersUsd = Math.max(0, totalUsd - topUsd);

      return {
        title: 'DeSo CCv1 Locked – by Creator Coin',
        subtitle: `Top ${TOP_CCV1} creator coins + Others.`,
        barData: [
          ...topRows.map((r) => ({
            id: r.username ?? 'unknown',
            label: r.username ?? 'Unknown',
            value: r.desoLocked * desoPrice,
            color: SEGMENT_COLORS.ccv1,
          })),
          ...(othersUsd > 0 ? [{ id: 'others', label: 'Others', value: othersUsd, color: SEGMENT_COLORS.others }] : []),
        ],
      };
    }

    if (seg === 'user/project tokens') {
      const sections = circulation.unstaked?.sections ?? [];
      const openfundSec = sections.find((s) => s.id === 'openfund');
      const focusSec = sections.find((s) => s.id === 'focus');
      const ccv2Sec = sections.find((s) => s.id === 'ccv2amm');
      return {
        title: 'User/Project Tokens – by Asset',
        subtitle: 'Openfund, Focus, CCv2.',
        barData: [
          openfundSec && { id: 'openfund', label: 'Openfund', value: openfundSec.usdValue, color: SEGMENT_COLORS.openfund },
          focusSec && { id: 'focus', label: 'Focus', value: focusSec.usdValue, color: SEGMENT_COLORS.focus },
          ccv2Sec && { id: 'ccv2', label: 'CCv2', value: ccv2Sec.usdValue, color: SEGMENT_COLORS.ccv2 },
        ].filter(Boolean) as { id: string; label: string; value: number; color?: string }[],
      };
    }

    if (seg === 'currency tokens') {
      const sections = circulation.unstaked?.sections ?? [];
      const dusdcSec = sections.find((s) => s.id === 'dusdc');
      const dbtcSec = sections.find((s) => s.id === 'dbtc');
      const dethSec = sections.find((s) => s.id === 'deth');
      const dsolSec = sections.find((s) => s.id === 'dsol');
      return {
        title: 'Currency Tokens – by Asset',
        subtitle: 'dSOL, dUSDC, dBTC, dETH.',
        barData: [
          dsolSec && { id: 'dsol', label: 'dSOL', value: dsolSec.usdValue, color: SEGMENT_COLORS.dsol },
          dusdcSec && { id: 'dusdc', label: 'dUSDC', value: dusdcSec.usdValue, color: SEGMENT_COLORS.dusdc },
          dbtcSec && { id: 'dbtc', label: 'dBTC', value: dbtcSec.usdValue, color: SEGMENT_COLORS.dbtc },
          dethSec && { id: 'deth', label: 'dETH', value: dethSec.usdValue, color: SEGMENT_COLORS.deth },
        ].filter(Boolean) as { id: string; label: string; value: number; color?: string }[],
      };
    }

    if (seg === 'unstaked deso') {
      const nd = circulation.unstaked?.breakdown?.nativeDeso;
      const byCat = nd?.byCategory ?? [];
      const topCategories = byCat.filter((c) => c.label !== 'Others');
      const othersCat = byCat.find((c) => c.label === 'Others');
      return {
        title: 'Unstaked DESO – by Category',
        subtitle: 'Top users (by category) and Others.',
        barData: [
          ...topCategories.map((c) => ({
            id: c.label,
            label: c.label,
            value: c.usdValue,
            color: SEGMENT_COLORS.deso,
          })),
          ...(othersCat && othersCat.usdValue > 0
            ? [{ id: 'others', label: 'Others', value: othersCat.usdValue, color: SEGMENT_COLORS.others }]
            : []),
        ],
      };
    }

    return { title: 'Capital', subtitle: '', barData: [] };
  }, [selectedSupplySegment, circulation, ccv1Rows, ccv1TotalDeso, desoPrice]);

  if (circulation.isLoading) return null;
  if (barData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital</h3>
        <p className="text-xs text-muted-foreground">Click a segment in Supply Distribution to see drilldown.</p>
      </div>
    );
  }

  const maxVal = Math.max(...barData.map((d) => d.value), 1);

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital</h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
          >
            <XAxis type="number" tickFormatter={(v) => formatUsd(v)} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + '…' : v)}
            />
            <Tooltip
              formatter={(value: number) => [formatUsd(value), '']}
              contentStyle={{
                background: 'hsl(222, 41%, 12%)',
                border: '1px solid hsl(222, 25%, 22%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {barData.map((entry, i) => (
                <Cell
                  key={entry.id}
                  fill={(entry as { color?: string }).color ?? SEGMENT_COLORS[entry.id] ?? 'hsl(0,0%,50%)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        {barData.slice(0, 8).map((d) => {
          const color = (d as { color?: string }).color ?? SEGMENT_COLORS[d.id] ?? 'hsl(0,0%,50%)';
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          return (
            <span key={d.id} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground truncate max-w-[80px]">{d.label}</span>
              <span className="tabular-nums">{formatUsd(d.value)}</span>
            </span>
          );
        })}
        {barData.length > 8 && (
          <span className="text-muted-foreground">+{barData.length - 8} more</span>
        )}
      </div>
    </div>
  );
}
