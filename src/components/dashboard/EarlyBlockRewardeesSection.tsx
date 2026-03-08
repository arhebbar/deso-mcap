/**
 * Early Block Rewardees: recipients of block rewards in the first 10,000 blocks.
 * Public keys are clickable (explorer) and copyable.
 */

import { useState } from 'react';
import { useEarlyBlockRewardRecipients } from '@/hooks/useEarlyBlockRewardRecipients';
import { useTrackedClassifications } from '@/hooks/useTrackedClassifications';
import { Copy } from 'lucide-react';

/** Same category labels as TokenHoldingsTable, WalletTable, etc. */
const CATEGORY_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  AMM: 'AMM',
  FOUNDER: 'Core Team',
  DESO_BULL: 'DeSo Bulls',
  CORE_AFFILIATED: 'Core Affiliated',
  EXCHANGE: 'Exchange',
  OTHERS: 'Others',
};

function CategoryBadge({ classification }: { classification: string }) {
  const cls =
    classification === 'FOUNDATION' ? 'badge-foundation'
    : classification === 'AMM' ? 'badge-amm'
    : classification === 'FOUNDER' ? 'badge-founder'
    : classification === 'CORE_AFFILIATED' ? 'badge-core-affiliated'
    : classification === 'EXCHANGE' ? 'badge-exchange'
    : classification === 'OTHERS' ? 'badge-others'
    : 'badge-bull';
  return <span className={cls}>{CATEGORY_LABELS[classification] ?? classification}</span>;
}

function formatBlockDate(iso: string | null): string {
  if (!iso) return '–';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '–';
  }
}

function PublicKeyCell({ publicKey }: { publicKey: string }) {
  const truncated = `${publicKey.slice(0, 8)}…${publicKey.slice(-6)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(publicKey);
  };

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <a
        href={`https://explorer.deso.com/u/${encodeURIComponent(publicKey)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-mono truncate"
        title={publicKey}
      >
        {truncated}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Copy public key"
        aria-label="Copy public key"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function EarlyBlockRewardeesSection() {
  const [expanded, setExpanded] = useState(false);
  const { data: recipients, isLoading, error } = useEarlyBlockRewardRecipients();
  const { classifications, isLoading: classificationsLoading } = useTrackedClassifications();

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold mb-2">Early Block Rewardees</h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold mb-2">Early Block Rewardees</h2>
        <p className="text-sm text-destructive">Failed to load: {String(error)}</p>
      </section>
    );
  }

  const list = recipients ?? [];
  const totalBlocks = list.reduce((s, r) => s + r.blockCount, 0);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div>
          <h2 className="text-lg font-semibold">Early Block Rewardees</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Block rewards in first 10,000 blocks (early March 2021). {list.length} unique recipient{list.length !== 1 ? 's' : ''}, {totalBlocks} blocks total.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {expanded && (
        <div className="border-t overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-left py-2 px-3 w-12">#</th>
                <th className="text-left py-2 px-3">Public Key</th>
                <th className="text-right py-2 px-3">Blocks</th>
                <th className="text-right py-2 px-3">First Block</th>
                <th className="text-right py-2 px-3">Earliest Date</th>
                <th className="text-right py-2 px-3">Last Block</th>
                <th className="text-right py-2 px-3">Latest Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, idx) => (
                <tr key={r.publicKey} className="border-b border-border hover:bg-muted/20">
                  <td className="py-1.5 px-3">
                    {classificationsLoading ? (
                      <span className="text-muted-foreground">–</span>
                    ) : (
                      <CategoryBadge classification={classifications.get(r.publicKey) ?? 'OTHERS'} />
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-1.5 px-3 font-medium">
                    <PublicKeyCell publicKey={r.publicKey} />
                  </td>
                  <td className="py-1.5 px-3 text-right">{r.blockCount.toLocaleString()}</td>
                  <td className="py-1.5 px-3 text-right">{r.firstBlock}</td>
                  <td className="py-1.5 px-3 text-right text-muted-foreground">{formatBlockDate(r.firstBlockDate)}</td>
                  <td className="py-1.5 px-3 text-right">{r.lastBlock}</td>
                  <td className="py-1.5 px-3 text-right text-muted-foreground">{formatBlockDate(r.lastBlockDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
