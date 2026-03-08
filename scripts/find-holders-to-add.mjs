#!/usr/bin/env node
/**
 * Find Focus/Openfund token holders and top DESO holders (>1K) not yet in WALLET_CONFIG.
 * Outputs candidates for adding as DeSo Bulls to reduce Others-Unaccounted.
 *
 * Usage: node scripts/find-holders-to-add.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GQL = 'https://graphql-prod.deso.com/graphql';
const DESO_NODE = 'https://node.deso.org/api/v0';
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const NANOS_PER_DAO = 1e18;
const MIN_DESO_DESO = 1_000; // 1K DESO
const MIN_DESO_NANOS = String(MIN_DESO_DESO * NANOS_PER_DESO);

async function gqlQuery(query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const data = await res.json();
  if (data?.errors?.length) throw new Error(data.errors.map((e) => e.message).join('; '));
  return data?.data;
}

async function hodlersPost(body) {
  let res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) throw new Error(`Hodlers ${res.status}`);
  return res.json();
}

async function desoPost(endpoint, body) {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeSo ${endpoint}: ${res.status}`);
  return res.json();
}

function parseDaoBalance(entry) {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return Number(BigInt('0x' + hex)) / NANOS_PER_DAO;
  }
  return (entry.BalanceNanos ?? 0) / NANOS_PER_DAO;
}

/** Fetch all holders of a token (openfund or focus). No min threshold - get everyone. */
async function fetchTokenHoldersAll(username) {
  const out = new Map();
  let lastKey = '';
  for (;;) {
    const data = await hodlersPost({
      Username: username,
      LastPublicKeyBase58Check: lastKey,
      NumToFetch: 200,
      FetchAll: false,
      IsDAOCoin: true,
    });
    const hodlers = data?.Hodlers ?? [];
    for (const h of hodlers) {
      const pk = h.HODLerPublicKeyBase58Check;
      if (!pk) continue;
      const amt = parseDaoBalance(h);
      if (amt > 0) out.set(pk, (out.get(pk) ?? 0) + amt);
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    if (hodlers.length < 200 || !lastKey) break;
    await new Promise((r) => setTimeout(r, 80));
  }
  return out;
}

/** Fetch top DESO holders with balance > minNanos */
async function fetchDesoBalancesOver1k() {
  const out = [];
  let after = null;
  const query = `
    query($first: Int!, $after: Cursor, $filter: DesoBalanceFilter) {
      desoBalances(first: $first, after: $after, orderBy: BALANCE_NANOS_DESC, filter: $filter) {
        nodes { publicKey balanceNanos }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  do {
    const data = await gqlQuery(query, {
      first: 200,
      after,
      filter: { balanceNanos: { greaterThan: MIN_DESO_NANOS } },
    });
    const conn = data?.desoBalances;
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const pk = n.publicKey;
      const nanos = Number(n.balanceNanos ?? 0);
      if (pk && nanos > 0) out.push({ pk, deso: nanos / NANOS_PER_DESO });
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? conn?.pageInfo?.endCursor ?? null : null;
    if (after) await new Promise((r) => setTimeout(r, 80));
  } while (after);
  return out;
}

function parseTrackedPks() {
  const walletPath = join(__dirname, '..', 'src', 'api', 'walletApi.ts');
  const content = readFileSync(walletPath, 'utf8');
  const pks = new Set();
  const configMatch = content.match(/const WALLET_CONFIG[^[]*\[([\s\S]*?)\];/);
  if (!configMatch) return pks;
  const pkRegex = /publicKeyBase58Check:\s*['"](BC1Y[A-Za-z0-9]+)['"]/g;
  let m;
  while ((m = pkRegex.exec(configMatch[1])) !== null) pks.add(m[1]);
  return pks;
}

async function resolveUsernamesToPks(usernames) {
  const out = new Set();
  const list = Array.from(usernames).filter((u) => u?.trim());
  const BATCH = 5;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (username) => {
        try {
          const res = await desoPost('/get-single-profile', { Username: username });
          return res?.Profile?.PublicKeyBase58Check;
        } catch {
          return null;
        }
      })
    );
    for (const pk of results) if (pk) out.add(pk);
    if (i + BATCH < list.length) await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

function parseTrackedUsernames() {
  const walletPath = join(__dirname, '..', 'src', 'api', 'walletApi.ts');
  const content = readFileSync(walletPath, 'utf8');
  const usernames = new Set();
  const configMatch = content.match(/const WALLET_CONFIG[^[]*\[([\s\S]*?)\];/);
  if (!configMatch) return usernames;
  const usernameRegex = /username:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = usernameRegex.exec(configMatch[1])) !== null) usernames.add(m[1]);
  return usernames;
}

async function main() {
  console.log('Fetching Focus token holders...');
  const focusHolders = await fetchTokenHoldersAll('focus');
  console.log(`  Focus: ${focusHolders.size} holders`);

  console.log('Fetching Openfund token holders...');
  const openfundHolders = await fetchTokenHoldersAll('openfund');
  console.log(`  Openfund: ${openfundHolders.size} holders`);

  console.log('Fetching DESO holders >1K...');
  let desoHolders = [];
  try {
    desoHolders = await fetchDesoBalancesOver1k();
  } catch (e) {
    console.warn('  DESO fetch failed:', e.message);
  }
  console.log(`  DESO >1K: ${desoHolders.length} holders`);

  console.log('Building tracked set...');
  const trackedPks = parseTrackedPks();
  const usernames = parseTrackedUsernames();
  const resolvedPks = await resolveUsernamesToPks(usernames);
  const allTracked = new Set([...trackedPks, ...resolvedPks]);
  console.log(`  Tracked: ${allTracked.size} PKs`);

  const focusPks = new Set(focusHolders.keys());
  const openfundPks = new Set(openfundHolders.keys());
  const desoPks = new Set(desoHolders.map((h) => h.pk));

  const toAdd = new Map(); // pk -> { source: string, deso?, openfund?, focus? }
  for (const pk of focusPks) {
    if (allTracked.has(pk)) continue;
    const existing = toAdd.get(pk) ?? { source: [], deso: 0, openfund: 0, focus: 0 };
    existing.focus = focusHolders.get(pk) ?? 0;
    if (!existing.source.includes('Focus')) existing.source.push('Focus');
    toAdd.set(pk, existing);
  }
  for (const pk of openfundPks) {
    if (allTracked.has(pk)) continue;
    const existing = toAdd.get(pk) ?? { source: [], deso: 0, openfund: 0, focus: 0 };
    existing.openfund = openfundHolders.get(pk) ?? 0;
    if (!existing.source.includes('Openfund')) existing.source.push('Openfund');
    toAdd.set(pk, existing);
  }
  for (const { pk, deso } of desoHolders) {
    if (allTracked.has(pk)) continue;
    const existing = toAdd.get(pk) ?? { source: [], deso: 0, openfund: 0, focus: 0 };
    existing.deso = deso;
    if (!existing.source.includes('DESO>1K')) existing.source.push('DESO>1K');
    toAdd.set(pk, existing);
  }

  const list = Array.from(toAdd.entries())
    .map(([pk, v]) => ({ pk, ...v }))
    .sort((a, b) => (b.deso + b.openfund * 0.087 + b.focus * 0.00034) - (a.deso + a.openfund * 0.087 + a.focus * 0.00034));

  const TOP_N = 200;
  const topEntries = list.slice(0, TOP_N);
  console.log(`\n=== Top ${TOP_N} UNTRACKED to add ===\n`);
  const { writeFileSync } = await import('fs');
  const outPath = join(__dirname, 'holders-to-add.json');
  const entries = topEntries.map(({ pk }) => {
    const suffix = pk.length >= 6 ? pk.slice(-6) : pk.slice(-4);
    return { username: '', displayName: `DeSo Bull (…${suffix})`, classification: 'DESO_BULL', publicKeyBase58Check: pk };
  });
  writeFileSync(outPath, JSON.stringify(entries, null, 2));
  console.log(`Wrote ${entries.length} entries to ${outPath}`);
  console.log('\nAdd these as DeSo Bulls in src/api/walletApi.ts WALLET_CONFIG.');
}

main().catch(console.error);
