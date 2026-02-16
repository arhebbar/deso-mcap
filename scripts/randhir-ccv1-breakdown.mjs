#!/usr/bin/env node
/** CCv1 breakdown for Randhir (Me) - all 5 merged accounts */
const DESO_NODE = 'https://node.deso.org/api/v0';
const GRAPHQL = 'https://graphql-prod.deso.com/graphql';
const NANOS = 1e9;

const ACCOUNTS = ['Randhir', 'RandhirStakingWallet', 'Twinstars', 'desoscams', 'Bhagyasri'];

async function getPk(username) {
  const res = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username }),
  });
  const d = await res.json();
  return d?.Profile?.PublicKeyBase58Check;
}

async function fetchCcV1(pk) {
  let total = 0;
  let after = null;
  do {
    const res = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($pk: String!, $after: Cursor) {
          creatorCoinBalances(first: 500, filter: { holder: { publicKey: { equalTo: $pk } } }, after: $after) {
            nodes { totalValueNanos }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { pk, after },
      }),
    });
    const d = await res.json();
    const nodes = d?.data?.creatorCoinBalances?.nodes ?? [];
    for (const n of nodes) total += parseFloat(n.totalValueNanos || 0) / NANOS;
    const conn = d?.data?.creatorCoinBalances;
    after = conn?.pageInfo?.hasNextPage ? conn?.pageInfo?.endCursor : null;
  } while (after);
  return total;
}

async function main() {
  console.log('Randhir (Me) CCv1 breakdown - 5 merged accounts:\n');
  let sum = 0;
  for (const username of ACCOUNTS) {
    const pk = await getPk(username);
    if (!pk) {
      console.log(`  ${username}: (no profile)`);
      continue;
    }
    const ccv1 = await fetchCcV1(pk);
    sum += ccv1;
    console.log(`  ${username.padEnd(22)} ${ccv1.toFixed(4)} DESO`);
  }
  console.log(`  ${'─'.repeat(30)}`);
  console.log(`  ${'Total (Randhir Me)'.padEnd(22)} ${sum.toFixed(4)} DESO`);
}

main().catch(console.error);
