// Introspect StakeEntry and AccountFilter
const introspect = async (typeName) => {
  const res = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "${typeName}") { name kind fields { name type { name } } inputFields { name type { name } } } }`,
    }),
  });
  return (await res.json()).data?.__type;
};

console.log('StakeEntry:', JSON.stringify(await introspect('StakeEntry'), null, 2));
console.log('AccountFilter:', JSON.stringify(await introspect('AccountFilter'), null, 2));

// Try with stakerPkid - need to convert public key to pkid?
// Try with staker: { publicKey: { equalTo: $pk } }
const query = `
  query GetStakedDESO($pk: String!) {
    stakeEntries(filter: { staker: { publicKey: { equalTo: $pk } } }) {
      nodes { stakeAmountNanos validatorEntry { account { publicKey } } }
    }
  }
`;

const res = await fetch('https://graphql-prod.deso.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    variables: { pk: 'BC1YLiLhFcR5Jct4qXGaqVjhFgHzwE8fMKX9diibqzqmY78ZavNvCm5' },
  }),
});
const data = await res.json();
console.log('Result:', JSON.stringify(data, null, 2));
