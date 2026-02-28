/**
 * Probe DeSo GraphQL for analytics metrics - API calls and sample responses.
 */
const GQL = 'https://graphql-prod.deso.com/graphql';

async function q(query, variables = {}) {
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

console.log('=== 1. dailyTxnCountStats (Last 30 days Transactions) ===');
const r1 = await q(`
  query { dailyTxnCountStats(first: 5, orderBy: [DAY_DESC]) {
    nodes { day count }
    pageInfo { hasNextPage }
  } }
`);
console.log(JSON.stringify(r1, null, 2));

console.log('\n=== 2. dailyActiveWalletCountStats (Active wallets) ===');
const r2 = await q(`
  query { dailyActiveWalletCountStats(first: 5, orderBy: [DAY_DESC]) {
    nodes { day count }
    pageInfo { hasNextPage }
  } }
`);
console.log(JSON.stringify(r2, null, 2));

console.log('\n=== 3. dailyNewWalletCountStats (New wallets) ===');
const r3 = await q(`
  query { dailyNewWalletCountStats(first: 5, orderBy: [DAY_DESC]) {
    nodes { day walletCount }
    pageInfo { hasNextPage }
  } }
`);
console.log(JSON.stringify(r3, null, 2));

console.log('\n=== 4. dashboardStats (all time + 30d + content) ===');
const r4 = await q(`
  query { dashboardStats(first: 1) {
    nodes {
      txnCountAll
      txnCount30D
      activeWalletCount30D
      newWalletCount30D
      postCount
      postLongformCount
      commentCount
      txnCountCreatorCoin
      txnCountNft
      txnCountDex
      txnCountSocial
    }
    pageInfo { hasNextPage }
  } }
`);
console.log(JSON.stringify(r4, null, 2));

// Introspect dashboardStat to get fields
console.log('\n=== 5. DashboardStat type fields ===');
const r5 = await q(`
  query { __type(name: "DashboardStat") { fields { name type { name } } } }
`);
console.log(JSON.stringify(r5.data?.__type?.fields, null, 2));

console.log('\n=== 6. DailyTxnCountStat fields (for 30d trend) ===');
const r6 = await q(`query { __type(name: "DailyTxnCountStat") { fields { name } } }`);
console.log(JSON.stringify(r6.data?.__type?.fields?.map(f=>f.name), null, 2));
