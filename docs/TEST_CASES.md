# Regression Test Cases

Run these test cases whenever a major set of changes is pushed.

- **Automated tests:** `npm test` (all tests) or `npm run test -- --run src/test/regression` (regression only).
- **Manual checks:** use the checklist below for UI and E2E verification.

## Automated regression suite

| Category | File | What it covers |
|---------|------|----------------|
| 1. Blank values | `src/test/regression/blankValues.test.ts` | Formatters never return empty; static/cached data yields non-zero KPIs; treasury cache shape |
| 2. Table rows | `src/test/regression/tableRows.test.ts` | Wallet/table data structures have required fields; no row with all cells empty |
| 3. Value consistency | `src/test/regression/valueConsistency.test.ts` | Staked, free float, market cap formulas; same metric used across sources |
| 5. Cached vs live | `src/test/regression/cachedVsLive.test.ts` | Treasury and market fallbacks prevent blank when API returns nothing |
| 4. Interactions | `src/test/regression/interactions.test.tsx` | Supply doughnut and Assets bar render; legend and section titles present |

---

## 1. No blank values in any field

Cached/static values must show when live API is unavailable or returns empty. No field should display blank, `$0.00` (when a cached value exists), or "—" for primary metrics.

### KPI row
- [ ] **DESO Market Cap** – never blank; shows cached then live
- [ ] **Float-Adjusted MCap** – never blank; shows cached then live
- [ ] **BTC Treasury** – never blank; falls back to cache then `EXTERNAL_TREASURY` when API returns nothing
- [ ] **Treasury Coverage** – never blank; uses same treasury source as above
- [ ] **dUSDC Backing** – never blank; uses cached/static when needed

### Supply Distribution (doughnut)
- [ ] All segments have non-zero labels and tooltips when data exists
- [ ] Legend shows % and USD for each segment; no empty labels

### Capital Structure (table)
- [ ] Section never blank on load; shows cached data or "Click a segment…" when no filter
- [ ] Validator table (when Staked selected): every row has Name, DESO, US$
- [ ] Category rows (OpenFund, Focus, AMM, etc.): amount and US$ never blank for that category

### DESO in Circulation table
- [ ] Staked total and Unstaked total always show DESO + US$ + %
- [ ] Every validator row has name, amount, US$
- [ ] Every Unstaked subsection (Native Tokens, Currency Tokens, User Tokens, Native DESO) has values or explicit "—" only where no data exists

### Tracked Foundation / Wallet table
- [ ] Section headers show USD total
- [ ] Each wallet row shows Wallet, Class, Key Holdings, USD Value

### Free Float section
- [ ] Total unaccounted (DESO + US$) never blank
- [ ] Anonymous wallet table: each row has Wallet, Staked DESO, Unstaked DESO (or —), Tokens, Total US$

### Treasury Address table
- [ ] Each address row has chain, name, holdings; no blank primary cells

---

## 2. No blank values in any table row

- [ ] **Capital Structure table** – no row with all cells empty
- [ ] **DESO in Circulation** – no validator or section row with empty Category and empty Amount/US$
- [ ] **Wallet table** – no wallet row with empty Wallet name and empty USD
- [ ] **Free Float table** – no row with empty Wallet and empty Staked DESO
- [ ] **Treasury Address table** – no row with empty address and empty holdings

---

## 3. Value consistency across visuals/tables

Same logical metric should match across components (within rounding).

- [ ] **Staked DESO**
  - Supply doughnut "Staked" slice ≈ sum of validator amounts in Capital Structure (when Staked selected)
  - Supply doughnut "Staked" ≈ DESO in Circulation "Staked" total
  - Source: `useCirculationTable().staked.total` or `marketData.desoStaked` when circulation not yet loaded
- [ ] **Foundation / AMM / Core Team / DeSo Bulls**
  - Supply doughnut segments ≈ same totals used in Capital Structure and in Wallet table section totals
- [ ] **Free float**
  - Free Float section "unaccounted" = same formula as Float-Adjusted MCap (freeFloat × price)
- [ ] **BTC Treasury**
  - KPI "BTC Treasury" and Treasury Coverage use same `btcHoldings` (cached or API)
- [ ] **Treasury address totals**
  - Sum of address BTC/ETH/SOL consistent with treasury hook totals when same cache/API source

---

## 4. Interactions

- [ ] **Supply doughnut**
  - Clicking a segment highlights it and filters Capital Structure table
  - Clicking same segment again clears highlight
  - Legend items are clickable and toggle segment selection
- [ ] **Capital Structure**
  - With no selection: shows validators or prompt
  - With "Staked" selected: shows validator table (Top 10 + Others)
  - With other segment selected: shows matching category row(s)
- [ ] **DESO in Circulation**
  - Staked row expands/collapses validator list
  - Validator row expands/collapses top accounts + Others
  - Unstaked row expands/collapses four groups (Native Tokens, Currency Tokens, User Tokens, Native DESO)
  - Each subsection expands/collapses by-category rows
- [ ] **Assets bar (above Wallet table)**
  - Clicking a segment (Foundation, AMM, Core Team, DeSo Bulls, Others) expands only that section in the table
  - Clicking same segment again collapses (or clears filter)
- [ ] **Wallet table**
  - When filtered by bar, only the selected section is expanded
  - When not controlled, section toggles work (expand/collapse)
- [ ] **Free Float**
  - Wallet name/public key links open `https://explorer.deso.com/u/<UsernameOrPublicKey>` in a new tab
  - Column headers sort by Unstaked DESO, Staked DESO, Total US$

---

## 5. Live data vs cached

- [ ] **Before live data loads**
  - KPIs show cached/static values (e.g. MARKET_DATA, EXTERNAL_TREASURY, wallet cache)
  - No spinner or blank replacing a metric that has a cached value
- [ ] **When live API returns empty/zeros**
  - Treasury: BTC/ETH/SOL fall back to cache then static; KPIs never go to $0 if cache has values
  - Wallets: cache or STATIC_WALLETS used so tables are not empty
- [ ] **After live data loads**
  - KPIs and tables update to live values
  - Footer or label indicates "Live data" or "Updating…" as appropriate
- [ ] **Capital Structure**
  - Does not stay blank on initial load; uses cached circulation/staked data if available

---

## 6. Edge cases and accessibility

- [ ] **Empty or zero data**
  - Tables show "No data" or "—" instead of blank cells where applicable
  - No JavaScript errors in console when API fails or returns []
- [ ] **Sorting**
  - Free Float table sort toggles direction and column correctly
- [ ] **Links**
  - Free Float wallet links have `target="_blank"` and `rel="noopener noreferrer"`

---

## Updating this document

- When adding a new **visual or table**, add a subsection under (1) and (2) and any consistency checks under (3).
- When adding a new **interaction**, add a bullet under (4).
- When adding new **caching or fallback** behavior, add a bullet under (5).
