import { z } from 'zod';
import { FOCUS_PK, OPENFUND_PK } from './tokenLiquidityApi';

const CoinGeckoPricesSchema = z.object({
  bitcoin: z.object({ usd: z.number() }),
  ethereum: z.object({ usd: z.number() }),
  solana: z.object({ usd: z.number() }),
  'decentralized-social': z.object({ usd: z.number() }).optional(),
  decentralized_social: z.object({ usd: z.number() }).optional(),
});

export interface LivePrices {
  desoPrice: number;
  btcPrice: number;
  ethPrice: number;
  solPrice: number;
  /** Order-book mid price (USD) on the DESO pair; 0 when the book is one-sided or unavailable. */
  focusPrice: number;
  openfundPrice: number;
}


// CoinGecko allows browser CORS; the Vercel proxy gets 403, so call it directly in prod.
const COINGECKO_BASE = import.meta.env.DEV ? '/coingecko' : 'https://api.coingecko.com/api/v3';
const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

interface DesoExchangeRate {
  USDCentsPerDeSoExchangeRate?: number;
  USDCentsPerBitcoinExchangeRate?: number;
  USDCentsPerETHExchangeRate?: number;
}

async function fetchCoinGecko(): Promise<Partial<LivePrices>> {
  try {
    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum,solana,decentralized-social&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return {};
    const data = CoinGeckoPricesSchema.partial().parse(await res.json());
    return {
      desoPrice: data['decentralized-social']?.usd ?? data.decentralized_social?.usd,
      btcPrice: data.bitcoin?.usd,
      ethPrice: data.ethereum?.usd,
      solPrice: data.solana?.usd,
    };
  } catch {
    return {};
  }
}

async function fetchDesoNodeRates(): Promise<Partial<LivePrices>> {
  try {
    // get-exchange-rate is GET-only on node.deso.org (POST returns 404)
    const res = await fetch(`${DESO_NODE}/get-exchange-rate`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    const d = (await res.json()) as DesoExchangeRate;
    const cents = (v?: number) => (v && v > 0 ? v / 100 : undefined);
    return {
      desoPrice: cents(d.USDCentsPerDeSoExchangeRate),
      btcPrice: cents(d.USDCentsPerBitcoinExchangeRate),
      ethPrice: cents(d.USDCentsPerETHExchangeRate),
    };
  } catch {
    return {};
  }
}

interface LimitOrder {
  OperationType: 'BID' | 'ASK';
  BuyingDAOCoinCreatorPublicKeyBase58Check: string;
  SellingDAOCoinCreatorPublicKeyBase58Check: string;
  Price: string;
}

/**
 * USD mid price of a DAO coin on its DESO book (what openfund.com shows as "Mid Price").
 * The side comes from the coin an order is buying, not OperationType: BID/ASK is relative to the order's own
 * pair, so an ASK selling DESO for Focus is a buy of Focus. Price is always buying-coin vs selling-coin
 * (BID: selling per buying, ASK: buying per selling).
 */
async function fetchDaoCoinMidPriceUsd(tokenPk: string, desoUsd: number): Promise<number> {
  try {
    const res = await fetch(`${DESO_NODE}/get-dao-coin-limit-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DAOCoin1CreatorPublicKeyBase58Check: 'DESO', DAOCoin2CreatorPublicKeyBase58Check: tokenPk }),
    });
    if (!res.ok) return 0;
    const orders = ((await res.json()) as { Orders?: LimitOrder[] }).Orders ?? [];
    let bestBid = 0;
    let bestAsk = Infinity;
    for (const o of orders) {
      const p = parseFloat(o.Price);
      if (!(p > 0)) continue;
      const buysToken = o.BuyingDAOCoinCreatorPublicKeyBase58Check === tokenPk;
      if (!buysToken && o.SellingDAOCoinCreatorPublicKeyBase58Check !== tokenPk) continue;
      // DESO per token: token is the buying coin → BID price is DESO/token; token is the selling coin → ASK price is.
      const desoPerToken = buysToken === (o.OperationType === 'BID') ? p : 1 / p;
      if (buysToken) bestBid = Math.max(bestBid, desoPerToken);
      else bestAsk = Math.min(bestAsk, desoPerToken);
    }
    if (!(bestBid > 0) || !Number.isFinite(bestAsk)) return 0;
    return ((bestBid + bestAsk) / 2) * desoUsd;
  } catch {
    return 0;
  }
}

export async function fetchLivePrices(): Promise<LivePrices> {
  // DeSo node is the source of truth for DESO; CoinGecko fills SOL and backs up BTC/ETH.
  // (CryptoCompare now requires an API key and returns 401.)
  const [deso, cg] = await Promise.all([fetchDesoNodeRates(), fetchCoinGecko()]);
  const desoPrice = deso.desoPrice ?? cg.desoPrice ?? 0;
  const btcPrice = deso.btcPrice ?? cg.btcPrice ?? 0;
  if (!desoPrice && !btcPrice) throw new Error('Failed to fetch live prices');
  const [focusPrice, openfundPrice] = desoPrice
    ? await Promise.all([fetchDaoCoinMidPriceUsd(FOCUS_PK, desoPrice), fetchDaoCoinMidPriceUsd(OPENFUND_PK, desoPrice)])
    : [0, 0];
  return {
    focusPrice,
    openfundPrice,
    desoPrice,
    btcPrice,
    ethPrice: cg.ethPrice ?? deso.ethPrice ?? 0,
    solPrice: cg.solPrice ?? 0,
  };
}
