import { useTreasuryAddresses } from '@/hooks/useTreasuryData';
import { useLiveData } from '@/hooks/useLiveData';
import { formatUsd } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

function ChainBadge({ chain }: { chain: 'BTC' | 'ETH' | 'SOL' }) {
  const colors: Record<string, string> = {
    BTC: 'bg-amber-500/20 text-amber-400',
    ETH: 'bg-indigo-500/20 text-indigo-400',
    SOL: 'bg-violet-500/20 text-violet-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[chain] ?? ''}`}>
      {chain}
    </span>
  );
}

function formatTokenAmount(amount: number, symbol: string): string {
  if (symbol === 'BTC' && amount >= 1) return amount.toFixed(4);
  if (symbol === 'ETH' && amount >= 1) return amount.toFixed(4);
  if (symbol === 'SOL' && amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(4);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-8)}`;
}

export default function TreasuryAddressTable() {
  const { addresses, isLoading, isLive } = useTreasuryAddresses();
  const { marketData } = useLiveData();

  const rows = addresses.map((row) => {
    let usdValue = 0;
    for (const [token, amount] of Object.entries(row.holdings)) {
      if (amount <= 0) continue;
      if (token === 'USDC' || token === 'USDT') usdValue += amount;
      else if (token === 'BTC') usdValue += amount * marketData.btcPrice;
      else if (token === 'ETH') usdValue += amount * marketData.ethPrice;
      else if (token === 'SOL') usdValue += amount * marketData.solPrice;
    }
    return { ...row, usdValue };
  });

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Foundation Treasury + AMM Funds</h3>
        {isLive && (
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Live data
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Chain</th>
                <th>Address</th>
                <th>Holdings</th>
                <th className="text-right">USD Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.chain}-${row.address}-${i}`}>
                  <td className="text-xs font-medium">{row.name}</td>
                  <td>
                    <ChainBadge chain={row.chain} />
                  </td>
                  <td className="font-mono text-xs" title={row.address}>
                    {truncateAddress(row.address)}
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {Object.entries(row.holdings)
                      .filter(([, amt]) => amt > 0)
                      .map(([token, amt]) => (
                        <span key={token} className="mr-3">
                          <span className="text-foreground font-mono">
                            {formatTokenAmount(amt, token)}
                          </span>{' '}
                          {token}
                        </span>
                      ))}
                  </td>
                  <td className="text-right font-mono text-sm">{formatUsd(row.usdValue)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td colSpan={4} className="text-xs pt-2">Total</td>
                <td className="text-right font-mono text-sm pt-2">{formatUsd(rows.reduce((s, r) => s + r.usdValue, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
