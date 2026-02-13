/**
 * Fetches historical market data for the Historical Trends chart.
 * - DESO: from CoinGecko market_chart (prices, market_caps)
 * - BTC: from CryptoCompare histoday (accurate daily close prices; CoinGecko market_chart/history are inaccurate)
 * - Most recent date: overridden with live prices from CoinGecko simple/price
 */

import { EXTERNAL_TREASURY, getAmmLiquidityUsd, AMM_WALLETS, MARKET_DATA } from '@/data/desoData';
import { fetchLivePrices } from '@/api/priceApi';
import { fetchWalletBalances } from '@/api/walletApi';
import { fetchTreasuryBalances, fetchBtcHistoricalHoldings } from '@/api/treasuryApi';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DESO_COIN_ID = 'decentralized-social';

export interface HistoricalDataPoint {
  date: string;
  marketCap: number;
  btcTreasury: number;
  btcHoldings: number;
  ammLiquidity: number;
  desoPrice: number;
  btcPrice: number;
}

interface MarketChartResponse {
  prices?: [number, number][];
  market_caps?: [number, number][];
}

/**
 * Group [timestamp_ms, value] pairs by date (YYYY-MM-DD) and take the LAST (most recent) value of each day.
 * CoinGecko may return data in varying order; sorting by timestamp ensures we always get closing prices.
 */
function groupByDay(points: [number, number][]): Map<string, number> {
  const byDay = new Map<string, number>();
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  for (const [ts, value] of sorted) {
    const date = new Date(ts);
    const key = date.toISOString().split('T')[0];
    byDay.set(key, value);
  }
  return byDay;
}

/** Fetch market chart from CoinGecko */
async function fetchMarketChart(coinId: string, days: number): Promise<MarketChartResponse> {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch historical data for ${coinId}`);
  }
  const data = (await res.json()) as MarketChartResponse;
  return data;
}

/** Fetch BTC daily historical prices from CryptoCompare (accurate; CoinGecko historical endpoints are inaccurate) */
async function fetchBtcHistoricalPrices(days: number): Promise<Map<string, number>> {
  const apiUrl = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${days}`;
  const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return new Map();
  const json = (await res.json()) as {
    Response?: string;
    Data?: { Data?: Array<{ time: number; close: number }> };
  };
  if (json.Response !== 'Success' || !json.Data?.Data) return new Map();
  const map = new Map<string, number>();
  for (const { time, close } of json.Data.Data) {
    const date = new Date(time * 1000).toISOString().split('T')[0];
    if (close > 0) map.set(date, close);
  }
  return map;
}


/**
 * Fetches real historical data for the Trends chart.
 * - Market Cap: from CoinGecko DESO market_caps
 * - BTC Treasury: BTC holdings × BTC price (from CryptoCompare histoday)
 * - AMM Liquidity: USD value of all AMM tokens (DESO, dUSDC, Focus, Openfund)
 */
export async function fetchHistoricalData(days: number): Promise<HistoricalDataPoint[]> {
  const [desoRes, livePricesResult, walletData, treasuryData, btcHoldingsByDate] =
    await Promise.all([
      fetchMarketChart(DESO_COIN_ID, days),
      fetchLivePrices().catch(() => null),
      fetchWalletBalances().catch(() => []),
      fetchTreasuryBalances().catch(() => null),
      fetchBtcHistoricalHoldings(days).catch(() => new Map<string, number>()),
    ]);

  const ammWallets =
    walletData.length > 0 ? walletData.filter((w) => w.classification === 'AMM') : AMM_WALLETS;
  const currentBtcHoldings = treasuryData?.btcAmount ?? EXTERNAL_TREASURY.btcHoldings;

  const livePrices = livePricesResult;
  const desoPrices = desoRes.prices ?? [];
  const desoMarketCaps = desoRes.market_caps ?? [];

  const desoPriceByDay = groupByDay(desoPrices);
  const marketCapByDay = groupByDay(desoMarketCaps);

  const allDates = new Set([...marketCapByDay.keys(), ...desoPriceByDay.keys()]);
  const sortedDates = Array.from(allDates).sort();

  // BTC: use CryptoCompare histoday (accurate); CoinGecko market_chart/history are inaccurate
  const btcPriceByDay = await fetchBtcHistoricalPrices(Math.max(days, sortedDates.length + 2));

  let lastMarketCap = 0;
  let lastDesoPrice = 0;

  const data = sortedDates
    .map((date) => {
      const marketCapFromApi = marketCapByDay.get(date) ?? 0;
      const desoPrice = desoPriceByDay.get(date) ?? 0;
      const btcPrice = btcPriceByDay.get(date) ?? 0;

      const marketCap =
        marketCapFromApi > 0
          ? marketCapFromApi
          : desoPrice > 0
            ? MARKET_DATA.desoTotalSupply * desoPrice
            : lastMarketCap;

      const effectiveDesoPrice = desoPrice > 0 ? desoPrice : lastDesoPrice;
      if (marketCap > 0) lastMarketCap = marketCap;
      if (desoPrice > 0) lastDesoPrice = desoPrice;

      const marketDataForDate = { ...MARKET_DATA, desoPrice: effectiveDesoPrice };
      const ammLiquidity = getAmmLiquidityUsd(marketDataForDate, ammWallets);
      const btcHoldings =
        btcHoldingsByDate.get(date) ?? currentBtcHoldings;

      return {
        date,
        marketCap,
        btcTreasury: btcHoldings * btcPrice,
        btcHoldings,
        ammLiquidity,
        desoPrice: effectiveDesoPrice,
        btcPrice,
      };
    })
    .filter((d) => d.btcPrice > 0);

  // Override the most recent date with live prices from simple/price
  if (data.length > 0 && livePrices && livePrices.btcPrice > 0) {
    const last = data[data.length - 1];
    last.btcPrice = livePrices.btcPrice;
    last.btcTreasury = last.btcHoldings * livePrices.btcPrice;
    last.desoPrice = livePrices.desoPrice > 0 ? livePrices.desoPrice : last.desoPrice;
    last.ammLiquidity = getAmmLiquidityUsd(
      { ...MARKET_DATA, desoPrice: last.desoPrice },
      ammWallets
    );
    last.marketCap =
      last.marketCap > 0 ? last.marketCap : MARKET_DATA.desoTotalSupply * last.desoPrice;
  }

  return data;
}
