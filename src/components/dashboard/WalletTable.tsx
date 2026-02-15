import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWalletData } from '@/hooks/useWalletData';
import { getUsernameForLink } from '@/api/walletApi';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd, formatRelativeTime } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus } from 'lucide-react';

const SMALL_SECTION_THRESHOLD = 50_000; // Sections below this start collapsed

const BADGE_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Team',
  DESO_BULL: 'DeSo Bull',
};

function ClassBadge({ classification }: { classification: string }) {
  const cls =
    classification === 'FOUNDATION' ? 'badge-foundation'
    : classification === 'AMM' ? 'badge-amm'
    : classification === 'DESO_BULL' ? 'badge-bull'
    : 'badge-founder';
  return <span className={cls}>{BADGE_LABELS[classification] ?? classification}</span>;
}

type SectionKey = 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL';

const SECTION_LABELS: Record<SectionKey, string> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM Funds',
  FOUNDER: 'Team',
  DESO_BULL: 'DeSo Bulls',
};

export default function WalletTable() {
  const { wallets, isLoading, isLive, dataSource, cachedAt } = useWalletData();
  const { marketData } = useLiveData();

  const allWallets = useMemo(() => wallets.map((w) => {
    const b = w.balances;
    const usdValue =
      (b.DESO || 0) * marketData.desoPrice +
      (b.dUSDC || 0) +
      (b.Focus || 0) * marketData.focusPrice +
      (b.Openfund || 0) * marketData.openfundPrice +
      (b.dBTC || 0) * marketData.btcPrice +
      (b.dETH || 0) * marketData.ethPrice +
      (b.dSOL || 0) * marketData.solPrice;
    return { ...w, usdValue };
  }), [wallets, marketData]);

  const grouped = useMemo(() => {
    const groups: Record<SectionKey, typeof allWallets> = {
      FOUNDATION: [],
      AMM: [],
      FOUNDER: [],
      DESO_BULL: [],
    };
    for (const w of allWallets) {
      if (groups[w.classification as SectionKey]) groups[w.classification as SectionKey].push(w);
    }
    const desoBulls = groups.DESO_BULL;
    const randhir = desoBulls.find((w) => w.name === 'Randhir (Me)');
    const rest = desoBulls.filter((w) => w.name !== 'Randhir (Me)').sort((a, b) => b.usdValue - a.usdValue);
    const sortedDesoBulls = randhir ? [randhir, ...rest] : rest;
    return {
      FOUNDATION: [...groups.FOUNDATION].sort((a, b) => b.usdValue - a.usdValue),
      AMM: [...groups.AMM].sort((a, b) => b.usdValue - a.usdValue),
      FOUNDER: [...groups.FOUNDER].sort((a, b) => b.usdValue - a.usdValue),
      DESO_BULL: sortedDesoBulls,
    };
  }, [allWallets]);

  const sectionTotals = useMemo(() => ({
    FOUNDATION: grouped.FOUNDATION.reduce((s, w) => s + w.usdValue, 0),
    AMM: grouped.AMM.reduce((s, w) => s + w.usdValue, 0),
    FOUNDER: grouped.FOUNDER.reduce((s, w) => s + w.usdValue, 0),
    DESO_BULL: grouped.DESO_BULL.reduce((s, w) => s + w.usdValue, 0),
  }), [grouped]);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    FOUNDATION: true,
    AMM: true,
    FOUNDER: true,
    DESO_BULL: true,
  });

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    const total = sectionTotals.FOUNDATION + sectionTotals.AMM + sectionTotals.FOUNDER + sectionTotals.DESO_BULL;
    if (total === 0) return; // Wait for data
    hasInitialized.current = true;
    const shouldCollapse = (t: number) => t > 0 && t < SMALL_SECTION_THRESHOLD;
    setOpenSections({
      FOUNDATION: !shouldCollapse(sectionTotals.FOUNDATION),
      AMM: !shouldCollapse(sectionTotals.AMM),
      FOUNDER: !shouldCollapse(sectionTotals.FOUNDER),
      DESO_BULL: !shouldCollapse(sectionTotals.DESO_BULL),
    });
  }, [sectionTotals.FOUNDATION, sectionTotals.AMM, sectionTotals.FOUNDER, sectionTotals.DESO_BULL]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalUsd = allWallets.reduce((s, w) => s + w.usdValue, 0);

  function WalletRow({ w }: { w: (typeof allWallets)[0] }) {
    const username = getUsernameForLink(w.name);
    return (
      <tr>
        <td className="font-mono text-xs">
          <Link to={`/u/${encodeURIComponent(username)}`} className="text-primary hover:underline">
            {w.name}
          </Link>
        </td>
        <td><ClassBadge classification={w.classification} /></td>
        <td className="text-xs text-muted-foreground">
          {(() => {
            const fmt = (n: number) =>
              n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(2);
            const items: { key: string; label: string; amt: number }[] = [];
            const tokens = ['DESO', 'Openfund', 'Focus', 'dUSDC', 'dBTC', 'dETH', 'dSOL'] as const;
            const hasStakeBreakdown = w.desoStaked != null || w.desoUnstaked != null;
            const staked = w.desoStaked ?? 0;
            const unstaked = w.desoUnstaked ?? 0;
            for (const token of tokens) {
              const amt = w.balances[token] ?? 0;
              if (amt <= 0) continue;
              if (token === 'DESO' && hasStakeBreakdown && (staked > 0 || unstaked > 0)) {
                if (unstaked > 0) items.push({ key: 'DESO-unstaked', label: 'DESO (unstaked)', amt: unstaked });
                if (staked > 0) items.push({ key: 'DESO-staked', label: 'DESO (staked)', amt: staked });
              } else {
                items.push({ key: token, label: token, amt });
              }
            }
            return items.map(({ key, label, amt }) => (
              <span key={key} className="mr-3">
                <span className="text-foreground font-mono">{fmt(amt)}</span> {label}
              </span>
            ));
          })()}
        </td>
        <td className="text-right font-mono text-sm">{formatUsd(w.usdValue)}</td>
      </tr>
    );
  }

  function SectionTable({ sectionKey }: { sectionKey: SectionKey }) {
    const items = grouped[sectionKey];
    const total = sectionTotals[sectionKey];
    const isOpen = openSections[sectionKey];

    return (
      <>
        <tr
          role="button"
          tabIndex={0}
          onClick={() => toggleSection(sectionKey)}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection(sectionKey)}
          className="cursor-pointer hover:bg-[var(--table-row-hover)] transition-colors border-b border-border"
        >
          <td colSpan={4} className="py-2.5">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <Minus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              )}
              <span className="font-medium text-sm">{SECTION_LABELS[sectionKey]}</span>
              <span className="text-muted-foreground text-xs">({items.length} wallet{items.length !== 1 ? 's' : ''})</span>
              <span className="ml-auto font-mono text-sm">{formatUsd(total)}</span>
            </div>
          </td>
        </tr>
        {isOpen && items.map((w) => <WalletRow key={w.name} w={w} />)}
      </>
    );
  }

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Tracked Foundation, Team and DeSo Bulls Wallets</h3>
        {isLive ? (
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Live data
          </span>
        ) : (
          <span className="text-[10px] text-amber-500/90 font-medium uppercase tracking-wider" title="Values are from cache or static fallback, not live API">
            {dataSource === 'cached' && cachedAt
              ? `Cached · ${formatRelativeTime(cachedAt)}`
              : 'Not live · Static data'}
          </span>
        )}
      </div>
      {wallets.length === 0 && isLoading ? (
        <Skeleton className="h-48 w-full rounded" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Class</th>
                <th>Key Holdings</th>
                <th className="text-right">USD Value</th>
              </tr>
            </thead>
            <tbody>
              <SectionTable sectionKey="FOUNDATION" />
              <SectionTable sectionKey="AMM" />
              <SectionTable sectionKey="FOUNDER" />
              <SectionTable sectionKey="DESO_BULL" />
              <tr className="border-t border-border font-medium">
                <td colSpan={3} className="text-xs pt-2">Total</td>
                <td className="text-right font-mono text-sm pt-2">{formatUsd(totalUsd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
