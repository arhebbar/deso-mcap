// Test stakeEntries and lockedStakeEntries with in filter
const pk = 'BC1YLiLhFcR5Jct4qXGaqVjhFgHzwE8fMKX9diibqzqmY78ZavNvCm5'; // Randhir
const pks = [pk];

const stakeQuery = `
  query GetStakeEntries($pks: [String!]!) {
    stakeEntries(first: 10, filter: { staker: { publicKey: { in: $pks } } }) {
      nodes { stakerPkid stakeAmountNanos validatorEntry { account { publicKey } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const lockedQuery = `
  query GetLockedStakeEntries($pks: [String!]!) {
    lockedStakeEntries(first: 10, filter: { staker: { publicKey: { in: $pks } } }) {
      nodes { stakerPkid lockedAmountNanos validatorEntry { account { publicKey } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const [stakeRes, lockedRes] = await Promise.all([
  fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: stakeQuery, variables: { pks } }),
  }),
  fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: lockedQuery, variables: { pks } }),
  }),
]);

console.log('stakeEntries:', JSON.stringify(await stakeRes.json(), null, 2));
console.log('\nlockedStakeEntries:', JSON.stringify(await lockedRes.json(), null, 2));
