import { z } from 'zod';

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

export async function fetchLivePrices(): Promise<LivePrices> {
  // DeSo node is the source of truth for DESO; CoinGecko fills SOL and backs up BTC/ETH.
  // (CryptoCompare now requires an API key and returns 401.)
  const [deso, cg] = await Promise.all([fetchDesoNodeRates(), fetchCoinGecko()]);
  const desoPrice = deso.desoPrice ?? cg.desoPrice ?? 0;
  const btcPrice = deso.btcPrice ?? cg.btcPrice ?? 0;
  if (!desoPrice && !btcPrice) throw new Error('Failed to fetch live prices');
  return {
    desoPrice,
    btcPrice,
    ethPrice: cg.ethPrice ?? deso.ethPrice ?? 0,
    solPrice: cg.solPrice ?? 0,
  };
}
