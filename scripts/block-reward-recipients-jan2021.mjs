/**
 * Find Others accounts (public-key-only) that received block rewards in January 2021.
 * If found, they should be tagged as Core Account (early miner).
 *
 * Approach:
 * 1. Fetch all block rewards (txnType 1) for Jan 18-31, 2021 (chain launched Jan 18)
 * 2. Extract recipient public keys from outputs
 * 3. Fetch Others public keys from our data sources (desoBalances, stakeEntries, free float)
 * 4. Find intersection: Others that received block rewards
 * 5. Output list for adding to CORE_AFFILIATED
 */

const GQL = 'https://graphql-prod.deso.com/graphql';

const JAN2021_SINCE = '2021-01-18T00:00:00.000Z';
const JAN2021_UNTIL = '2021-01-31T23:59:59.999Z';
const PAGE_SIZE = 100;

async function fetchBlockRewardRecipients(since, until) {
  const recipients = new Set();
  let after = null;

  do {
    const query = `
      query BlockRewards($first: Int!, $after: Cursor, $since: Datetime!, $until: Datetime!) {
        transactions(first: $first, after: $after, filter: {
          txnType: { equalTo: 1 }
          timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
        }) {
          nodes { outputs }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    const variables = { first: PAGE_SIZE, after, since, until };
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data?.errors?.length) {
      console.error('GraphQL errors:', data.errors);
      break;
    }
    const nodes = data?.data?.transactions?.nodes ?? [];
    if (recipients.size === 0 && nodes.length > 0) {
      console.log('Sample output structure:', JSON.stringify(nodes[0]?.outputs, null, 2));
    }
    for (const n of nodes) {
      const outputs = n.outputs;
      if (Array.isArray(outputs)) {
        for (const o of outputs) {
          const pk = o?.public_key ?? o?.PublicKey;
          if (pk) recipients.add(pk);
        }
      }
    }
    const pageInfo = data?.data?.transactions?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
    if (after) await new Promise((r) => setTimeout(r, 100));
  } while (after);

  return recipients;
}

async function fetchDesoBalancesTopHolders(limit = 500) {
  const pks = [];
  let after = null;
  const MIN_NANOS = '250000000';

  do {
    const query = `
      query DesoBalances($first: Int!, $after: Cursor, $filter: DesoBalanceFilter) {
        desoBalances(first: $first, after: $after, orderBy: BALANCE_NANOS_DESC, filter: $filter) {
          nodes { publicKey }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { first: 100, after, filter: { balanceNanos: { greaterThan: MIN_NANOS } } },
      }),
    });
    const data = await res.json();
    if (data?.errors?.length) break;
    const nodes = data?.data?.desoBalances?.nodes ?? [];
    for (const n of nodes) {
      if (n.publicKey) pks.push(n.publicKey);
    }
    if (pks.length >= limit) break;
    const pageInfo = data?.data?.desoBalances?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
    if (after) await new Promise((r) => setTimeout(r, 50));
  } while (after);

  return pks.slice(0, limit);
}

async function fetchStakeEntriesTopStakers(limit = 5000) {
  const byPk = new Map();
  let after = null;

  const STAKE_QUERY = `
    query StakeEntries($first: Int!, $after: Cursor) {
      stakeEntries(first: $first, after: $after, orderBy: STAKE_AMOUNT_NANOS_DESC) {
        nodes { stakerPkid stakeAmountNanos }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  for (let i = 0; i < 50; i++) {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: STAKE_QUERY,
        variables: { first: 100, after },
      }),
    });
    const data = await res.json();
    if (data?.errors?.length) break;
    const nodes = data?.data?.stakeEntries?.nodes ?? [];
    for (const n of nodes) {
      const pk = n.stakerPkid;
      if (pk) byPk.set(pk, (byPk.get(pk) ?? 0) + Number(n.stakeAmountNanos ?? 0));
    }
    const pageInfo = data?.data?.stakeEntries?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
    if (!after || nodes.length === 0) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  return Array.from(byPk.keys()).slice(0, limit);
}

/** Tracked public keys from WALLET_CONFIG - exclude these from "Others" */
const TRACKED_PKS = new Set([
  'BC1YLgfGoeE5U7REoLFFzKYS6nGUFZ1rfP2KJmr6BCr8iMEaNU6AqLQ',
  'BC1YLjHNE39QZ8fSPevE6FU99VuyFepe6AswhvFJiu2bqQ4PX3nFQMP',
  'BC1YLh4eK3VuiorNyU1izDNcearJUXPLuTsA9pUndaceZmeAo7jrDbi',
  'BC1YLhWPt6nGTLmsNkbGFHfspcfnRgaEVEbNygVty22oTVF3a1zujne',
  'BC1YLg4J5Nf1cEL38LSChFRjd9Ez54wSdk4KCEqD3aMjzSBhMPejNKJ',
  'BC1YLfj5eLLgiBNDh4f9oq2gUozB77rNefyvknKL1rpujFsAgfAuP4n',
  'BC1YLjMAwU3dA7SRhHZycb6LkP9q9qES7sy5GzR1NF2f2GtSjuvCYKc',
  'BC1YLiRK7iBoQN2W8nfwX7ysW1ush4PCdJQBFADm45BLHCBoxk8u5UD',
  'BC1YLhvDos1L72JBxvGPDz95m86Yz2NEg6CzCZE89Fooac5pTSP2nX4',
  'BC1YLh1ciH11ueQLuyyEfQTku7Rcpnzr2f28eTpDATqADJmdeUQ3rQq',
  'BC1YLgrgVmRGp1SyqCBMKGUTP8mrnA5qEW2TFADEsads9y2Q3wsmAT7',
  'BC1YLihPpDbdKYhzUWBqiD12mXGbQnUehhGo9JpxRjmNdTVuaSwi9b2',
  'BC1YLj797rLyQJPxEPvWBy9iM5mpCTSdfsXb2LmSAa3TRcLEoTWeTXb',
  'BC1YLgyjPzY82hWq2yuBsPPf5cyg9MsGfJqbFfED1GfEKgJDW9eW3Av',
  // Foundation, Exchange, etc. - add more from walletApi WALLET_CONFIG if needed
]);

async function main() {
  // First check total count for Jan 2021
  const countRes = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query { transactions(first: 0, filter: {
          txnType: { equalTo: 1 }
          timestamp: { greaterThanOrEqualTo: "${JAN2021_SINCE}", lessThanOrEqualTo: "${JAN2021_UNTIL}" }
        }) { totalCount } }
      `,
    }),
  });
  const countData = await countRes.json();
  const totalCount = countData?.data?.transactions?.totalCount ?? 0;
  console.log(`Block rewards in Jan 18-31, 2021: totalCount = ${totalCount}`);

  // Check Feb and Mar 2021 for comparison
  const febRes = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { transactions(first: 0, filter: {
        txnType: { equalTo: 1 }
        timestamp: { greaterThanOrEqualTo: "2021-02-01T00:00:00.000Z", lessThanOrEqualTo: "2021-02-28T23:59:59.999Z" }
      }) { totalCount } }`,
    }),
  });
  const marRes = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { transactions(first: 0, filter: {
        txnType: { equalTo: 1 }
        timestamp: { greaterThanOrEqualTo: "2021-03-01T00:00:00.000Z", lessThanOrEqualTo: "2021-03-31T23:59:59.999Z" }
      }) { totalCount } }`,
    }),
  });
  const febCount = (await febRes.json())?.data?.transactions?.totalCount ?? 0;
  const marCount = (await marRes.json())?.data?.transactions?.totalCount ?? 0;
  console.log(`Block rewards Feb 2021: ${febCount}, Mar 2021: ${marCount}`);

  console.log('\nFetching block reward recipients for Jan 18-31, 2021...');
  const blockRewardRecipients = await fetchBlockRewardRecipients(JAN2021_SINCE, JAN2021_UNTIL);
  console.log(`Found ${blockRewardRecipients.size} unique block reward recipients in Jan 2021`);

  console.log('\nFetching Others public keys (desoBalances top holders)...');
  const desoPks = await fetchDesoBalancesTopHolders(500);
  console.log(`Deso balances: ${desoPks.length} public keys`);

  console.log('\nFetching Others public keys (stake entries top stakers)...');
  const stakePks = await fetchStakeEntriesTopStakers(5000);
  console.log(`Stake entries: ${stakePks.length} public keys`);

  const othersPks = new Set([...desoPks, ...stakePks]);
  for (const pk of TRACKED_PKS) othersPks.delete(pk);
  console.log(`\nOthers public keys (excluding tracked): ${othersPks.size}`);

  const othersWithBlockReward = [];
  for (const pk of othersPks) {
    if (blockRewardRecipients.has(pk)) {
      othersWithBlockReward.push(pk);
    }
  }

  console.log(`\n=== Others accounts that received block reward in Jan 2021: ${othersWithBlockReward.length} ===`);
  if (othersWithBlockReward.length > 0) {
    for (const pk of othersWithBlockReward) {
      const suffix = pk.slice(-6);
      console.log(`  - ${pk}  (…${suffix})`);
    }
    console.log('\nAdd these to CORE_AFFILIATED_WALLETS in desoData.ts and WALLET_CONFIG in walletApi.ts');
  } else {
    console.log('  None found.');
  }
}

main().catch(console.error);
