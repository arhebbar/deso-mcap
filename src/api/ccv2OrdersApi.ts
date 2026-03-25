/**
 * CCv2 (DeSo Tokens) Limit Order API
 * Fetches order book, user orders, and constructs create/cancel transactions.
 */

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

/**
 * How to interpret BID `Price` when converting to “quote per 1 token” for UI / sorting.
 *
 * **Why `1/P` ever?** DeSo limit orders often define `Price` as *coins bought per coin sold*.
 * For a **BID** (buy the DAO coin, **sell** quote): bought = token, sold = quote →
 * `Price ≈ (token amount) / (quote amount)` = **tokens per unit of quote**. Then
 * **quote per token** = `1 / Price`.
 *
 * **When that is wrong:** if your node’s `get-dao-coin-limit-orders` already returns the **same
 * units for BID as for ASK** (quote per token in both cases), using `1/P` **double-inverts**
 * and breaks USD, ranking, and qty heuristics. Set this to `false` after checking raw JSON.
 *
 * ASK orders always use `Price` as-is here (quote per token).
 *
 * **Default `false`:** `get-dao-coin-limit-orders` responses in practice usually expose the **same
 * price units for BID and ASK** (quote per token). Keeping `true` double-inverts BIDs and breaks
 * buy-side USD, ranking, and qty. Set `true` only if you’ve confirmed raw `Price` is tokens/quote.
 */
export const BID_PRICE_IS_TOKENS_PER_QUOTE = false;

export interface CCv2Order {
  TransactorPublicKeyBase58Check: string;
  BuyingDAOCoinCreatorPublicKeyBase58Check: string;
  SellingDAOCoinCreatorPublicKeyBase58Check: string;
  /**
   * Raw `Price` from the node (string). Meaning depends on operation; see {@link quotePerTokenForDisplay}.
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

/**
 * ## Order book: buy vs sell (all pairs: token / DESO, token / USDC, token / Focus)
 *
 * The node returns **all** open limit orders for the two-coin pair. Each order has
 * `OperationType`, `BuyingDAOCoinCreatorPublicKeyBase58Check`, `SellingDAOCoinCreatorPublicKeyBase58Check`.
 *
 * **Convention (token = DAO coin you care about; quote = DESO, dUSDC_, Focus, …):**
 *
 * - **BID (buy the token)** — user buys DAO coin, pays quote:
 *   - `OperationType === 'BID'`
 *   - `Buying` = token creator PK
 *   - `Selling` = quote creator PK (native DESO is often `''` or `"DESO"`; use {@link normalizeDaoCoinCreatorPk})
 *
 * - **ASK (sell the token)** — user sells DAO coin, receives quote:
 *   - `OperationType === 'ASK'`
 *   - `Selling` = token creator PK
 *   - `Buying` = quote creator PK
 *
 * **Filtering:** {@link filterBidsForTokenPair} / {@link filterAsksForTokenPair} require both legs on
 * {@link orderLegsAreOnPair} and `Buying`/`Selling` = token vs the other `pairKey` side (normalized PKs).
 *
 * **Sort then slice:** Full `Orders[]` → {@link filterBidsForTokenPair} / {@link filterAsksForTokenPair} → rank by
 * {@link orderBookSortKey} (bids: highest first; asks: lowest first) → slice {@link ORDER_BOOK_SIDE_DEPTH}.
 * **Display:** {@link orderBookRowDisplay} for Price / Qty / Total (quote + USD) — same units as sort.
 *
 * **Price / qty / value (UI):** **USDC / Focus** use raw `Price` × `Quantity` (Total = P×Q in quote); **DESO**
 * uses `bidNativePricePerToken` / `bidQuoteNotional` / `tokenQuantityForDisplay` (BID) and `askNativePricePerToken` (ASK).
 * USD uses `MARKET_DATA` (DESO price, 1 for USDC, Focus USD).
 */
export const ORDER_BOOK_SIDE_DEPTH = 5;

/** Native DESO may appear as empty string, `"DESO"`, or `"deso"` in API fields — compare using this. */
export function normalizeDaoCoinCreatorPk(pk: string | undefined | null): string {
  const p = (pk ?? '').trim();
  if (p === '' || p.toUpperCase() === 'DESO') return 'DESO';
  return p;
}

/**
 * The **other** creator PK in a canonical `pairKey` (`sideA/sideB` sorted), given one side (the token).
 * Matches how the chain pairs coins — avoids mismatches when `quoteCreator` from username resolution ≠ API `Selling`/`Buying` PK strings.
 */
export function partnerCreatorPkFromPairKey(pairKey: string, tokenCreatorPk: string): string {
  const [a, b] = pairKey.split('/');
  const nt = normalizeDaoCoinCreatorPk(tokenCreatorPk);
  if (normalizeDaoCoinCreatorPk(a) === nt) return b;
  if (normalizeDaoCoinCreatorPk(b) === nt) return a;
  return '';
}

/**
 * Canonical `pairKey` = sorted buying/selling legs (same as transactor orders and `get-dao-coin-limit-orders`).
 * Always use this instead of ad-hoc `[a,b].sort()` so `''`, `deso`, `DESO` match {@link orderLegsAreOnPair}.
 */
export function canonicalPairKeyFromOrder(o: CCv2Order): string {
  const a = normalizeDaoCoinCreatorPk(o.BuyingDAOCoinCreatorPublicKeyBase58Check);
  const b = normalizeDaoCoinCreatorPk(o.SellingDAOCoinCreatorPublicKeyBase58Check);
  return [a, b].sort((x, y) => x.localeCompare(y)).join('/');
}

/** Both order legs are the two coins in `pairKey` (normalized). */
export function orderLegsAreOnPair(o: CCv2Order, pairKey: string): boolean {
  const [a, b] = pairKey.split('/');
  const na = normalizeDaoCoinCreatorPk(a);
  const nb = normalizeDaoCoinCreatorPk(b);
  const buy = normalizeDaoCoinCreatorPk(o.BuyingDAOCoinCreatorPublicKeyBase58Check);
  const sell = normalizeDaoCoinCreatorPk(o.SellingDAOCoinCreatorPublicKeyBase58Check);
  const inPair = (x: string) => x === na || x === nb;
  return inPair(buy) && inPair(sell);
}

/** BID that buys `tokenCreatorPk` (other `pairKey` leg is quote). */
export function isBidForTokenPair(o: CCv2Order, pairKey: string, tokenCreatorPk: string): boolean {
  if (o.OperationType !== 'BID') return false;
  if (!orderLegsAreOnPair(o, pairKey)) return false;
  return (
    normalizeDaoCoinCreatorPk(o.BuyingDAOCoinCreatorPublicKeyBase58Check) === normalizeDaoCoinCreatorPk(tokenCreatorPk)
  );
}

/** ASK that sells `tokenCreatorPk` (other `pairKey` leg is quote). */
export function isAskForTokenPair(o: CCv2Order, pairKey: string, tokenCreatorPk: string): boolean {
  if (o.OperationType !== 'ASK') return false;
  if (!orderLegsAreOnPair(o, pairKey)) return false;
  return (
    normalizeDaoCoinCreatorPk(o.SellingDAOCoinCreatorPublicKeyBase58Check) === normalizeDaoCoinCreatorPk(tokenCreatorPk)
  );
}

/** All BIDs that buy the token: full book → filter → sort by {@link canonicalPricePerToken} desc → top N. */
export function filterBidsForTokenPair(book: CCv2Order[], pairKey: string, tokenCreatorPk: string): CCv2Order[] {
  return book.filter((o) => isBidForTokenPair(o, pairKey, tokenCreatorPk));
}

/** All ASKs that sell the token: full book → filter → sort by {@link canonicalPricePerToken} asc → top N. */
export function filterAsksForTokenPair(book: CCv2Order[], pairKey: string, tokenCreatorPk: string): CCv2Order[] {
  return book.filter((o) => isAskForTokenPair(o, pairKey, tokenCreatorPk));
}

/**
 * Resolve which side of a canonical `pairKey` is the **traded token** vs **quote** (DESO, dUSDC_, Focus).
 * `pairKey` is `[buying, selling].sort().join('/')` from orders — **do not** assume lexicographic order is token/quote.
 * Used for `fetchOrderBook(tokenPk, quotePk)` and filter legs. Returns `null` until usernames can identify
 * Focus/dUSDC (same rules as the Orders UI row parser).
 */
export type ResolvedPairOrientation = {
  tokenPk: string;
  /** `''` when quote is native DESO (matches `fetchOrderBook` second arg). */
  quotePk: string;
  quoteLabel: 'DESO' | 'USDC' | 'Focus';
};

export function resolvePairOrientation(
  pairKey: string,
  usernameMap: Map<string, string>
): ResolvedPairOrientation | null {
  const [sideA, sideB] = pairKey.split('/');
  const nameA = sideA === 'DESO' ? 'DESO' : (usernameMap.get(sideA) ?? sideA);
  const nameB = sideB === 'DESO' ? 'DESO' : (usernameMap.get(sideB) ?? sideB);
  const lowerA = sideA === 'DESO' ? 'deso' : String(nameA).toLowerCase();
  const lowerB = sideB === 'DESO' ? 'deso' : String(nameB).toLowerCase();

  if (sideA === 'DESO' || sideB === 'DESO') {
    return {
      tokenPk: sideA === 'DESO' ? sideB : sideA,
      quotePk: '',
      quoteLabel: 'DESO',
    };
  }
  if (lowerA === 'focus' || lowerB === 'focus') {
    const focusIsA = lowerA === 'focus';
    return {
      tokenPk: focusIsA ? sideB : sideA,
      quotePk: focusIsA ? sideA : sideB,
      quoteLabel: 'Focus',
    };
  }
  if (lowerA === 'dusdc_' || lowerA === 'dusdc' || lowerB === 'dusdc_' || lowerB === 'dusdc') {
    const dusdcIsA = lowerA === 'dusdc_' || lowerA === 'dusdc';
    return {
      tokenPk: dusdcIsA ? sideB : sideA,
      quotePk: dusdcIsA ? sideA : sideB,
      quoteLabel: 'USDC',
    };
  }
  return null;
}

export interface TransactorOrdersResponse {
  Orders?: CCv2Order[];
}

export interface CCv2UserProfileMeta {
  username: string;
  /** DeSo returns profile pic URLs inside ProfileEntryResponse.ExtraData. */
  largeProfilePicUrl?: string;
}

/**
 * Get all open orders for a token pair.
 * Pass **(token creator, quote creator)** with `quoteCreator === ''` for native DESO.
 * `DAOCoin1/2` are sent in **lexicographic order** so they match `pairKey` = `[sideA, sideB].sort().join('/')`
 * (same convention as transactor orders).
 */
export async function fetchOrderBook(
  tokenCreator: string,
  quoteCreator: string = 'DESO'
): Promise<CCv2Order[]> {
  const a = (tokenCreator ?? '').trim() || 'DESO';
  const b = (quoteCreator ?? '').trim() || 'DESO';
  const [coin1, coin2] = a.localeCompare(b) <= 0 ? [a, b] : [b, a];
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

/**
 * Quote per 1 token from `Price` (fallback when {@link ExchangeRateCoinsToSellPerCoinToBuy} not used).
 * ASK: `Number(Price)`. BID: `1/Price` only if {@link BID_PRICE_IS_TOKENS_PER_QUOTE}; else `Number(Price)`.
 */
export function quotePerTokenForDisplay(o: CCv2Order): number {
  const p = Number(o.Price);
  if (!isFinite(p) || p <= 0) return 0;
  if (o.OperationType === 'BID' && BID_PRICE_IS_TOKENS_PER_QUOTE) return 1 / p;
  return p;
}

/**
 * Quote assets where BID price/qty prefer `ExchangeRateCoinsToSellPerCoinToBuy`.
 * **USDC** and **Focus** use raw `Price` × `Quantity` in the UI (Total = Price × Qty in quote) — not this set.
 */
const BID_USE_EXCHANGE_RATE: ReadonlySet<string> = new Set(['DESO']);

function bidExchangeRate(o: CCv2Order, quoteLabel: string): number | null {
  if (o.OperationType !== 'BID' || !BID_USE_EXCHANGE_RATE.has(quoteLabel)) return null;
  const r = o.ExchangeRateCoinsToSellPerCoinToBuy;
  if (isFinite(r) && r > 0) return r;
  return null;
}

/**
 * Sort/rank key for **DESO** CCv2 pairs — matches `scripts/ccv2-order-undercut.mjs` and node semantics:
 * - **ASK:** lower `ExchangeRateCoinsToSellPerCoinToBuy` = better sell (best asks first when sorted ascending).
 * - **BID:** higher = better buy (best bids first when sorted descending).
 * Prefer raw `ExchangeRateCoinsToSellPerCoinToBuy`, then `Price` — avoids mixing units with {@link quotePerTokenForDisplay}.
 */
export function desoOrderBookSortKey(o: CCv2Order): number {
  const xr = o.ExchangeRateCoinsToSellPerCoinToBuy;
  if (isFinite(xr) && xr > 0) return xr;
  const p = Number(o.Price);
  if (isFinite(p) && p > 0) return p;
  return o.OperationType === 'ASK' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
}

/**
 * Quote per token for **buy** rows when exchange rate applies (**DESO** only). USDC/Focus use `Price` in UI.
 */
export function quoteUsdBasisPerToken(o: CCv2Order, quoteLabel: string): number {
  const r = bidExchangeRate(o, quoteLabel);
  if (r != null) return r;
  return quotePerTokenForDisplay(o);
}

/**
 * Single “quote per 1 token” for **sorting** and **display** (with {@link bidNativePricePerToken} /
 * {@link askNativePricePerToken}).
 * **DESO:** delegates to {@link desoOrderBookSortKey} (chain `ExchangeRate` / `Price` — same units as undercut script).
 * **USDC/Focus:** `Price` first when valid, then exchange rate / fallbacks.
 */
export function canonicalPricePerToken(o: CCv2Order, quoteLabel: string): number {
  if (quoteLabel === 'DESO') {
    return desoOrderBookSortKey(o);
  }

  if (o.OperationType === 'BID') {
    if (quoteLabel === 'USDC' || quoteLabel === 'Focus') {
      const p = Number(o.Price);
      if (isFinite(p) && p > 0) return p;
    }
    const r = bidExchangeRate(o, quoteLabel);
    if (r != null) return r;
    return quoteUsdBasisPerToken(o, quoteLabel);
  }

  if (quoteLabel === 'USDC' || quoteLabel === 'Focus') {
    const p = Number(o.Price);
    if (isFinite(p) && p > 0) return p;
  }
  const xr = o.ExchangeRateCoinsToSellPerCoinToBuy;
  if (isFinite(xr) && xr > 0) return xr;
  return quotePerTokenForDisplay(o);
}

/** Same numeric key as {@link canonicalPricePerToken} — use for sorts when you already have `quoteLabel`. */
export function orderBookSortKey(o: CCv2Order, quoteLabel: string): number {
  return canonicalPricePerToken(o, quoteLabel);
}

/**
 * **BID** native price per 1 token in quote units: **USDC / Focus** = raw `Price` (quote per token); **DESO** = exchange rate or `Price`.
 */
export function bidNativePricePerToken(o: CCv2Order, quoteLabel: string): number {
  if (o.OperationType !== 'BID') return quotePerTokenForDisplay(o);
  return canonicalPricePerToken(o, quoteLabel);
}

/**
 * Rank **BID** orders: same units as {@link canonicalPricePerToken} (higher = better bid / top of book).
 */
export function bidSortMetric(o: CCv2Order, quoteLabel: string): number {
  if (o.OperationType !== 'BID') return 0;
  return canonicalPricePerToken(o, quoteLabel);
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
 * Token amount for UI. ASK: raw `Quantity` / `QuantityToFill` is token qty.
 *
 * **BID + DESO / USDC / Focus:** `QuantityToFill` is quote notional (DESO / USDC / Focus);
 * `tokens = QuantityToFill / ExchangeRateCoinsToSellPerCoinToBuy` when rate is present.
 * Else legacy `Price` paths when {@link BID_PRICE_IS_TOKENS_PER_QUOTE} or `Price` fallback.
 */
export function tokenQuantityForDisplay(o: CCv2Order, quoteLabel: string): number {
  const q = orderQuantityRaw(o);
  if (o.OperationType !== 'BID') return q;

  const r = bidExchangeRate(o, quoteLabel);
  if (r != null) {
    return q / r;
  }

  const p = Number(o.Price);
  if (!isFinite(p) || p <= 0) return q;

  if (BID_PRICE_IS_TOKENS_PER_QUOTE) {
    if (quoteLabel === 'Focus') {
      return q * p;
    }
    return q;
  }

  if (quoteLabel === 'DESO' || quoteLabel === 'Focus' || quoteLabel === 'USDC') {
    return q / p;
  }
  return q;
}

/**
 * **Single source** for order-book table cells: token qty, quote/token, total quote (native units).
 * USD = multiply quote amounts by `MARKET_DATA` price for that quote asset in the UI.
 */
export type OrderBookRowDisplay = {
  tokenQuantity: number;
  quotePerToken: number;
  /** Notional in quote asset (DESO / USDC / Focus — not USD). */
  totalQuote: number;
};

export function orderBookRowDisplay(
  o: CCv2Order,
  quoteLabel: 'DESO' | 'USDC' | 'Focus',
  side: 'bid' | 'ask'
): OrderBookRowDisplay {
  const quotePerToken =
    side === 'bid' ? bidNativePricePerToken(o, quoteLabel) : askNativePricePerToken(o, quoteLabel);

  if (side === 'bid') {
    const totalQuote = bidQuoteNotional(o);
    const tokenQuantity = tokenQuantityForDisplay(o, quoteLabel);
    return { tokenQuantity, quotePerToken, totalQuote };
  }

  const tokenQuantity = tokenQuantityForDisplay(o, quoteLabel);
  const totalQuote = tokenQuantity * quotePerToken;
  return { tokenQuantity, quotePerToken, totalQuote };
}

/**
 * **ASK** native quote per 1 token. **USDC / Focus:** raw `Price` first (Focus per token sold); else exchange rate / `Price`.
 */
export function askNativePricePerToken(o: CCv2Order, quoteLabel?: string): number {
  if (o.OperationType !== 'ASK') return quotePerTokenForDisplay(o);
  if (!quoteLabel) {
    const r = o.ExchangeRateCoinsToSellPerCoinToBuy;
    if (isFinite(r) && r > 0) return r;
    return quotePerTokenForDisplay(o);
  }
  return canonicalPricePerToken(o, quoteLabel);
}

/** BID notional in quote asset: `QuantityToFill` / `Quantity` (US$ for USDC, DESO for DESO pair, …). */
export function bidQuoteNotional(o: CCv2Order): number {
  return orderQuantityRaw(o);
}

/**
 * **BID** # of tokens = Total (quote notional) / Price (quote per token), when exchange-rate path applies.
 * Matches {@link tokenQuantityForDisplay} for supported quotes.
 */
export function bidTokenAmountFromTotalOverPrice(o: CCv2Order, quoteLabel: string): number {
  return tokenQuantityForDisplay(o, quoteLabel);
}

/** Best ASK = minimum {@link canonicalPricePerToken} for this `quoteLabel` (default DESO). */
export function getBestSell(orders: CCv2Order[], quoteLabel: string = 'DESO'): CCv2Order | null {
  const asks = orders.filter((o) => o.OperationType === 'ASK');
  if (asks.length === 0) return null;
  return asks.reduce((a, b) =>
    canonicalPricePerToken(a, quoteLabel) <= canonicalPricePerToken(b, quoteLabel) ? a : b
  );
}

/** Best BID = highest {@link canonicalPricePerToken} for this `quoteLabel`. */
export function getBestBuy(orders: CCv2Order[], quoteLabel: string): CCv2Order | null {
  const bids = orders.filter((o) => o.OperationType === 'BID');
  if (bids.length === 0) return null;
  return bids.reduce((a, b) =>
    canonicalPricePerToken(a, quoteLabel) >= canonicalPricePerToken(b, quoteLabel) ? a : b
  );
}
