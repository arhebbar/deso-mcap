/**
 * Wallet Filters - UI toggles to include/exclude wallet categories.
 */

import { useSupply } from '@/contexts/SupplyContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function WalletFilters() {
  const { filters, setFilters } = useSupply();
  
  const toggleFilter = (key: keyof typeof filters) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Wallet Category Filters</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(filters).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-card/50">
            <Switch
              id={key}
              checked={value}
              onCheckedChange={() => toggleFilter(key as keyof typeof filters)}
            />
            <Label htmlFor={key} className="text-sm font-medium capitalize cursor-pointer">
              {key}
            </Label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Toggle categories to include/exclude from free float calculations. Metrics update automatically.
      </p>
    </div>
  );
}
