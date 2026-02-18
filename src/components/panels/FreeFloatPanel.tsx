import { useSupply } from '@/contexts/SupplyContext';
import { formatUsd, formatPercent } from '@/lib/formatters';
import { sumDesoBalance } from '@/lib/utils';

export default function FreeFloatPanel() {
  const { totalIssued, freeFloat, wallets, filters, prices } = useSupply();
  
  const lockedByCategory = {
    foundation: sumDesoBalance(wallets.filter((w) => w.category === 'FOUNDATION'), filters),
    amm: sumDesoBalance(wallets.filter((w) => w.category === 'AMM'), filters),
    founder: sumDesoBalance(wallets.filter((w) => w.category === 'FOUNDER'), filters),
    desoBulls: sumDesoBalance(wallets.filter((w) => w.category === 'DESO_BULL'), filters),
    treasury: sumDesoBalance(wallets.filter((w) => w.category === 'TREASURY'), filters),
    cold: sumDesoBalance(wallets.filter((w) => w.category === 'COLD'), filters),
  };
  
  const totalLocked = Object.values(lockedByCategory).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Free Float Breakdown</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Total Supply</div>
            <div className="text-2xl font-bold">{formatUsd(totalIssued * prices.deso)}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatPercent(100)}</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Locked</div>
            <div className="text-2xl font-bold">{formatUsd(totalLocked * prices.deso)}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatPercent((totalLocked / totalIssued) * 100)}</div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Free Float</div>
            <div className="text-2xl font-bold text-primary">{formatUsd(freeFloat * prices.deso)}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatPercent((freeFloat / totalIssued) * 100)}</div>
          </div>
        </div>
        
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <h4 className="text-sm font-medium mb-3">Locked by Category</h4>
          <div className="space-y-2">
            {Object.entries(lockedByCategory).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{category}</span>
                <span className="font-mono">{formatUsd(amount * prices.deso)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
