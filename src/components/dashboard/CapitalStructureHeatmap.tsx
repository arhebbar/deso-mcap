/**
 * Heatmap of Level 2 components: Core Validators, Community Validators (blue shades),
 * OpenFund, Focus, AMMs, Core Team, DeSo Bulls. Matches Doughnut filter on the left.
 */

import { useCirculationTable } from '@/hooks/useCirculationTable';
import { useWalletData } from '@/hooks/useWalletData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUsd } from '@/lib/formatters';

function fmtDeso(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

const BLUE_CORE = 'hsl(199, 89%, 48%)';
const BLUE_COMMUNITY_BASE = 210;
const BLUE_SAT = 70;
const BLUE_LIGHT = 55;

export default function CapitalStructureHeatmap({ highlightedSegment }: { highlightedSegment: string | null }) {
  const data = useCirculationTable();
  const { ammDeso, foundationDeso, founderDeso, desoBullsDeso } = useWalletData();

  if (data.isLoading) {
    return (
      <div className="chart-container">
        <h3 className="section-title">Capital Structure</h3>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  const coreValidators = data.staked.validators.filter((v) => v.validatorType === 'core');
  const communityValidators = data.staked.validators.filter((v) => v.validatorType === 'community');
  const openfundSection = data.unstaked.sections.find((s) => s.id === 'openfund');
  const focusSection = data.unstaked.sections.find((s) => s.id === 'focus');
  const desoPrice = data.desoPrice;

  const ammUsd = ammDeso * desoPrice;
  const coreTeamUsd = founderDeso * desoPrice;
  const desoBullsUsd = desoBullsDeso * desoPrice;

  const maxStaked = Math.max(...data.staked.validators.map((v) => v.amount), 1);
  const maxUsd = Math.max(
    openfundSection?.usdValue ?? 0,
    focusSection?.usdValue ?? 0,
    ammUsd,
    coreTeamUsd,
    desoBullsUsd,
    1
  );

  const isHighlighted = (key: string) => highlightedSegment !== null && highlightedSegment.toLowerCase() === key.toLowerCase();

  return (
    <div className="chart-container">
      <h3 className="section-title">Capital Structure</h3>
      <p className="text-xs text-muted-foreground mb-3">Level 2 breakdown (click doughnut to highlight)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {/* Core Validators */}
            <tr className={isHighlighted('staked') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground align-top w-40">Core Validators</td>
              <td className="py-1.5">
                <div className="flex flex-wrap gap-1">
                  {coreValidators.map((v, i) => {
                    const intensity = maxStaked > 0 ? v.amount / maxStaked : 0;
                    const lightness = 75 - intensity * 35;
                    return (
                      <span
                        key={v.id}
                        className="inline-block px-2 py-0.5 rounded text-xs font-mono text-white"
                        style={{ backgroundColor: BLUE_CORE, opacity: 0.6 + intensity * 0.4 }}
                        title={`${v.validatorName}: ${fmtDeso(v.amount)} DESO`}
                      >
                        {v.validatorName}
                      </span>
                    );
                  })}
                  {coreValidators.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </td>
            </tr>
            {/* Community Validators */}
            <tr className={isHighlighted('staked') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground align-top">Community Validators</td>
              <td className="py-1.5">
                <div className="flex flex-wrap gap-1">
                  {communityValidators.map((v, i) => {
                    const intensity = maxStaked > 0 ? v.amount / maxStaked : 0;
                    const lightness = 60 - intensity * 25;
                    return (
                      <span
                        key={v.id}
                        className="inline-block px-2 py-0.5 rounded text-xs font-mono text-white"
                        style={{ backgroundColor: `hsl(${BLUE_COMMUNITY_BASE}, ${BLUE_SAT}%, ${lightness}%)` }}
                        title={`${v.validatorName}: ${fmtDeso(v.amount)} DESO`}
                      >
                        {v.validatorName}
                      </span>
                    );
                  })}
                  {communityValidators.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </td>
            </tr>
            {/* OpenFund */}
            <tr className={isHighlighted('openfund') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground">OpenFund (Market Cap)</td>
              <td className="py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: `hsl(152, 69%, ${45 - ((openfundSection?.usdValue ?? 0) / maxUsd) * 20}%)`,
                    color: 'white',
                  }}
                >
                  {formatUsd(openfundSection?.usdValue ?? 0)}
                </span>
              </td>
            </tr>
            {/* Focus */}
            <tr className={isHighlighted('focus') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground">Focus (Market Cap)</td>
              <td className="py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: `hsl(45, 93%, ${47 - ((focusSection?.usdValue ?? 0) / maxUsd) * 20}%)`,
                    color: 'black',
                  }}
                >
                  {formatUsd(focusSection?.usdValue ?? 0)}
                </span>
              </td>
            </tr>
            {/* AMMs */}
            <tr className={isHighlighted('amm') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground">AMMs</td>
              <td className="py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono text-white"
                  style={{
                    backgroundColor: `hsl(38, 92%, ${50 - (ammUsd / maxUsd) * 20}%)`,
                  }}
                >
                  {formatUsd(ammUsd)}
                </span>
              </td>
            </tr>
            {/* Core Team */}
            <tr className={isHighlighted('core team') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground">Core Team</td>
              <td className="py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono text-white"
                  style={{
                    backgroundColor: `hsl(0, 72%, ${51 - (coreTeamUsd / maxUsd) * 20}%)`,
                  }}
                >
                  {formatUsd(coreTeamUsd)}
                </span>
              </td>
            </tr>
            {/* DeSo Bulls */}
            <tr className={isHighlighted('deso bulls') ? 'ring-1 ring-primary/50' : ''}>
              <td className="py-1.5 pr-3 text-muted-foreground">DeSo Bulls</td>
              <td className="py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono text-white"
                  style={{
                    backgroundColor: `hsl(262, 52%, ${47 - (desoBullsUsd / maxUsd) * 20}%)`,
                  }}
                >
                  {formatUsd(desoBullsUsd)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
