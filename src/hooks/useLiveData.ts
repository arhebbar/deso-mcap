import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLivePrices, type LivePrices } from '@/api/priceApi';
import { getPriceCache, setPriceCache } from '@/lib/priceCache';
import {
  MARKET_DATA,
  EXTERNAL_TREASURY,
  AMM_WALLETS,
  FOUNDATION_WALLETS,
  FOUNDER_WALLETS,
  type MarketData,
  calcMarketCap,
  calcFreeFloat,
  calcDusdcBackingRatio,
  calcTreasuryCoverage,
  getAmmLiquidityUsd,
} from '@/data/desoData';
import { useWalletData } from './useWalletData';
import { useTreasuryData } from './useTreasuryData';

export interface LiveDashboardData {
  marketData: MarketData;
  marketCap: number;
  ammDeso: number;
  ammLiquidity: number;
  freeFloat: number;
  floatAdjustedMcap: number;
  btcTreasuryValue: number;
  treasuryCoverage: number;
  dusdcBacking: number;
  externalAssets: number;
  internalEcosystem: number;
  intangible: number;
  isLive: boolean;
}

function buildDashboardData(
  prices: LivePrices | null,
  walletData: {
    ammDeso: number;
    foundationDeso: number;
    founderDeso: number;
    ammDesoUnstaked: number;
    foundationDesoUnstaked: number;
    founderDesoUnstaked: number;
    foundationDusdc: number;
    ammWallets: { balances: Record<string, number> }[];
  },
  treasuryData: {
    btcAmount: number;
    ethAmount: number;
    solAmount: number;
    isLive: boolean;
  }
): LiveDashboardData {
  // Use live prices when available; never show $0 when we have static fallbacks
  const marketData: MarketData = prices
    ? {
        ...MARKET_DATA,
        desoPrice: prices.desoPrice > 0 ? prices.desoPrice : MARKET_DATA.desoPrice,
        btcPrice: prices.btcPrice > 0 ? prices.btcPrice : MARKET_DATA.btcPrice,
        ethPrice: prices.ethPrice > 0 ? prices.ethPrice : MARKET_DATA.ethPrice,
        solPrice: prices.solPrice > 0 ? prices.solPrice : MARKET_DATA.solPrice,
      }
    : MARKET_DATA;

  const marketCap = calcMarketCap(marketData);
  const safeMarketCap = marketCap > 0 ? marketCap : calcMarketCap(MARKET_DATA);
  const { ammDeso, foundationDeso, founderDeso, ammDesoUnstaked, foundationDesoUnstaked, founderDesoUnstaked, foundationDusdc, ammWallets } = walletData;
  const freeFloat = calcFreeFloat(marketData, ammDesoUnstaked, foundationDesoUnstaked, founderDesoUnstaked);
  const floatAdjustedMcap = freeFloat * marketData.desoPrice;

  const btcHoldings = treasuryData.btcAmount;
  const ethHoldings = treasuryData.ethAmount;
  const solHoldings = treasuryData.solAmount;

  const btcTreasuryValue = btcHoldings * marketData.btcPrice;
  const ethValue = ethHoldings * marketData.ethPrice;
  const solValue = solHoldings * marketData.solPrice;

  const treasuryCoverage = safeMarketCap > 0 ? (btcHoldings * marketData.btcPrice) / safeMarketCap : 0;
  const dusdcBacking = calcDusdcBackingRatio(foundationDusdc);

  const externalAssets = btcTreasuryValue + ethValue + solValue + EXTERNAL_TREASURY.totalUsdc;
  const ammLiquidity = getAmmLiquidityUsd(marketData, ammWallets);
  const internalEcosystem = ammLiquidity;
  const intangible = Math.max(0, safeMarketCap - externalAssets - internalEcosystem);

  return {
    marketData,
    marketCap: safeMarketCap,
    ammDeso,
    ammLiquidity,
    freeFloat,
    floatAdjustedMcap,
    btcTreasuryValue,
    treasuryCoverage,
    dusdcBacking,
    externalAssets,
    internalEcosystem,
    intangible,
    isLive: !!prices,
  };
}

export function useLiveData() {
  const walletData = useWalletData();
  const treasuryData = useTreasuryData();
  const pricesQuery = useQuery({
    queryKey: ['live-prices'],
    queryFn: fetchLivePrices,
    refetchInterval: 60_000, // refresh every 60s
    staleTime: 30_000,
    retry: 2,
    placeholderData: () => getPriceCache() ?? undefined,
  });

  useEffect(() => {
    if (pricesQuery.data) setPriceCache(pricesQuery.data);
  }, [pricesQuery.data]);

  // Single source: fetchLivePrices tries CoinGecko then fallback (CryptoCompare + DeSo get-exchange-rate)
  const prices: LivePrices | null = pricesQuery.data ?? null;

  const useStaticWallets = !walletData.isLive || walletData.ammWallets.length === 0;
  const walletPayload = useStaticWallets
    ? (() => {
        const amm = AMM_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0);
        const foundation = FOUNDATION_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0);
        const founder = FOUNDER_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0);
        return {
          ammDeso: amm,
          foundationDeso: foundation,
          founderDeso: founder,
          ammDesoUnstaked: amm,
          foundationDesoUnstaked: foundation,
          founderDesoUnstaked: founder,
          foundationDusdc: FOUNDATION_WALLETS[0]?.balances.dUSDC ?? 0,
          ammWallets: AMM_WALLETS,
        };
      })()
    : {
        ammDeso: walletData.ammDeso,
        foundationDeso: walletData.foundationDeso,
        founderDeso: walletData.founderDeso,
        ammDesoUnstaked: walletData.ammDesoUnstaked,
        foundationDesoUnstaked: walletData.foundationDesoUnstaked,
        founderDesoUnstaked: walletData.founderDesoUnstaked,
        foundationDusdc: walletData.foundationDusdc,
        ammWallets: walletData.ammWallets,
      };

  const dashboardData = buildDashboardData(prices, walletPayload, {
    btcAmount: treasuryData.btcAmount,
    ethAmount: treasuryData.ethAmount,
    solAmount: treasuryData.solAmount,
    isLive: treasuryData.isLive,
  });

  return {
    ...dashboardData,
    isLoading: pricesQuery.isLoading,
    isError: pricesQuery.isError,
    lastUpdated: pricesQuery.dataUpdatedAt ?? null,
  };
}
