import { useQuery } from '@tanstack/react-query';
import { fetchLivePrices, type LivePrices } from '@/api/priceApi';
import { fetchDesoExchangeRate, type DesoNodeData } from '@/api/desoApi';
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
  const marketData: MarketData = prices
    ? {
        ...MARKET_DATA,
        desoPrice: prices.desoPrice,
        btcPrice: prices.btcPrice,
        ethPrice: prices.ethPrice,
        solPrice: prices.solPrice,
      }
    : MARKET_DATA;

  const marketCap = calcMarketCap(marketData);
  const { ammDeso, foundationDeso, founderDeso, foundationDusdc, ammWallets } = walletData;
  const freeFloat = calcFreeFloat(marketData, ammDeso, foundationDeso, founderDeso);
  const floatAdjustedMcap = freeFloat * marketData.desoPrice;

  const btcHoldings = treasuryData.isLive ? treasuryData.btcAmount : EXTERNAL_TREASURY.btcHoldings;
  const ethHoldings = treasuryData.isLive ? treasuryData.ethAmount : EXTERNAL_TREASURY.ethHotWallet + EXTERNAL_TREASURY.ethColdWallet;
  const solHoldings = treasuryData.isLive ? treasuryData.solAmount : EXTERNAL_TREASURY.solColdWallet;

  const btcTreasuryValue = btcHoldings * marketData.btcPrice;
  const ethValue = ethHoldings * marketData.ethPrice;
  const solValue = solHoldings * marketData.solPrice;

  const treasuryCoverage = (btcHoldings * marketData.btcPrice) / marketCap;
  const dusdcBacking = calcDusdcBackingRatio(foundationDusdc);

  const externalAssets = btcTreasuryValue + ethValue + solValue + EXTERNAL_TREASURY.totalUsdc;
  const ammLiquidity = getAmmLiquidityUsd(marketData, ammWallets);
  const internalEcosystem = ammLiquidity;
  const intangible = Math.max(0, marketCap - externalAssets - internalEcosystem);

  return {
    marketData,
    marketCap,
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
  });

  // Also fetch DeSo node rate as a fallback / cross-check
  const desoQuery = useQuery({
    queryKey: ['deso-exchange-rate'],
    queryFn: fetchDesoExchangeRate,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });

  // Prefer CoinGecko prices, but use DeSo node price as fallback for DESO
  const prices: LivePrices | null = pricesQuery.data
    ? {
        ...pricesQuery.data,
        desoPrice: pricesQuery.data.desoPrice || desoQuery.data?.desoPrice || MARKET_DATA.desoPrice,
      }
    : desoQuery.data
      ? {
          desoPrice: desoQuery.data.desoPrice,
          btcPrice: desoQuery.data.btcPriceFromDeso || MARKET_DATA.btcPrice,
          ethPrice: MARKET_DATA.ethPrice,
          solPrice: MARKET_DATA.solPrice,
        }
      : null;

  const useStaticWallets = !walletData.isLive || walletData.ammWallets.length === 0;
  const walletPayload = useStaticWallets
    ? {
        ammDeso: AMM_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0),
        foundationDeso: FOUNDATION_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0),
        founderDeso: FOUNDER_WALLETS.reduce((s, w) => s + (w.balances.DESO || 0), 0),
        foundationDusdc: FOUNDATION_WALLETS[0]?.balances.dUSDC ?? 0,
        ammWallets: AMM_WALLETS,
      }
    : {
        ammDeso: walletData.ammDeso,
        foundationDeso: walletData.foundationDeso,
        founderDeso: walletData.founderDeso,
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
    isLoading: pricesQuery.isLoading && desoQuery.isLoading,
    isError: pricesQuery.isError && desoQuery.isError,
    lastUpdated: pricesQuery.dataUpdatedAt || desoQuery.dataUpdatedAt || null,
  };
}
