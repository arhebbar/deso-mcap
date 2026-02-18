/**
 * Backing Panel - displays wrapped asset backing ratio vs free float market cap.
 * Aggregates balances of dBTC, dETH, dSOL, dUSDC from all wallets.
 */

import { useMemo } from 'react';
import { useSupply } from '@/contexts/SupplyContext';
import { formatUsd, formatRatio, formatPercent } from '@/lib/formatters';

export default function BackingPanel() {
  const { wallets, floatMarketCap, prices } = useSupply();
  
  // Aggregate wrapped asset balances from all wallets
  const wrappedAssets = useMemo(() => {
    let dBTC = 0;
    let dETH = 0;
    let dSOL = 0;
    let dUSDC = 0;
    
    for (const wallet of wallets) {
      const balances = wallet.tokenBalances || {};
      dBTC += balances.dBTC || 0;
      dETH += balances.dETH || 0;
      dSOL += balances.dSOL || 0;
      dUSDC += balances.dUSDC || 0;
    }
    
    return { dBTC, dETH, dSOL, dUSDC };
  }, [wallets]);
  
  // Calculate USD value of each wrapped asset
  const assetValues = useMemo(() => {
    return {
      dBTC: wrappedAssets.dBTC * prices.btc,
      dETH: wrappedAssets.dETH * prices.eth,
      dSOL: wrappedAssets.dSOL * prices.sol,
      dUSDC: wrappedAssets.dUSDC * 1, // USDC is 1:1 with USD
    };
  }, [wrappedAssets, prices]);
  
  // Total USD backing from wrapped assets
  const totalBacking = useMemo(() => {
    return assetValues.dBTC + assetValues.dETH + assetValues.dSOL + assetValues.dUSDC;
  }, [assetValues]);
  
  // Backing ratio vs free float market cap
  const backingRatio = useMemo(() => {
    return floatMarketCap > 0 ? totalBacking / floatMarketCap : 0;
  }, [totalBacking, floatMarketCap]);
  
  // Color coding: green >50%, yellow 20-50%, red <20%
  const ratioColor = useMemo(() => {
    if (backingRatio >= 0.5) return 'text-green-500';
    if (backingRatio >= 0.2) return 'text-yellow-500';
    return 'text-red-500';
  }, [backingRatio]);
  
  const ratioStatus = useMemo(() => {
    if (backingRatio >= 0.5) return 'Well Backed';
    if (backingRatio >= 0.2) return 'Moderately Backed';
    return 'Underbacked';
  }, [backingRatio]);
  
  return (
    <div className="chart-container">
      <h3 className="section-title mb-4">Wrapped Asset Backing</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Backing Ratio</div>
            <div className="text-3xl font-bold mb-2">
              {formatRatio(backingRatio)}
            </div>
            <div className={`text-xs font-medium ${ratioColor}`}>
              {ratioStatus} · {formatPercent(backingRatio)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              vs Free Float Market Cap
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="text-sm text-muted-foreground mb-1">Total Backing</div>
            <div className="text-3xl font-bold">{formatUsd(totalBacking)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              of {formatUsd(floatMarketCap)} float market cap
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <h4 className="text-sm font-medium mb-3">Wrapped Asset Balances</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">dBTC</span>
                <span className="text-xs text-muted-foreground">
                  {wrappedAssets.dBTC.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                </span>
              </div>
              <span className="font-mono text-sm">{formatUsd(assetValues.dBTC)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">dETH</span>
                <span className="text-xs text-muted-foreground">
                  {wrappedAssets.dETH.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                </span>
              </div>
              <span className="font-mono text-sm">{formatUsd(assetValues.dETH)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">dSOL</span>
                <span className="text-xs text-muted-foreground">
                  {wrappedAssets.dSOL.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                </span>
              </div>
              <span className="font-mono text-sm">{formatUsd(assetValues.dSOL)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">dUSDC</span>
                <span className="text-xs text-muted-foreground">
                  {wrappedAssets.dUSDC.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                </span>
              </div>
              <span className="font-mono text-sm">{formatUsd(assetValues.dUSDC)}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between font-medium">
              <span className="text-sm">Total</span>
              <span className="font-mono text-sm">{formatUsd(totalBacking)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
