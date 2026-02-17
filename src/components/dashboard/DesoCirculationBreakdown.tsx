import { useState } from 'react';
import { useDesoCirculationBreakdown, type CirculationNode } from '@/hooks/useDesoCirculationBreakdown';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown } from 'lucide-react';

function fmtDeso(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(2);
}

function TreeNode({ node, depth, total, path, openKeys, toggleKey, cachedAt }: {
  node: CirculationNode;
  depth: number;
  total: number;
  path: string;
  openKeys: Set<string>;
  toggleKey: (k: string) => void;
  cachedAt?: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const key = path;
  const isOpen = openKeys.has(key);
  const pct = total > 0 ? (node.amount / total) * 100 : 0;
  const isCreatorCoins = node.label === 'Creator Coins v1';

  return (
    <>
      <div
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onClick={hasChildren ? () => toggleKey(key) : undefined}
        onKeyDown={hasChildren ? (e) => e.key === 'Enter' && toggleKey(key) : undefined}
        className={`flex items-center gap-2 py-1.5 text-sm ${hasChildren ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className={`flex-1 ${depth === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
          {node.label}
          {isCreatorCoins && cachedAt != null && (
            <span className="ml-1.5 text-[10px] text-muted-foreground/80 font-normal" title={`Cached ${new Date(cachedAt).toLocaleDateString()}`}>
              (cached {new Date(cachedAt).toLocaleDateString()})
            </span>
          )}
        </span>
        <span className="font-mono text-xs tabular-nums">{fmtDeso(node.amount)}</span>
        <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
      </div>
      {hasChildren && isOpen &&
        node.children!.map((child) => (
          <TreeNode
            key={`${key}-${child.label}`}
            node={child}
            depth={depth + 1}
            total={total}
            path={`${key}/${child.label}`}
            openKeys={openKeys}
            toggleKey={toggleKey}
            cachedAt={child.label === 'Creator Coins v1' ? cachedAt : undefined}
          />
        ))}
    </>
  );
}

export default function DesoCirculationBreakdown() {
  const { total, root, isLoading, ccv1CachedAt } = useDesoCirculationBreakdown();
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set(['Staked', 'Not Staked']));

  const toggleKey = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasDataToShow = total > 0 && root.length > 0;
  if (isLoading && !hasDataToShow) {
    return (
      <div className="chart-container">
        <h3 className="section-title mb-4">Overall DESO in Circulation</h3>
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Overall DESO in Circulation</h3>
      <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
        <div className="p-4 space-y-0">
          {root.map((node) => (
            <TreeNode
              key={node.label}
              node={node}
              depth={0}
              total={total}
              path={node.label}
              openKeys={openKeys}
              toggleKey={toggleKey}
              cachedAt={ccv1CachedAt}
            />
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 flex justify-between text-sm font-medium">
          <span>Total</span>
          <span className="font-mono">{fmtDeso(total)} DESO</span>
        </div>
      </div>
    </div>
  );
}
