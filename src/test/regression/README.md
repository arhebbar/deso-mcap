# Regression tests

Run after major changes to catch:

1. **Blank values** – formatters and static/cached data must never produce empty display values.
2. **Table rows** – no row with all critical cells empty; wallet/table data has required fields.
3. **Value consistency** – same metric (staked, free float, mcap) consistent across visuals.
4. **Interactions** – components that support filtering/expand render and show expected labels.
5. **Cached vs live** – fallbacks (treasury, market data) used when API returns nothing.

See **`docs/TEST_CASES.md`** for the full manual checklist and how to keep it updated.

```bash
npm test
# or regression only:
npm run test -- --run src/test/regression
```
