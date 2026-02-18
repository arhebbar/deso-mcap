# DESO in Circulation & Capital Structure – Implementation Plan

## Done

1. **Supply Distribution Chart** – Shows % of supply, USD value (DESO × price), and uses real staked + unstaked data (Staked, Foundation, AMM, Core Team, DeSo Bulls, Others).
2. **Circulation table – US$ column** – Overall DESO in Circulation table now has a US$ value column and total; "Free Float" under Staked sections renamed to "Others" (DESO section keeps "Free Float").
3. **Table title** – Renamed to "DESO in Circulation".

---

## Remaining (in order)

### 2b. Validator breakdown in Circulation table
- Replace "Core Validators" / "Community Validators" with **one level per validator** (from Staked DESO table: `validatorBuckets`).
- Each validator row has a **+** button to expand and show breakdown by account (Foundation, Core Team, DeSo Bulls, Others) with category tags.
- Data: use `useStakedDesoData().validatorBuckets`; each bucket has `validatorName`, `foundation`, `community` arrays with `classification` and `amount`.

### 2c. Add dBTC, dETH, dSOL, dUSDC to Circulation table
- Under "Not Staked" (or a unified token view), add sections: **dBTC**, **dETH**, **dSOL**, **dUSDC**.
- Each section broken down by **Foundation, AMM, Core Team, DeSo Bulls, Others** (from wallet `tokenBalances` and `classification`).
- Show amount in token units and US$ (token amount × BTC/ETH/SOL price or 1 for dUSDC).

### 2d. Creator Coins, Openfund, Focus by Foundation etc.
- **Creator Coins v1** – Keep total from CCv1 API; optional later: breakdown by holder category if data available.
- **Openfund** – Break down by Foundation, AMM, Core Team, DeSo Bulls, Others using wallet balances (Openfund) and classification; show DESO-equivalent and US$.
- **Focus** – Same as Openfund (exclude `focus` account’s minted balance from "real" value).

### 2e. "Others" vs "Free Float"
- Already done in Staked section (Core/Community Validators): "Free Float" → "Others".
- In DESO section under Not Staked, keep **"Free Float"** as the true free-float bucket.

### 2f. CCv2 AMMs section
- Add a **CCv2 AMMs** section: hardcode ~**22,000 DESO** (~$130K at $5.9).
- Store in constants (e.g. `CCV2_AMM_DESO = 22_000`, derive USD from current DESO price).
- Place in the table where it makes sense (e.g. under Not Staked or a "Locked / AMM" group).

### 2g. Top 10–25 + "Others" per section
- In each breakdown (validators, token sections, Openfund/Focus by category), show **top 10–25** rows by amount.
- Group the rest as **"Others"** (single row); **+** button to expand and show full list if needed.
- Reuse pattern across Staked (by validator → by account) and Not Staked (by token → by category → by account).

### 2h. Single "DESO in Circulation" table with 3-level drilldown
- **Level 1:** Staked | Unstaked (or: Staked, CCv1, Openfund, Focus, DESO, dBTC, dETH, dSOL, dUSDC, CCv2 AMMs).
- **Level 2a (Staked):** Validators (from Staked DESO table); **Level 3a:** Account names with category tags (expandable Top N + Others).
- **Level 2b (Unstaked / tokens):** Creator Coins v1, Openfund, Focus, DESO, dBTC, dETH, dSOL, dUSDC, CCv2 AMMs; **Level 3b:** Foundation, AMM, Core Team, DeSo Bulls, Others (and optionally Top N accounts + Others where applicable).
- This can absorb the current **Unstaked DESO** table into one place; consider deprecating or linking from the old table to this one.

### 3. Capital Structure → Interactive Bar + Heatmap
- **Replace** current "Capital Structure Breakdown" (single stacked bar) with:
  - **Level 1 – Bar chart:** One bar segment per asset: Staked DESO, Openfund, Focus, CCv1, dBTC, dUSDC, dETH, dSOL, CCv2 AMMs, etc. Include **legend** (some segments may be small).
  - **Interactions:**
    - **Click "Staked DESO"** → show a **heatmap** of validators (rows = validators, color = amount or share).
    - **Click a validator** → drill down to **Top Accounts + Others** with hover tooltips (name, amount, US$, category).
    - **Click other tokens** (Openfund, Focus, dBTC, etc.) → breakdown **by Foundation, AMM, Core Team, DeSo Bulls, Others** (table or small heatmap).
- Use Recharts (e.g. `BarChart`, custom heatmap via `Cell` or a grid) and local state for drill-down level and selected segment.
- Data: same as Circulation table (validator buckets, wallet balances by token and classification, CCv1 total, CCv2 AMM constant).

---

## Data hooks to extend
- `useDesoCirculationBreakdown` (or a new `useCirculationTable`) – add validator-level nodes, token sections (dBTC, dETH, dSOL, dUSDC), Openfund/Focus by category, CCv2 AMMs, and Top N + Others.
- `useWalletData` – already has `wallets` with `classification` and `tokenBalances`; aggregate by token and by category for bar/heatmap and table.
- `useStakedDesoData` – already has `validatorBuckets`; use for validator breakdown and Staked DESO bar/heatmap.

## File suggestions
- `src/hooks/useCirculationTable.ts` – unified data for DESO in Circulation table (levels 1–3).
- `src/components/dashboard/DesoInCirculationTable.tsx` – single table with expand/collapse and Top N + Others.
- `src/components/dashboard/CapitalStructureBar.tsx` – bar chart + heatmap + drill-down state and tooltips.
