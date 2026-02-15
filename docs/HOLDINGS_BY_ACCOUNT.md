# Token Holdings by Account (from API diagnostic)

## Accounts with Openfund, Focus, dUSDC, dBTC, dETH, dSOL

**Note:** dBTC, dETH, dSOL returned 0 holders in the diagnostic – creator usernames may differ.

### Summary: Which shared accounts hold each token?

| Token   | Accounts with holdings |
|---------|-------------------------|
| Openfund | Gringotts, Deso, Whoami, Nader, Mossified, LazyNina, **Randhir**, JordanLintz, StarGeezer, RobertGraham, 0xAustin, Darian_Parrish, fllwthrvr, PremierNS, WhaleDShark, AMM wallets |
| Focus   | Gringotts, focus, openfund, Whoami, Nader, Mossified, LazyNina, **Randhir**, HighKey, JordanLintz, LukeLintz, StarGeezer, DesocialWorld, Edokoevoet, Gabrielist, RobertGraham, 0xAustin, Darian_Parrish, VishalGulia, ZeroToOne, fllwthrvr, WhaleDShark, AMM |
| dUSDC   | Gringotts, focus, openfund, Whoami, Nader, Mossified, LazyNina, StarGeezer, DesocialWorld, Gabrielist, RobertGraham, 0xAustin, Darian_Parrish, ZeroToOne, fllwthrvr, WhaleDShark, AMM |
| dBTC    | 0 holders in first 20 pages (username may differ) |
| dETH    | 0 holders in first 20 pages (username may differ) |
| dSOL    | 0 holders in first 20 pages (username may differ) |

### Openfund
Gringotts_Wizarding_Bank, Deso, Whoami, Nader, Mossified, LazyNina, **Randhir**, JordanLintz, StarGeezer, RobertGraham, 0xAustin, Darian_Parrish, fllwthrvr, PremierNS, WhaleDShark, AMM_openfund_12_gOR1b, AMM_openfund_13_1gbih

### Focus
Gringotts_Wizarding_Bank, focus, openfund, Whoami, Nader, Mossified, LazyNina, **Randhir**, HighKey, JordanLintz, LukeLintz, StarGeezer, DesocialWorld, Edokoevoet, Gabrielist, RobertGraham, 0xAustin, Darian_Parrish, VishalGulia, ZeroToOne, fllwthrvr, WhaleDShark, AMM_focus_12_nzWku

### dUSDC
Gringotts_Wizarding_Bank, focus, openfund, AMM_DESO_24_PlAEU, AMM_DESO_23_GrYpe, Whoami, Nader, Mossified, LazyNina, StarGeezer, DesocialWorld, Gabrielist, RobertGraham, 0xAustin, Darian_Parrish, ZeroToOne, fllwthrvr, WhaleDShark

### DeSo Bulls with holdings (API confirms)
- **Randhir**: Openfund 440.8K, Focus 57.7M
- HighKey: Focus 2.2B
- JordanLintz: Openfund 544.5K, Focus 201M
- LukeLintz: Focus 230M
- StarGeezer: Openfund 2, dUSDC 11
- DesocialWorld: Focus 16.3M, dUSDC 2
- Edokoevoet: Focus 225K
- Gabrielist: Focus 37.7K, dUSDC 6.1K
- RobertGraham: Openfund 131.8K, Focus 42.8K, dUSDC 21
- 0xAustin: Openfund 272.5K, Focus 7.7M, dUSDC 1
- Darian_Parrish: Openfund 621, Focus 1.7M, dUSDC 89
- VishalGulia: Focus 217M
- ZeroToOne: Focus 128.9M, dUSDC 1
- fllwthrvr: Openfund 4.4K, Focus 1.6M, dUSDC 2
- PremierNS: Openfund 3.5M
- WhaleDShark: Openfund 52K, Focus 33.5M, dUSDC 1.1K

### DeSo Bulls with NONE (not in first 20 pages)
- BenErsing, anku

---

## Why DeSo Bulls show zero in the UI

The diagnostic script (Node) confirms the API returns data for DeSo Bulls. When the app runs in the browser, these can cause zeros:

1. **CORS / proxy** – In dev we use a Vite proxy (`/deso-hodlers` → blockproducer). If the proxy fails or the dev server wasn’t restarted after adding it, hodler fetches fail and no token data is returned.
2. **Profile lookup failures** – 35 sequential `get-single-profile` calls can hit rate limits or timeouts. If Randhir’s profile lookup fails, he’s never added to `trackedByPk`, so his hodler balances are ignored.
3. **Stale cache** – If the API previously failed, the cache may be empty and we fall back to static data. DeSo Bulls have no static balances, so they show zero.

### What to try

1. **Restart the dev server** – `npm run dev` (or stop and start again) so the proxy is active.
2. **Clear localStorage** – In DevTools → Application → Local Storage, remove `deso-wallet-cache`.
3. **Check the Network tab** – Look for failed requests to `/deso-hodlers/get-hodlers-for-public-key` or `/deso-api/get-single-profile`.
