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

export async function fetchLivePrices(): Promise<LivePrices> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,decentralized-social&vs_currencies=usd',
      { headers: { Accept: 'application/json' } }
    );

    if (res.ok) {
      const raw = await res.json();
      const data = CoinGeckoPricesSchema.parse(raw);
      return {
        desoPrice: data['decentralized-social']?.usd ?? data.decentralized_social?.usd ?? 0,
        btcPrice: data.bitcoin.usd,
        ethPrice: data.ethereum.usd,
        solPrice: data.solana.usd,
      };
    }
  } catch {
    // Fall through to CryptoCompare
  }

  // Fallback: fetch all prices in parallel (CryptoCompare + DeSo node)
  const ccBase = import.meta.env.DEV ? '/cryptocompare' : '/api/cryptocompare';
  const desoUrl = import.meta.env.DEV ? '/deso-api' : '/api/deso';

  const [ccRes, ethRes, solRes, desoRes] = await Promise.all([
    fetch(ccBase + '/data/price?fsym=BTC&tsyms=USD,ETH,SOL&extraParams=deso-marketcap', { headers: { Accept: 'application/json' } }),
    fetch(ccBase + '/data/price?fsym=ETH&tsyms=USD&extraParams=deso-marketcap', { headers: { Accept: 'application/json' } }),
    fetch(ccBase + '/data/price?fsym=SOL&tsyms=USD&extraParams=deso-marketcap', { headers: { Accept: 'application/json' } }),
    fetch(desoUrl + '/get-exchange-rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
  ]);

  if (!ccRes.ok) throw new Error('Failed to fetch live prices');
  const cc = (await ccRes.json()) as { USD?: number };
  const btcPrice = cc.USD ?? 0;
  const ethPrice = ethRes.ok ? ((await ethRes.json()) as { USD?: number }).USD ?? 0 : 0;
  const solPrice = solRes.ok ? ((await solRes.json()) as { USD?: number }).USD ?? 0 : 0;
  const desoJson = desoRes.ok ? (await desoRes.json()) as { USDCentsPerDeSoExchangeRate?: number } : null;
  const desoPrice = desoJson ? (desoJson.USDCentsPerDeSoExchangeRate ?? 0) / 100 : 0;

  return { desoPrice, btcPrice, ethPrice, solPrice };
}
