#!/usr/bin/env node
/**
 * Get total NET CCv1 (DESO locked in Creator Coins v1) via GraphQL.
 * Query accounts with desoLockedNanos > 0, orderBy: DESO_LOCKED_NANOS_DESC.
 * First 10K creators typically capture ~99% of value; use --limit 10000 for fast approx.
 */
const GRAPHQL = 'https://graphql-prod.deso.com/graphql';
const NANOS = 1e9;
const PAGE_SIZE = 1000;
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : null;

async function fetchPage(after = null, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($first: Int!, $after: Cursor) {
          accounts(first: $first, after: $after, filter: { desoLockedNanos: { greaterThan: "0" } }, orderBy: DESO_LOCKED_NANOS_DESC) {
            nodes { publicKey desoLockedNanos }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { first: PAGE_SIZE, after },
      }),
    });
    const text = await res.text();
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
    }
    if (d.errors) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw new Error(JSON.stringify(d.errors));
    }
    return d.data.accounts;
  }
}

async function main() {
  let totalNanos = 0n;
  let count = 0;
  let after = null;

  console.log('Fetching CCv1 creators (desoLockedNanos > 0, orderBy: DESO_LOCKED_NANOS_DESC)...');
  if (LIMIT) console.log(`  (--limit ${LIMIT}: stop after ${LIMIT} creators for ~99% approx)`);
  do {
    const { nodes, pageInfo } = await fetchPage(after);
    for (const n of nodes) {
      totalNanos += BigInt(n.desoLockedNanos || '0');
      count++;
    }
    after = pageInfo.endCursor;
    const deso = Number(totalNanos) / NANOS;
    process.stdout.write(`\r  ${count} creators, ${deso.toFixed(2)} DESO so far...`);
    if (!pageInfo.hasNextPage) break;
    if (LIMIT && count >= LIMIT) break;
    await new Promise((r) => setTimeout(r, 300));
  } while (true);

  const totalDeso = Number(totalNanos) / NANOS;
  console.log(`\n\nTotal NET CCv1: ${totalDeso.toFixed(2)} DESO (${count} creators)`);
  console.log('\nTo cache this value in the app (run in browser console):');
  console.log(
    `localStorage.setItem('deso-ccv1-network-total', JSON.stringify({ deso: ${totalDeso.toFixed(2)}, timestamp: Date.now() }));`
  );
}

main().catch(console.error);
