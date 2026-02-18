#!/usr/bin/env node
/**
 * Fetch total DESO locked in Creator Coins v1 (no filter).
 * Paginates through all creatorCoinBalances and sums totalValueNanos.
 */
const GRAPHQL = 'https://graphql-prod.deso.com/graphql';
const NANOS = 1e9;

async function main() {
  let totalDeso = 0;
  let count = 0;
  let after = null;
  const start = Date.now();

  console.log('Fetching all creatorCoinBalances (no filter)...\n');

  do {
    const res = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($after: Cursor) {
          creatorCoinBalances(first: 500, after: $after) {
            nodes { totalValueNanos }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { after },
      }),
    });
    const d = await res.json();
    if (d.errors) {
      console.error('GraphQL errors:', d.errors);
      break;
    }
    const nodes = d?.data?.creatorCoinBalances?.nodes ?? [];
    for (const n of nodes) {
      totalDeso += parseFloat(n.totalValueNanos || 0) / NANOS;
      count++;
    }
    const conn = d?.data?.creatorCoinBalances;
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? conn?.pageInfo?.endCursor : null;

    if (count % 5000 === 0 && count > 0) {
      console.log(`  ... ${count} records, ${totalDeso.toFixed(0)} DESO so far`);
    }
  } while (after);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nTotal: ${count} CCv1 balance entries`);
  console.log(`Total DESO locked in CCv1: ${totalDeso.toFixed(4)}`);
  console.log(`Time: ${elapsed}s`);
}

main().catch(console.error);
