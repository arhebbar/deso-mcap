#!/usr/bin/env node
const introspect = async (name) => {
  const res = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "${name}") { name kind fields { name type { name kind ofType { name } } } inputFields { name type { name kind ofType { name } } } } }`,
    }),
  });
  const d = await res.json();
  return d?.data?.__type;
};

const main = async () => {
  const [bal, filt, cond] = await Promise.all([
    introspect('CreatorCoinBalance'),
    introspect('CreatorCoinBalanceFilter'),
    introspect('CreatorCoinBalanceCondition'),
  ]);
  console.log('CreatorCoinBalance:', JSON.stringify(bal, null, 2));
  console.log('\nCreatorCoinBalanceFilter:', JSON.stringify(filt, null, 2));
  console.log('\nCreatorCoinBalanceCondition:', JSON.stringify(cond, null, 2));

  // Test query for Randhir - use holder not hodler, totalValueNanos for DESO value
  const pk = 'BC1YLiLhFcR5Jct4qXGaqVjhFgHzwE8fMKX9diibqzqmY78ZavNvCm5';
  const testRes = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { creatorCoinBalances(first: 200, filter: { holder: { publicKey: { equalTo: "${pk}" } } }) { nodes { balanceNanos totalValueNanos coinPriceDesoNanos creator { username publicKey } } pageInfo { hasNextPage endCursor } } }`,
    }),
  });
  const testData = await testRes.json();
  console.log('\nTest query result (first 3 nodes):', JSON.stringify(testData?.data?.creatorCoinBalances?.nodes?.slice(0, 3), null, 2));
  const nodes = testData?.data?.creatorCoinBalances?.nodes ?? [];
  const totalDeso = nodes.reduce((s, n) => s + parseFloat(n.totalValueNanos || 0) / 1e9, 0);
  console.log('Total CCv1 value (DESO):', totalDeso, '| Count:', nodes.length);

  // Test batch query with multiple PKs (in filter) via variables
  const pks = [pk, 'BC1YLjEayZDjAPitJJX4Boy7LsEfN3sWAkYb3hgE9kGBirztsc2re1N'];
  const batchRes = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query BatchCC($pks: [String!]!) { creatorCoinBalances(first: 500, filter: { holder: { publicKey: { in: $pks } } }) { nodes { totalValueNanos holder { publicKey } } pageInfo { hasNextPage endCursor } } }',
      variables: { pks },
    }),
  });
  const batchData = await batchRes.json();
  const batchNodes = batchData?.data?.creatorCoinBalances?.nodes ?? [];
  const byPk = {};
  for (const n of batchNodes) {
    const hp = n.holder?.publicKey ?? '?';
    byPk[hp] = (byPk[hp] ?? 0) + parseFloat(n.totalValueNanos || 0) / 1e9;
  }
  console.log('\nBatch by holder (DESO):', byPk);
};

main().catch(console.error);
