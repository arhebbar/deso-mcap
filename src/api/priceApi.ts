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
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,decentralized-social&vs_currencies=usd',
    { headers: { Accept: 'application/json' } }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch live prices');
  }

  const raw = await res.json();
  const data = CoinGeckoPricesSchema.parse(raw);

  return {
    desoPrice: data['decentralized-social']?.usd ?? data.decentralized_social?.usd ?? 0,
    btcPrice: data.bitcoin.usd,
    ethPrice: data.ethereum.usd,
    solPrice: data.solana.usd,
  };
}
