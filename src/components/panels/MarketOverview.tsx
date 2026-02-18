import { useSupply } from '@/contexts/SupplyContext';
import { formatUsd, formatPercent } from '@/lib/formatters';
import KpiCard from '@/components/dashboard/KpiCard';

export default function MarketOverview() {
  const { marketCap, floatMarketCap, freeFloat, totalIssued, prices, isLoading } = useSupply();
  
  const floatPercent = totalIssued > 0 ? (freeFloat / totalIssued) * 100 : 0;
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Market Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Market Cap"
          value={formatUsd(marketCap)}
          subtitle={isLoading ? 'Updating…' : `$${prices.deso.toFixed(2)}/DESO`}
        />
        <KpiCard
          label="Float-Adjusted MCap"
          value={formatUsd(floatMarketCap)}
          subtitle={isLoading ? 'Updating…' : `${formatPercent(floatPercent)} float`}
        />
        <KpiCard
          label="Free Float"
          value={formatUsd(freeFloat * prices.deso)}
          subtitle={`${formatPercent(floatPercent)} of supply`}
        />
        <KpiCard
          label="Total Supply"
          value={formatUsd(totalIssued * prices.deso)}
          subtitle={`${(totalIssued / 1_000_000).toFixed(2)}M DESO`}
        />
      </div>
    </div>
  );
}
