/**
 * Probe DeSo GraphQL for daily post stats and other 30d metrics (like the explorer "Last 30 days Posts").
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

// 1. List all query roots that might have daily or post stats
const schema = await q('query { __schema { queryType { fields { name } } } }');
const names = schema.data?.__schema?.queryType?.fields?.map((f) => f.name) || [];
const daily = names.filter((n) => n.toLowerCase().includes('daily'));
const post = names.filter((n) => n.toLowerCase().includes('post'));
console.log('Query roots containing "daily":', daily);
console.log('Query roots containing "post":', post);

// 2. Try dailyPostCountStats if it exists
if (names.includes('dailyPostCountStats')) {
  console.log('\n=== dailyPostCountStats (first 5, DAY_DESC) ===');
  const r = await q(`
    query { dailyPostCountStats(first: 5, orderBy: [DAY_DESC]) {
      nodes { day count }
      pageInfo { hasNextPage }
    } }
  `);
  console.log(JSON.stringify(r, null, 2));
}

// 3. Introspect posts connection - filter by createdAt for last 30 days?
console.log('\n=== __type(name: "Query") fields that are daily* ===');
for (const field of daily) {
  const t = await q(`query { __type(name: "Query") { fields(includeDeprecated: false) { name type { name kind } } } }`);
  const f = t.data?.__type?.fields?.find((x) => x.name === field);
  if (f) console.log(field, '->', f.type?.name || f.type);
}

// 4. Try posts with filter (if supported)
console.log('\n=== posts connection (check filter args) ===');
const postsType = await q(`query { __type(name: "Post") { name } __schema { queryType { fields(includeDeprecated: false) { name args { name type { name } } } } } }`);
const postsField = postsType.data?.__schema?.queryType?.fields?.find((x) => x.name === 'posts');
console.log('posts args:', postsField?.args?.map((a) => ({ name: a.name, type: a.type?.name })));

// 5. Daily stat types: list all Daily* types
console.log('\n=== All __types starting with Daily ===');
const typeNames = await q('query { __schema { types { name } } }');
const dailyTypes = (typeNames.data?.__schema?.types || []).filter((t) => t.name?.startsWith('Daily'));
console.log(dailyTypes.map((t) => t.name).join(', '));

for (const typeName of dailyTypes) {
  const fields = await q(`query { __type(name: "${typeName}") { fields { name } } }`);
  console.log(typeName, ':', fields.data?.__type?.fields?.map((f) => f.name).join(', '));
}
