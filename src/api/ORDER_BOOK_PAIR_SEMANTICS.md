# CCv2 order book: filter + sort + display

This document matches the implementation in `ccv2OrdersApi.ts` and `pages/Orders.tsx`.

## Pair key vs token vs quote (common bug source)

- `pairKey` is `[buying, selling].sort().join('/')` — **lexicographic** order of the two creator PKs, **not** “token first”.
- **Do not** infer token vs quote from whether a side is `a` or `b` after the split.
- Use **`resolvePairOrientation(pairKey, usernameMap)`** so DESO / Focus / dUSDC\_ are detected by username (same rules as the main table).
- **`fetchOrderBook`** sends `DAOCoin1` / `DAOCoin2` in **sorted** PK order so the request matches `pairKey` and the node’s pair indexing.

## Pipeline (every pair)

1. **Fetch** `get-dao-coin-limit-orders` → full `Orders[]` for `(tokenCreator, quoteCreator)`.
2. **Split** into bids vs asks **for the token** using `OperationType` **and** both legs on the pair (see below). DESO uses `normalizeDaoCoinCreatorPk` (`''` and `"DESO"` compare equal).
3. **Sort** using **`canonicalPricePerToken(order, quoteLabel)`** (same units for every row type):
   - **Bids:** descending (highest price first = best bids).
   - **Asks:** ascending (lowest price first = best asks).
4. **Slice** top `ORDER_BOOK_SIDE_DEPTH` (default **5**) per side for the UI.
5. **Row details:** Table uses `bidNativePricePerToken` / `askNativePricePerToken` (wrappers around `canonicalPricePerToken`) plus qty helpers — see API JSDoc.

## Buy side (bids — “buy the DAO coin”)

| Check | Meaning |
|--------|--------|
| `OperationType === 'BID'` | Limit buy of the token |
| `BuyingDAOCoinCreatorPublicKeyBase58Check` | **Token** creator PK |
| `SellingDAOCoinCreatorPublicKeyBase58Check` | **Other** coin in `pairKey` (quote) |

Both `Buying` and `Selling` must appear in `pairKey.split('/')` — see **`orderLegsAreOnPair(o, pairKey)`** and **`isBidForTokenPair`**.

Function: `filterBidsForTokenPair(book, pairKey, tokenCreatorPk)`.

## Sell side (asks — “sell the DAO coin”)

| Check | Meaning |
|--------|--------|
| `OperationType === 'ASK'` | Limit sell of the token |
| `SellingDAOCoinCreatorPublicKeyBase58Check` | **Token** creator PK |
| `BuyingDAOCoinCreatorPublicKeyBase58Check` | **Other** coin in `pairKey` (quote) |

Function: `filterAsksForTokenPair(book, pairKey, tokenCreatorPk)` → `isAskForTokenPair`.

## USDC (dUSDC\_) — UI columns

- **Price** = `canonicalPricePerToken` (usually raw `Price`; fallback if node omits it). **Qty** = `Quantity` / `QuantityToFill`. **Total (USD)** = Price × Qty × 1.
- Sorting uses `canonicalPricePerToken` for USDC bids/asks.

## Focus — UI columns (e.g. DeSoOps/Focus)

- **Qty** = `Quantity` (token amount to buy/sell). **Price** = `canonicalPricePerToken`. **Total (Focus)** = Price × Qty.
- **Price ($)** = Price (Focus) × Focus USD; **Total ($)** = Total (Focus) × Focus USD.
- Sorting uses `canonicalPricePerToken` so asks sort **lowest price first** (best asks).

## “At top” classification (user’s order vs book)

Uses the **same** filtered lists: `getBestBuy(filterBidsForTokenPair(...), quoteLabel)` and `getBestSell(filterAsksForTokenPair(...))`, not the raw book.

## Pairs (DESO / USDC / Focus)

The **same** buy/sell leg rules apply. Only `quoteLabel` and `quoteCreator` (for `fetchOrderBook`) change (and USD multipliers in `MARKET_DATA`). Unsupported quote pairs are skipped earlier in the UI.
