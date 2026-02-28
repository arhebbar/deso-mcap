/**
 * Probe posts filter/condition and dashboardStats for 30d breakdown.
 */
const GQL = 'https://graphql-prod.deso.com/graphql';

async function q(query) {
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

// PostFilter and PostCondition - input fields for filtering posts
console.log('=== PostFilter input fields ===');
let r = await q('query { __type(name: "PostFilter") { inputFields { name type { name kind ofType { name } } } } }');
console.log(JSON.stringify(r.data?.__type?.inputFields, null, 2));

console.log('\n=== PostCondition input fields ===');
r = await q('query { __type(name: "PostCondition") { inputFields { name type { name } } } }');
console.log(JSON.stringify(r.data?.__type?.inputFields, null, 2));

// Post orderBy enum
console.log('\n=== PostOrderBy enum (for orderBy) ===');
r = await q('query { __type(name: "PostsOrderBy") { enumValues { name } } }');
console.log(JSON.stringify(r.data?.__type?.enumValues, null, 2));

// Try posts with condition createdAt > 30 days ago (if supported)
console.log('\n=== posts(first: 1, filter: { createdAt: { greaterThan: "..." } }) - check if date filter exists ===');
// Just run a minimal posts query with totalCount
r = await q(`
  query { posts(first: 1) { totalCount pageInfo { hasNextPage } } }
`);
console.log('posts totalCount (no filter):', r.data?.posts?.totalCount, r.errors);

// DatetimeFilter for posts filter
console.log('\n=== DatetimeFilter input fields ===');
r = await q('query { __type(name: "DatetimeFilter") { inputFields { name type { name } } } }');
console.log(JSON.stringify(r.data?.__type?.inputFields, null, 2));

// Try posts with timestamp filter (last 30 days)
const since = new Date();
since.setDate(since.getDate() - 30);
const iso = since.toISOString();
console.log('\n=== posts(first: 0, filter: { timestamp: { greaterThan: "' + iso.slice(0, 19) + 'Z" } }) totalCount ===');
r = await q(`
  query { posts(first: 0, filter: { timestamp: { greaterThan: "` + iso + `" } }) { totalCount pageInfo { hasNextPage } } }
`);
console.log(JSON.stringify(r, null, 2));
