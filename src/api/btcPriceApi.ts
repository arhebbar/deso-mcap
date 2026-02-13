/**
 * Fetches BTC historical prices from CryptoCompare (accurate daily closes).
 * Uses CORS proxy since CryptoCompare blocks direct browser requests.
 */

const CRYPTOCOMPARE_URL =
  'https://api.codetabs.com/v1/proxy?quest=' +
  encodeURIComponent('https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=');

export interface BtcPricePoint {
  date: string;
  price: number;
}

export async function fetchBtcPriceHistory(days: number): Promise<BtcPricePoint[]> {
  const url = `${CRYPTOCOMPARE_URL}${days}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    Response?: string;
    Data?: { Data?: Array<{ time: number; close: number }> };
  };
  if (json.Response !== 'Success' || !json.Data?.Data) return [];
  return json.Data.Data.map(({ time, close }) => ({
    date: new Date(time * 1000).toISOString().split('T')[0],
    price: close,
  })).filter((p) => p.price > 0);
}
