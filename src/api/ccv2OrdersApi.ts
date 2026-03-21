/**
 * CCv2 (DeSo Tokens) Limit Order API
 * Fetches order book, user orders, and constructs create/cancel transactions.
 */

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

export interface CCv2Order {
  TransactorPublicKeyBase58Check: string;
  BuyingDAOCoinCreatorPublicKeyBase58Check: string;
  SellingDAOCoinCreatorPublicKeyBase58Check: string;
  /**
   * Raw limit price from the node (string). ASK: Price ≈ quote per token.
   * BID: Price = token per quote → use quotePerTokenForDisplay() for USD/sorting.
   */
  Price: string;
  ExchangeRateCoinsToSellPerCoinToBuy: number;
  /** Quantity from API (string). QuantityToFill is typically the parsed numeric value. */
  Quantity?: string;
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

export interface CCv2UserProfileMeta {
  username: string;
  /** DeSo returns profile pic URLs inside ProfileEntryResponse.ExtraData. */
  largeProfilePicUrl?: string;
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

/** Resolve public keys to { username, largeProfilePicUrl } for UI avatars. */
export async function fetchUserProfilesForPks(
  pks: string[]
): Promise<Map<string, CCv2UserProfileMeta>> {
  const map = new Map<string, CCv2UserProfileMeta>();
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
          SkipForLeaderboard: false,
          IncludeBalance: false,
        }),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        UserList?: Array<{
          PublicKeyBase58Check?: string;
          ProfileEntryResponse?: { Username?: string; ExtraData?: Record<string, unknown> };
          Profile?: { Username?: string; ExtraData?: Record<string, unknown> };
        }>;
      };

      for (const u of data.UserList ?? []) {
        const pk = u.PublicKeyBase58Check;
        const username = u.ProfileEntryResponse?.Username ?? u.Profile?.Username;
        if (!pk || !username) continue;

        const extra =
          u.ProfileEntryResponse?.ExtraData ?? u.Profile?.ExtraData ?? ({} as Record<string, unknown>);
        const largeProfilePicUrl = (extra['LargeProfilePicURL'] as string | undefined) ?? undefined;

        map.set(pk, { username, largeProfilePicUrl });
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

/** Quote asset per 1 token: ASK uses Price; BID uses 1/Price (coins bought ÷ coins sold). */
export function quotePerTokenForDisplay(o: CCv2Order): number {
  const p = Number(o.Price);
  if (!isFinite(p) || p <= 0) return 0;
  if (o.OperationType === 'BID') return 1 / p;
  return p;
}

/** Prefer parsed Quantity string when present (some responses only populate Quantity). */
export function orderQuantityRaw(o: CCv2Order): number {
  if (o.Quantity != null && String(o.Quantity).trim() !== '') {
    const n = Number(o.Quantity);
    if (isFinite(n)) return n;
  }
  return o.QuantityToFill;
}

/**
 * Token amount for UI: ASK = token qty from API.
 * BID on token/Focus: node often reports quote (Focus) to spend; token qty ≈ quote × Price
 * (Price = tokens bought per Focus sold).
 */
export function tokenQuantityForDisplay(o: CCv2Order, quoteLabel: string): number {
  const q = orderQuantityRaw(o);
  if (o.OperationType !== 'BID') return q;
  if (quoteLabel !== 'Focus') return q;
  const p = Number(o.Price);
  if (!isFinite(p) || p <= 0) return q;
  return q * p;
}

/** Best ASK = minimum Price (lowest ask). */
export function getBestSell(orders: CCv2Order[]): CCv2Order | null {
  const asks = orders.filter((o) => o.OperationType === 'ASK');
  if (asks.length === 0) return null;
  return asks.reduce((a, b) => {
    const aPrice = Number(a.Price);
    const bPrice = Number(b.Price);
    return aPrice <= bPrice ? a : b;
  });
}

/** Best BID = highest quote per token (max of 1/Price among BIDs). */
export function getBestBuy(orders: CCv2Order[]): CCv2Order | null {
  const bids = orders.filter((o) => o.OperationType === 'BID');
  if (bids.length === 0) return null;
  return bids.reduce((a, b) => {
    const aQ = quotePerTokenForDisplay(a);
    const bQ = quotePerTokenForDisplay(b);
    return aQ >= bQ ? a : b;
  });
}
