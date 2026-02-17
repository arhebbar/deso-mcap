# Code Audit: Issues, Cleanups & API Optimization Plan

## 1. Issues Addressed (Fixed in This Pass)

### 1.1 Dead code
- **useWalletData.ts**: Removed a `useEffect` that only contained commented-out `console.table` / `console.log` (debug leftover). Replaced with a proper effect that persists live wallet data to cache.

### 1.2 Side effects during render
- **useWalletData.ts**: `setWalletCache(wallets)` was called during render when `hasMeaningfulData` was true. Cache write is now done in a `useEffect` that runs when `dataSource === 'live'` and `wallets` change.
- **useTreasuryData.ts (useTreasuryAddresses)**: `setTreasuryCache(addresses)` was called during render when `hasMeaningfulData` was true. Cache write is now in a `useEffect` when `isLive && addresses.length > 0`.

### 1.3 Duplicate API calls
- **historicalApi.ts + useHistoricalData.ts**: When the dashboard and TrendCharts were both mounted, `fetchHistoricalData` called `fetchWalletBalances()`, `fetchTreasuryBalances()`, and `fetchLivePrices()` directly, so the same data was fetched again even if already loaded by React Query. **Fix**: `fetchHistoricalData(days, queryClient?)` now accepts an optional React Query client and uses `ensureQueryData` for `['wallet-balances']`, `['treasury-balances']`, and `['live-prices']`, so cached data is reused and duplicate network calls are avoided.

### 1.4 Type consistency
- **useWalletData.ts**: `mergeWithStatic` return type and `usdValue` handling were aligned with `WalletData` so that live and cached paths type-check correctly.
- **desoData.ts**: `WalletData` interface extended with optional `stakedByValidator` so API-derived wallet shape matches static/cache shape.

---

## 2. Remaining / Known Issues (No Output Compromise) — FIXED

- **useLiveData**: **Fixed:** Single `['live-prices']` query only; removed `deso-exchange-rate` query. No duplicate get-exchange-rate.
- **priceApi.ts**: On CoinGecko failure, fallback does four sequential-ish fetches (CryptoCompare BTC, ETH, SOL, and DeSo get-exchange-rate). Could be parallelized or folded into a single “prices” endpoint if you add a backend.
- **CCv1 cache**: When cache is expired, `getCCv1NetworkCache()` returns `null`, so the UI has no placeholder until the refetch completes. Optional improvement: expose a “stale” cache for display only while refetching.

---

## 3. Unused Code / Scripts (Review Only)

- Many scripts under `scripts/` are one-off or diagnostic (e.g. `check-randhir-*.mjs`, `debug-*.mjs`, `test-*.mjs`). They are not part of the app bundle. Consider moving to a `scripts/archive/` or deleting if no longer needed; no impact on app output.
- **walletApi.ts**: `runBatched`, `fetchStakedByPublicKey`, `fetchUsernamesForPks` are used only internally; no unused exports.

---

## 4. Inefficiencies (Non-Critical) — FIXED

- **useWalletData**: **Fixed:** `staticByName` and derived arrays (`ammWallets`, `foundationWallets`, `desoBullsWallets`) and sums are memoized with `useMemo`.
- **useTreasuryAddresses**: **Fixed:** `staticByName` is memoized with `useMemo`.
- **fetchWalletBalances**: **Fixed:** All 6 token-holder fetches now run in parallel via `Promise.all(TOKEN_USERNAMES.map(...))`.
- **fetchAllStakedDeso**: Fetches profiles for all WALLET_CONFIG in batches of 5; already batched. Two large unfiltered stake GraphQL calls run in parallel; acceptable.

---

## 5. API Optimization Plan (Make the App Super Fast)

### 5.1 Already in place
- React Query for all main data (wallet, treasury, prices, historical, CCv1, staked DESO) with `staleTime` and `retry`.
- Cache-first UI: tables/treasury show cached data while loading; KPIs and charts show fallback data when possible.
- Historical trends reuse wallet/treasury/live-prices via `queryClient.ensureQueryData` when `queryClient` is passed into `fetchHistoricalData`.
- localStorage caches for wallet, treasury, and CCv1 network total.

### 5.2 High impact (recommended next)

1. **Unify price fetching**
   - Single “prices” query that tries CoinGecko first, then fallback (CryptoCompare + DeSo get-exchange-rate).
   - Remove the separate `deso-exchange-rate` query from `useLiveData` and consume the unified prices query only. This removes duplicate `get-exchange-rate` calls and simplifies loading state.

2. **Parallelize token-holder fetches**
   - In `fetchWalletBalances`, run `fetchTokenHolders` for the 6 tokens in parallel (e.g. `Promise.all` or 2–3 concurrent). Right now they run one after another; parallelization can cut wallet load time noticeably.

3. **Prefetch on route / hover**
   - On dashboard mount, prefetch historical data for the default range (e.g. 30d) in the background: `queryClient.prefetchQuery({ queryKey: ['historical-data', 30] })`.
   - Optionally prefetch on hover over the “Historical Trends” section or its tab so the chart is ready when the user focuses it.

4. **Stale-while-revalidate for CCv1**
   - When CCv1 cache is expired, still return the last cached value for display (`getCCv1NetworkCache` or a new `getCCv1StaleCache`) and refetch in the background. Avoids showing “empty” until the long-running GraphQL call finishes.

### 5.3 Medium impact

5. **Backend proxy / aggregator (optional)**
   - Single endpoint that returns wallet + treasury + prices (and optionally historical summary) so the client makes one call per “dashboard load” instead of several. Requires a small server or serverless function.

6. **Smaller initial payload for wallet**
   - If the UI can show “Foundation + AMM + Founder” first and load “DeSo Bulls” later, split the wallet fetch into two queries (e.g. `wallet-balances-core` and `wallet-balances-bulls`) and render core tables as soon as the first resolves.

7. **GraphQL / batch for DeSo**
   - Where possible, batch multiple DeSo/GraphQL operations in one request (if the API supports it) to reduce round-trips.

### 5.4 Low priority / polish

8. **Memoize derived data in hooks**
   - `useMemo` for `staticByName`, `ammWallets`, `foundationWallets`, etc., in `useWalletData` and for `staticByName` in `useTreasuryAddresses` if profiling shows render cost.

9. **Service worker + cache**
   - Cache static assets and optionally cache GET (or idempotent) API responses with a short TTL to improve repeat visits.

10. **Skeleton / loading consistency**
    - Ensure every table and chart uses the same pattern: show cached/placeholder data when available, skeleton only when `isLoading && !hasDataToShow`.

---

## 6. Summary

- **Done**: Removed dead code, moved cache writes out of render into `useEffect`, deduped historical fetches via React Query, and aligned types for wallet/merge logic. Output and behavior are unchanged; code is cleaner and avoids duplicate API calls when dashboard and trends are both used.
- **Next steps for “super fast”**: Unify price fetching, parallelize token-holder fetches, prefetch historical data, and add stale-while-revalidate for CCv1. Optional: backend aggregator and split wallet fetch for faster first paint.
