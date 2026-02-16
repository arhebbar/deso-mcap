#!/usr/bin/env node
/** Fetch Randhir's CCv1 holdings via DeSo GraphQL */
const pk = 'BC1YLiLhFcR5Jct4qXGaqVjhFgHzwE8fMKX9diibqzqmY78ZavNvCm5';
const NANOS = 1e9;

async function fetchAll() {
  let all = [];
  let after = null;
  do {
    const res = await fetch('https://graphql-prod.deso.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query RandhirCCv1($pk: String!, $after: Cursor) {
          creatorCoinBalances(first: 500, filter: { holder: { publicKey: { equalTo: $pk } } }, after: $after) {
            nodes {
              balanceNanos totalValueNanos coinPriceDesoNanos
              creator { username publicKey }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { pk, after },
      }),
    });
    const d = await res.json();
    if (d.errors) {
      console.error('GraphQL errors:', d.errors);
      return;
    }
    const conn = d?.data?.creatorCoinBalances;
    const nodes = conn?.nodes ?? [];
    all = all.concat(nodes);
    after = conn?.pageInfo?.hasNextPage ? conn?.pageInfo?.endCursor : null;
  } while (after);

  const totalDeso = all.reduce((s, n) => s + parseFloat(n.totalValueNanos || 0) / NANOS, 0);
  console.log('Randhir CCv1 Holdings (holder: BC1YLi...Cm5)\n');
  console.log('Total:', all.length, 'positions | Total value:', totalDeso.toFixed(4), 'DESO\n');
  console.log('Top 20 by value (DESO):');
  const sorted = all
    .map((n) => ({
      creator: n.creator?.username ?? '?',
      balance: parseFloat(n.balanceNanos || 0) / NANOS,
      valueDeso: parseFloat(n.totalValueNanos || 0) / NANOS,
    }))
    .sort((a, b) => b.valueDeso - a.valueDeso);
  sorted.slice(0, 20).forEach((r, i) =>
    console.log(`  ${(i + 1).toString().padStart(2)}. ${r.creator.padEnd(28)} value: ${r.valueDeso.toFixed(4)} DESO`)
  );
  if (all.length > 20) console.log('\n  ... and', all.length - 20, 'more');
}

fetchAll().catch(console.error);
