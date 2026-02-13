import { z } from 'zod';

const DESO_NODE = 'https://node.deso.org/api/v0';

const ExchangeRateSchema = z.object({
  USDCentsPerDeSoExchangeRate: z.number(),
  SatoshisPerDeSoExchangeRate: z.number(),
  USDCentsPerBitcoinExchangeRate: z.number(),
});

export interface DesoNodeData {
  desoPrice: number;
  btcPriceFromDeso: number;
}

export async function fetchDesoExchangeRate(): Promise<DesoNodeData> {
  const res = await fetch(`${DESO_NODE}/get-exchange-rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch exchange rate');
  }

  const raw = await res.json();
  const data = ExchangeRateSchema.parse(raw);

  return {
    desoPrice: data.USDCentsPerDeSoExchangeRate / 100,
    btcPriceFromDeso: data.USDCentsPerBitcoinExchangeRate / 100,
  };
}
