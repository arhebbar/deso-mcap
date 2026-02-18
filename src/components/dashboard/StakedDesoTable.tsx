import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStakedDesoData } from '@/hooks/useStakedDesoData';
import { getUsernameForLink } from '@/api/walletApi';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus } from 'lucide-react';
import type { AllStakedDesoRow, AllStakedDesoBucket } from '@/api/walletApi';

/** Min DESO for named community accounts to show individually (may revise later) */
const NAMED_COMMUNITY_MIN_DESO = 1;

const BADGE_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Team',
  DESO_BULL: 'DeSo Bull',
  COMMUNITY: 'Community',
};

function ClassBadge({ classification }: { classification: string }) {
  const cls =
    classification === 'FOUNDATION' ? 'badge-foundation'
    : classification === 'AMM' ? 'badge-amm'
    : classification === 'DESO_BULL' || classification === 'COMMUNITY' ? 'badge-bull'
    : 'badge-founder';
  return <span className={cls}>{BADGE_LABELS[classification] ?? classification}</span>;
}

function fmtDeso(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(2);
}

export default function StakedDesoTable() {
  const { validatorBuckets, isLoading, isFetching, isLive } = useStakedDesoData();
  const { marketData } = useLiveData();

  const [openSections, setOpenSections] = useState<Set<'core' | 'community'>>(new Set());
  const [openValidators, setOpenValidators] = useState<Set<string>>(new Set());

  const toggleSection = (section: 'core' | 'community') => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleValidator = (key: string) => {
    setOpenValidators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalStaked = validatorBuckets.reduce((s, b) => s + b.total, 0);
  const totalUsd = totalStaked * marketData.desoPrice;
  const coreTotal = validatorBuckets.filter((b) => b.validatorType === 'core').reduce((s, b) => s + b.total, 0);
  const communityTotal = validatorBuckets.filter((b) => b.validatorType === 'community').reduce((s, b) => s + b.total, 0);

  function StakeRow({ r }: { r: AllStakedDesoRow }) {
    return (
      <tr>
        <td className="font-mono text-xs pl-10">
          <Link to={`/u/${encodeURIComponent(getUsernameForLink(r.stakerName))}`} className="text-primary hover:underline">
            {r.stakerName}
          </Link>
        </td>
        <td><ClassBadge classification={r.classification} /></td>
        <td className="text-right font-mono text-sm">{fmtDeso(r.amount)}</td>
        <td className="text-right font-mono text-sm">{formatUsd(r.amount * marketData.desoPrice)}</td>
      </tr>
    );
  }

  function ValidatorSection({ bucket }: { bucket: AllStakedDesoBucket }) {
    const isOpen = openValidators.has(bucket.validatorKey);
    const hasFoundation = bucket.foundation.length > 0;
    const hasCommunity = bucket.community.length > 0;

    return (
      <>
        <tr
          role="button"
          tabIndex={0}
          onClick={() => toggleValidator(bucket.validatorKey)}
          onKeyDown={(e) => e.key === 'Enter' && toggleValidator(bucket.validatorKey)}
          className="cursor-pointer hover:bg-[var(--table-row-hover)] transition-colors border-b border-border"
        >
          <td className="py-2.5 pl-6">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <Minus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              )}
              <span className="font-medium text-sm">{bucket.validatorName}</span>
              <span className="text-muted-foreground text-xs">
                ({bucket.foundation.length + bucket.community.length} wallet{(bucket.foundation.length + bucket.community.length) !== 1 ? 's' : ''})
              </span>
            </div>
          </td>
          <td className="py-2.5" />
          <td className="py-2.5 text-right font-mono text-sm">{fmtDeso(bucket.total)}</td>
          <td className="py-2.5 text-right font-mono text-sm">{formatUsd(bucket.total * marketData.desoPrice)}</td>
        </tr>
        {isOpen && (
          <>
            {hasFoundation && (
              <>
                <tr className="bg-muted/30">
                  <td colSpan={4} className="py-1.5 pl-10 text-xs font-medium text-muted-foreground">Foundation</td>
                </tr>
                {bucket.foundation.map((r) => (
                  <StakeRow key={`${r.stakerPk}-${r.validatorPk}`} r={r} />
                ))}
              </>
            )}
            {hasCommunity && (() => {
              const individual = bucket.community.filter(
                (r) =>
                  r.classification === 'DESO_BULL' ||
                  (r.hasUsername && r.amount > NAMED_COMMUNITY_MIN_DESO)
              );
              const unnamed = bucket.community.filter((r) => !r.hasUsername);
              const unnamedTotal = unnamed.reduce((s, r) => s + r.amount, 0);
              const other = bucket.community.filter(
                (r) => r.hasUsername && r.amount <= NAMED_COMMUNITY_MIN_DESO && r.classification === 'COMMUNITY'
              );
              const otherTotal = other.reduce((s, r) => s + r.amount, 0);
              return (
                <>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="py-1.5 pl-10 text-xs font-medium text-muted-foreground">Community</td>
                  </tr>
                  {individual.map((r) => (
                    <StakeRow key={`${r.stakerPk}-${r.validatorPk}`} r={r} />
                  ))}
                  {unnamed.length > 0 && (
                    <tr>
                      <td className="font-mono text-xs pl-10 text-muted-foreground">
                        Unnamed ({unnamed.length} wallet{unnamed.length !== 1 ? 's' : ''})
                      </td>
                      <td><ClassBadge classification="COMMUNITY" /></td>
                      <td className="text-right font-mono text-sm">{fmtDeso(unnamedTotal)}</td>
                      <td className="text-right font-mono text-sm">{formatUsd(unnamedTotal * marketData.desoPrice)}</td>
                    </tr>
                  )}
                  {other.length > 0 && (
                    <tr>
                      <td className="font-mono text-xs pl-10 text-muted-foreground">
                        Other (≤{NAMED_COMMUNITY_MIN_DESO} DESO, {other.length} wallet{other.length !== 1 ? 's' : ''})
                      </td>
                      <td><ClassBadge classification="COMMUNITY" /></td>
                      <td className="text-right font-mono text-sm">{fmtDeso(otherTotal)}</td>
                      <td className="text-right font-mono text-sm">{formatUsd(otherTotal * marketData.desoPrice)}</td>
                    </tr>
                  )}
                </>
              );
            })()}
          </>
        )}
      </>
    );
  }

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Staked DESO</h3>
        {(isLoading || isFetching) ? (
          <span className="text-[10px] text-primary font-medium uppercase tracking-wider" title="Queries still running; data may change">
            Updating…
          </span>
        ) : isLive ? (
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Live data
          </span>
        ) : (
          <span
            className="text-[10px] text-amber-500/90 font-medium uppercase tracking-wider"
            title="Stake data not yet loaded"
          >
            Loading…
          </span>
        )}
      </div>
      {validatorBuckets.length === 0 && isLoading ? (
        <Skeleton className="h-48 w-full rounded" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Class</th>
                <th className="text-right">Staked DESO</th>
                <th className="text-right">USD Value</th>
              </tr>
            </thead>
            <tbody>
              {coreTotal > 0 && (
                <>
                  <tr
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection('core')}
                    onKeyDown={(e) => e.key === 'Enter' && toggleSection('core')}
                    className="cursor-pointer hover:bg-[var(--table-row-hover)] transition-colors border-b border-border bg-muted/50"
                  >
                    <td className="py-2.5 font-semibold text-sm">
                      <div className="flex items-center gap-2">
                        {openSections.has('core') ? (
                          <Minus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        )}
                        Core Validators
                      </div>
                    </td>
                    <td className="py-2.5" />
                    <td className="py-2.5 text-right font-mono text-sm font-medium">{fmtDeso(coreTotal)}</td>
                    <td className="py-2.5 text-right font-mono text-sm font-medium">{formatUsd(coreTotal * marketData.desoPrice)}</td>
                  </tr>
                  {openSections.has('core') &&
                    validatorBuckets
                      .filter((b) => b.validatorType === 'core')
                      .map((b) => <ValidatorSection key={b.validatorKey} bucket={b} />)}
                </>
              )}
              {communityTotal > 0 && (
                <>
                  <tr
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection('community')}
                    onKeyDown={(e) => e.key === 'Enter' && toggleSection('community')}
                    className="cursor-pointer hover:bg-[var(--table-row-hover)] transition-colors border-b border-border bg-muted/50"
                  >
                    <td className="py-2.5 font-semibold text-sm">
                      <div className="flex items-center gap-2">
                        {openSections.has('community') ? (
                          <Minus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        )}
                        Community Validators
                      </div>
                    </td>
                    <td className="py-2.5" />
                    <td className="py-2.5 text-right font-mono text-sm font-medium">{fmtDeso(communityTotal)}</td>
                    <td className="py-2.5 text-right font-mono text-sm font-medium">{formatUsd(communityTotal * marketData.desoPrice)}</td>
                  </tr>
                  {openSections.has('community') &&
                    validatorBuckets
                      .filter((b) => b.validatorType === 'community')
                      .map((b) => <ValidatorSection key={b.validatorKey} bucket={b} />)}
                </>
              )}
              {validatorBuckets.length > 0 && (
                <tr className="border-t border-border font-medium">
                  <td colSpan={2} className="text-xs pt-2">Total</td>
                  <td className="text-right font-mono text-sm pt-2">{fmtDeso(totalStaked)}</td>
                  <td className="text-right font-mono text-sm pt-2">{formatUsd(totalUsd)}</td>
                </tr>
              )}
              {validatorBuckets.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                    No staked DESO data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
