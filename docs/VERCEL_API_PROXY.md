# Vercel API proxy (rewrites)

The app calls external APIs via same-origin paths (e.g. `/api/deso`, `/api/coingecko`) so that Vercel rewrites in `vercel.json` proxy those requests to the real backends. This avoids CORS and keeps keys (if any) on the server.

## 404 on `/api/deso`, `/api/deso-hodlers`, `/api/coingecko`, etc.

- Rewrites in `vercel.json` use the **`:path*`** wildcard (Vercel’s documented catch-all). If you see 404s, confirm `vercel.json` is at the project root and deployed with the build.
- After changing `vercel.json`, redeploy (push to `main` or trigger a new deployment) so the new config is applied.

## 403 Forbidden

- **CoinGecko** (`/api/coingecko/*`): The free API often returns 403 for server-side or high-volume requests. The app already treats 403 as “no data” for historical charts and uses CryptoCompare + DeSo for live prices in production.
- **Solana RPC** (`/api/sol-rpc`): If the proxy (e.g. Ankr) returns 403, the app automatically tries a fallback public RPC. You can set **`VITE_SOL_RPC_URL`** in Vercel (or `.env`) to use your own RPC URL instead of the default fallback.
- **DeSo / hodlers**: If you get 403 from the proxied DeSo endpoints, the upstream (node.deso.org / blockproducer.deso.org) may be rate-limiting; the app will show empty or fallback data.

## Summary of rewrites

| Path | Proxied to |
|------|------------|
| `/api/deso/*` | https://node.deso.org/api/v0/* |
| `/api/deso-hodlers/*` | https://blockproducer.deso.org/api/v0/* |
| `/api/coingecko/*` | https://api.coingecko.com/api/v3/* |
| `/api/sol-rpc` | https://rpc.ankr.com/solana (with fallback on 403) |
| `/api/cryptocompare/*` | https://min-api.cryptocompare.com/* |
| `/api/mempool/*` | https://mempool.space/api/* |
| `/api/eth-rpc` | https://eth.llamarpc.com |
| `/api/deso-graphql` | https://graphql-prod.deso.com/graphql |
