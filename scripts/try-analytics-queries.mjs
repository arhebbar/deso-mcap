const GQL = 'https://graphql-prod.deso.com/graphql';

async function run(name, query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    console.log(name, 'errors:', JSON.stringify(data.errors, null, 2));
    return;
  }
  console.log(name, '->', JSON.stringify(data.data, null, 2).slice(0, 1200));
}

// Dashboard stats (likely single row or small set)
await run(
  'dashboardStats',
  `query { dashboardStats(first: 3) { nodes { __typename } pageInfo { hasNextPage } } }`
);

// Daily txn count - last 30 days (need orderBy for date desc)
await run(
  'dailyTxnCountStats',
  `query { dailyTxnCountStats(first: 5) { nodes { __typename } pageInfo { hasNextPage } } }`
);

// Blocks - get latest block height (orderBy by height desc)
await run(
  'blocks',
  `query { blocks(first: 1, orderBy: [BLOCK_HEIGHT_DESC]) { nodes { blockHeight } pageInfo { hasNextPage } } }`
);

// blockByHeight - need a height (use string for BigInt)
await run(
  'blockByHeight',
  `query { blockByHeight(height: "29992373") { blockHeight blockHash } }`
);

process.exit(0);
