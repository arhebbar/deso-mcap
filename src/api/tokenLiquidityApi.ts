/**
 * Live buy-side liquidity for DAO coins, for valuing a holding at what it could actually be sold for
 * (walk the buy orders best price first; whatever the book can't absorb is worth $0), rather than
 * quantity × one market price, which assumes unlimited buyers.
 */

export const FOCUS_PK = 'BC1YLjEayZDjAPitJJX4Boy7LsEfN3sWAkYb3hgE9kGBirztsc2re1N';
export const OPENFUND_PK = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';
const DUSDC_PK = 'BC1YLiwTN3DbkU8VmD7F7wXcRR1tFX6jDEkLyruHD2WsH3URomimxLX';

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

interface LimitOrder {
  OperationType: 'BID' | 'ASK';
  BuyingDAOCoinCreatorPublicKeyBase58Check: string;
  SellingDAOCoinCreatorPublicKeyBase58Check: string;
  TransactorPublicKeyBase58Check: string;
  Price: string;
  QuantityToFill: number;
}

export interface BuyOrder {
  priceUsd: number;
  /** Tokens this order would buy */
  qty: number;
  /** Who placed it — a holder can't sell into its own orders */
  by: string;
}

/** Buy orders for a token, best USD price first. */
export type BuyLadder = BuyOrder[];

async function fetchOrders(quotePk: string, tokenPk: string): Promise<LimitOrder[]> {
  const res = await fetch(`${DESO_NODE}/get-dao-coin-limit-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DAOCoin1CreatorPublicKeyBase58Check: quotePk, DAOCoin2CreatorPublicKeyBase58Check: tokenPk }),
  });
  if (!res.ok) return [];
  return ((await res.json()) as { Orders?: LimitOrder[] }).Orders ?? [];
}

/**
 * Every order buying `tokenPk`, across DESO, Focus and dUSDC quotes, converted to USD.
 * The side comes from the coin an order is buying, not OperationType: BID/ASK is relative to the order's own
 * pair, so an ASK selling DESO for Focus is a buy of Focus (all Focus buy orders are ASK-labelled).
 * Price is always buying-coin vs selling-coin:
 *   BID: Price = quote per token, QuantityToFill = tokens.
 *   ASK: Price = token per quote, QuantityToFill = quote.
 */
export async function fetchBuyLadder(
  tokenPk: string,
  quoteUsd: { deso: number; focus: number }
): Promise<BuyLadder> {
  const quotes = [
    { pk: 'DESO', usd: quoteUsd.deso },
    { pk: FOCUS_PK, usd: quoteUsd.focus },
    { pk: DUSDC_PK, usd: 1 },
  ].filter((q) => q.pk !== tokenPk && q.usd > 0);
  const books = await Promise.all(quotes.map((q) => fetchOrders(q.pk, tokenPk).catch(() => [] as LimitOrder[])));
  const ladder: BuyLadder = [];
  quotes.forEach((q, i) => {
    for (const o of books[i]) {
      if (o.BuyingDAOCoinCreatorPublicKeyBase58Check !== tokenPk) continue;
      if (o.SellingDAOCoinCreatorPublicKeyBase58Check !== q.pk) continue;
      const price = parseFloat(o.Price);
      const order =
        o.OperationType === 'BID'
          ? { priceUsd: price * q.usd, qty: o.QuantityToFill }
          : { priceUsd: q.usd / price, qty: o.QuantityToFill * price };
      if (Number.isFinite(order.priceUsd) && order.priceUsd > 0 && order.qty > 0) {
        ladder.push({ ...order, by: o.TransactorPublicKeyBase58Check });
      }
    }
  });
  return ladder.sort((a, b) => b.priceUsd - a.priceUsd);
}

/** USD a holder would get selling `quantity` into the ladder right now, skipping its own orders. */
export function realizableUsd(ladder: BuyLadder, quantity: number, holderPk?: string): number {
  let remaining = quantity;
  let proceeds = 0;
  for (const o of ladder) {
    if (remaining <= 0) break;
    if (holderPk && o.by === holderPk) continue;
    const filled = Math.min(remaining, o.qty);
    proceeds += filled * o.priceUsd;
    remaining -= filled;
  }
  return proceeds;
}
