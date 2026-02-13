# Openfund Holdings Summary

> **API:** The app tries `get-hodlings-for-public-key` for Openfund (returns all tokens including DEX-held). If that endpoint is unavailable (404 on node.deso.org), we use `get-users-stateless` + static fallback. Openfund public key: `BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY`

## Current Static Values (desoData.ts)

| Account | Class | Openfund | Source |
|---------|-------|----------|--------|
| Gringotts_Wizarding_Bank | FOUNDATION | 4,000,000 | static |
| focus | FOUNDATION | 1,500,000 | static |
| openfund | FOUNDATION | 8,000,000 | static |
| Deso | FOUNDATION | 2,000,000 | static |
| AMM_DESO_24_PlAEU | AMM | 0 | (DESO/dUSDC pool) |
| AMM_DESO_23_GrYpe | AMM | 0 | (DESO pool) |
| AMM_focus_12_nzWku | AMM | 0 | (Focus pool) |
| AMM_openfund_12_gOR1b | AMM | 5,046,000 | liquidity pool |
| AMM_DESO_19_W5vn0 | AMM | 0 | (DESO pool) |
| AMM_openfund_13_1gbih | AMM | 1,207,000 | liquidity pool |
| Whoami | FOUNDER | 5,500,000 | static (API returns 0; DEX-held) |
| Nader | FOUNDER | 12,500,000 | user confirmed |
| Mossified | FOUNDER | 2,800,000 | user confirmed |
| LazyNina | FOUNDER | 0 | unknown |

## References

- [Openfund Tokenomics](https://docs.deso.org/openfund/openfund-tokenomics): Nader Al-Naji is top holder (~20% of ~95M supply)
- Total supply: ~95M Openfund
- Run `node scripts/check-openfund-holdings.mjs` to re-check API (returns 0 for most due to DEX custody)
