#!/usr/bin/env node
/**
 * Fetch Openfund/Focus holders and top DESO holders (>1K) not yet in WALLET_CONFIG.
 * Outputs list for adding to wallet config to reduce Others-Unaccounted.
 *
 * Usage: node scripts/fetch-others-holders.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HODLERS_API = 'https://blockproducer.deso.org/api/v0';
const GQL = 'https://graphql-prod.deso.com/graphql';
const NANOS_PER_DESO = 1e9;
const NANOS_PER_DAO_COIN = 1e18;
const MIN_DESO = 1_000; // 1K DESO
const MIN_DESO_NANOS = BigInt(MIN_DESO) * BigInt(NANOS_PER_DESO);

function parseDaoBalance(entry) {
  if (entry?.BalanceNanosUint256) {
    const hex = String(entry.BalanceNanosUint256).replace(/^0x/, '');
    return Number(BigInt('0x' + hex)) / NANOS_PER_DAO_COIN;
  }
  return (entry?.BalanceNanos ?? 0) / NANOS_PER_DAO_COIN;
}

async function fetchTokenHolders(username, tokenName) {
  const out = new Map();
  let lastKey = '';
  do {
    const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: username,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: 200,
        FetchAll: false,
        IsDAOCoin: true,
      }),
    });
    if (!res.ok) break;
    const data = await res.json();
    const hodlers = data?.Hodlers ?? [];
    for (const h of hodlers) {
      const pk = h.HODLerPublicKeyBase58Check;
      if (pk) {
        const amt = parseDaoBalance(h);
        if (amt > 0) out.set(pk, (out.get(pk) ?? 0) + amt);
      }
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    if (hodlers.length < 200 || !lastKey) break;
    await new Promise((r) => setTimeout(r, 80));
  } while (lastKey);
  return out;
}

async function fetchTopDesoHolders(limit = 2000, minNanos = 1e12) {
  const out = [];
  let after = null;
  do {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query($first: Int!, $after: Cursor, $filter: DesoBalanceFilter) {
            desoBalances(first: $first, after: $after, orderBy: BALANCE_NANOS_DESC, filter: $filter) {
              nodes { balanceNanos publicKey }
              pageInfo { hasNextPage endCursor }
            }
          }
        `,
        variables: {
          first: 100,
          after,
          filter: { balanceNanos: { greaterThan: String(minNanos) } },
        },
      }),
    });
    const data = await res.json();
    const nodes = data?.data?.desoBalances?.nodes ?? [];
    for (const n of nodes) {
      const pk = n.publicKey;
      const nanos = BigInt(n.balanceNanos ?? 0);
      if (pk && nanos >= MIN_DESO_NANOS) {
        out.push({ pk, balanceDeso: Number(nanos) / NANOS_PER_DESO });
      }
    }
    const pageInfo = data?.data?.desoBalances?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
    if (out.length >= limit || !after) break;
    await new Promise((r) => setTimeout(r, 80));
  } while (after);
  return out.slice(0, limit);
}

function parseTrackedPks() {
  const path = join(__dirname, '..', 'src', 'api', 'walletApi.ts');
  const content = readFileSync(path, 'utf8');
  const pks = new Set();
  const regex = /publicKeyBase58Check:\s*['"](BC1Y[A-Za-z0-9]+)['"]/g;
  let m;
  while ((m = regex.exec(content)) !== null) pks.add(m[1]);
  return pks;
}

async function main() {
  console.log('Fetching Openfund holders...');
  const openfundHolders = await fetchTokenHolders('openfund', 'Openfund');
  console.log(`  Openfund: ${openfundHolders.size} holders`);

  console.log('Fetching Focus holders...');
  const focusHolders = await fetchTokenHolders('focus', 'Focus');
  console.log(`  Focus: ${focusHolders.size} holders`);

  const tokenHolderPks = new Set([...openfundHolders.keys(), ...focusHolders.keys()]);
  console.log(`  Combined unique: ${tokenHolderPks.size}`);

  console.log('Fetching top DESO holders (>1K DESO)...');
  const desoHolders = await fetchTopDesoHolders(2000, 1e12);
  console.log(`  DESO >1K: ${desoHolders.length} holders`);

  const trackedPks = parseTrackedPks();
  console.log(`  Tracked PKs: ${trackedPks.size}`);

  const toAdd = new Map(); // pk -> { source, openfund?, focus?, deso? }
  for (const pk of tokenHolderPks) {
    if (trackedPks.has(pk)) continue;
    const openfund = openfundHolders.get(pk) ?? 0;
    const focus = focusHolders.get(pk) ?? 0;
    toAdd.set(pk, { source: 'token', openfund, focus, deso: 0 });
  }
  for (const { pk, balanceDeso } of desoHolders) {
    if (trackedPks.has(pk)) continue;
    const cur = toAdd.get(pk);
    if (cur) {
      cur.deso = Math.max(cur.deso ?? 0, balanceDeso);
    } else {
      toAdd.set(pk, { source: 'deso', deso: balanceDeso, openfund: 0, focus: 0 });
    }
  }

  const list = Array.from(toAdd.entries())
    .map(([pk, v]) => ({ pk, ...v }))
    .sort((a, b) => {
      const aVal = (a.openfund ?? 0) * 0.087 + (a.focus ?? 0) * 0.00034 + (a.deso ?? 0);
      const bVal = (b.openfund ?? 0) * 0.087 + (b.focus ?? 0) * 0.00034 + (b.deso ?? 0);
      return bVal - aVal;
    });

  console.log(`\n=== Untracked holders to add: ${list.length} ===\n`);
  console.log('Add as DeSo Bulls in src/api/walletApi.ts:\n');
  for (const { pk } of list.slice(0, 300)) {
    const suffix = pk.length >= 6 ? pk.slice(-6) : pk.slice(-4);
    console.log(`  { username: '', displayName: 'DeSo Bull (…${suffix})', classification: 'DESO_BULL', publicKeyBase58Check: '${pk}' },`);
  }
  if (list.length > 300) {
    console.log(`\n  ... and ${list.length - 300} more (run script and add in batches)`);
  }
}

main().catch(console.error);
