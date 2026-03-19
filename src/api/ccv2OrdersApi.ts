/**
 * CCv2 (DeSo Tokens) Limit Order API
 * Fetches order book, user orders, and constructs create/cancel transactions.
 */

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

export interface CCv2Order {
  TransactorPublicKeyBase58Check: string;
  BuyingDAOCoinCreatorPublicKeyBase58Check: string;
  SellingDAOCoinCreatorPublicKeyBase58Check: string;
  ExchangeRateCoinsToSellPerCoinToBuy: number;
  QuantityToFill: number;
  OperationType: 'BID' | 'ASK';
  OrderID: string;
}

export interface OrderBookResponse {
  Orders?: CCv2Order[];
}

export interface TransactorOrdersResponse {
  Orders?: CCv2Order[];
}

/** Get all open orders for a token pair. Use "DESO" for the DESO side (not empty string). */
export async function fetchOrderBook(
  tokenCreator: string,
  quoteCreator: string = 'DESO'
): Promise<CCv2Order[]> {
  const coin1 = tokenCreator || 'DESO';
  const coin2 = quoteCreator || 'DESO';
  const res = await fetch(`${DESO_NODE}/get-dao-coin-limit-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      DAOCoin1CreatorPublicKeyBase58Check: coin1,
      DAOCoin2CreatorPublicKeyBase58Check: coin2,
    }),
  });
  if (!res.ok) throw new Error(`get-dao-coin-limit-orders: ${res.status}`);
  const data = (await res.json()) as OrderBookResponse;
  return data.Orders ?? [];
}

/** Get all open orders created by a transactor. Requires public key (resolve username first via getPublicKeyFromUsername). */
export async function fetchTransactorOrders(
  transactorPublicKey: string
): Promise<CCv2Order[]> {
  const res = await fetch(`${DESO_NODE}/get-transactor-dao-coin-limit-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      TransactorPublicKeyBase58Check: transactorPublicKey,
    }),
  });
  if (!res.ok) throw new Error(`get-transactor-dao-coin-limit-orders: ${res.status}`);
  const data = (await res.json()) as TransactorOrdersResponse;
  return data.Orders ?? [];
}

/** Construct create limit order transaction (returns unsigned TransactionHex). */
export async function constructCreateLimitOrder(params: {
  TransactorPublicKeyBase58Check: string;
  BuyingDAOCoinCreatorPublicKeyBase58CheckOrUsername: string;
  SellingDAOCoinCreatorPublicKeyBase58CheckOrUsername: string;
  ExchangeRateCoinsToSellPerCoinToBuy: number;
  QuantityToFill: number;
  OperationType: 'BID' | 'ASK';
  MinFeeRateNanosPerKB?: number;
}): Promise<{ TransactionHex: string }> {
  const res = await fetch(`${DESO_NODE}/create-dao-coin-limit-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      MinFeeRateNanosPerKB: params.MinFeeRateNanosPerKB ?? 1500,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`create-dao-coin-limit-order: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { TransactionHex?: string };
  if (!data.TransactionHex) throw new Error('No TransactionHex in response');
  return { TransactionHex: data.TransactionHex };
}

/** Construct cancel limit order transaction (returns unsigned TransactionHex). */
export async function constructCancelLimitOrder(params: {
  TransactorPublicKeyBase58Check: string;
  CancelOrderID: string;
  MinFeeRateNanosPerKB?: number;
}): Promise<{ TransactionHex: string }> {
  const res = await fetch(`${DESO_NODE}/cancel-dao-coin-limit-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      MinFeeRateNanosPerKB: params.MinFeeRateNanosPerKB ?? 1500,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`cancel-dao-coin-limit-order: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { TransactionHex?: string };
  if (!data.TransactionHex) throw new Error('No TransactionHex in response');
  return { TransactionHex: data.TransactionHex };
}

/** Resolve public keys to usernames via get-users-stateless. Returns map of pk -> username (only entries with username). */
export async function fetchUsernamesForPks(pks: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pks.length === 0) return map;
  const unique = [...new Set(pks.filter((pk) => pk && pk !== 'DESO'))];
  const BATCH = 100;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    try {
      const res = await fetch(`${DESO_NODE}/get-users-stateless`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PublicKeysBase58Check: batch,
          // Need ProfileEntryResponse.Username for token display + linking.
          SkipForLeaderboard: false,
          IncludeBalance: false,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        UserList?: Array<{
          PublicKeyBase58Check?: string;
          ProfileEntryResponse?: { Username?: string };
          Profile?: { Username?: string };
        }>;
      };
      for (const u of data.UserList ?? []) {
        const pk = u.PublicKeyBase58Check;
        const username = u.ProfileEntryResponse?.Username ?? u.Profile?.Username;
        if (pk && username) map.set(pk, username);
      }
    } catch {
      // ignore failed batch
    }
  }
  return map;
}

/** Get token creator public key from username. */
export async function getPublicKeyFromUsername(username: string): Promise<string> {
  const res = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username }),
  });
  if (!res.ok) throw new Error(`get-single-profile: ${res.status}`);
  const data = (await res.json()) as { Profile?: { PublicKeyBase58Check?: string } };
  const pk = data?.Profile?.PublicKeyBase58Check;
  if (!pk) throw new Error(`No profile for username: ${username}`);
  return pk;
}

/** For a token/DESO pair: lowest ASK = best sell, highest BID = best buy. */
export function getBestSell(orders: CCv2Order[]): CCv2Order | null {
  const asks = orders.filter((o) => o.OperationType === 'ASK');
  if (asks.length === 0) return null;
  return asks.reduce((a, b) =>
    a.ExchangeRateCoinsToSellPerCoinToBuy < b.ExchangeRateCoinsToSellPerCoinToBuy ? a : b
  );
}

export function getBestBuy(orders: CCv2Order[]): CCv2Order | null {
  const bids = orders.filter((o) => o.OperationType === 'BID');
  if (bids.length === 0) return null;
  return bids.reduce((a, b) =>
    a.ExchangeRateCoinsToSellPerCoinToBuy > b.ExchangeRateCoinsToSellPerCoinToBuy ? a : b
  );
}
