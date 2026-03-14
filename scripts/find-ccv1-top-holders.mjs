#!/usr/bin/env node
/**
 * Find Top 10 CC holders of Top 1000 CC coins (by DESO locked).
 * Uses tokenBalances GraphQL with creator.username filter (fast, avoids timeout).
 *
 * Caches responses to files so it can resume after crashes:
 *   - scripts/.ccv1-creators.json   creators list
 *   - scripts/.ccv1-holders.csv     creator,publicKey,balanceDeso (append-only)
 *   - scripts/.ccv1-progress.json   { lastProcessedIndex, creators }
 *
 * Usage:
 *   node scripts/find-ccv1-top-holders.mjs
 *   TOP_CREATORS=1000 node scripts/find-ccv1-top-holders.mjs
 *   node scripts/find-ccv1-top-holders.mjs --fresh   # ignore cache, start over
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname);
const CREATORS_CACHE = join(CACHE_DIR, '.ccv1-creators.json');
const HOLDERS_CSV = join(CACHE_DIR, '.ccv1-holders.csv');
const PROGRESS_FILE = join(CACHE_DIR, '.ccv1-progress.json');

const GQL = 'https://graphql-prod.deso.com/graphql';
const TOP_CREATORS = parseInt(process.env.TOP_CREATORS || '1000', 10);
const TOP_HOLDERS_PER_CREATOR = 10;
const BATCH_DELAY_MS = 100;

const TOKEN_BALANCES_QUERY = `
query TokenBalances($first: Int!, $after: Cursor, $orderBy: [TokenBalancesOrderBy!], $filter: TokenBalanceFilter) {
  tokenBalances(first: $first, after: $after, orderBy: $orderBy, filter: $filter) {
    nodes {
      holder {
        publicKey
        username
        desoLockedNanos
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
`;

const ACCOUNTS_QUERY = `
query CCv1TopCreators($first: Int!, $after: Cursor) {
  accounts(first: $first, after: $after, filter: { desoLockedNanos: { greaterThan: "0" } }, orderBy: DESO_LOCKED_NANOS_DESC) {
    nodes { username }
    pageInfo { hasNextPage endCursor }
  }
}
`;

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

function loadCreatorsCache() {
  try {
    if (existsSync(CREATORS_CACHE)) {
      const raw = readFileSync(CREATORS_CACHE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.creators) && parsed.creators.length > 0) return parsed.creators;
    }
  } catch (e) {
    console.warn('Could not load creators cache:', e.message);
  }
  return null;
}

function saveCreatorsCache(creators) {
  writeFileSync(CREATORS_CACHE, JSON.stringify({ creators, fetchedAt: Date.now() }, null, 2));
}

function loadProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      const raw = readFileSync(PROGRESS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lastProcessedIndex === 'number' && Array.isArray(parsed?.creators))
        return parsed;
    }
  } catch (e) {
    console.warn('Could not load progress:', e.message);
  }
  return null;
}

function saveProgress(lastProcessedIndex, creators) {
  writeFileSync(
    PROGRESS_FILE,
    JSON.stringify({ lastProcessedIndex, creators, updatedAt: Date.now() }, null, 2)
  );
}

function loadHoldersFromCsv() {
  const holderToBalance = new Map();
  try {
    if (existsSync(HOLDERS_CSV)) {
      const lines = readFileSync(HOLDERS_CSV, 'utf8').split('\n').filter(Boolean);
      const header = lines[0];
      if (header && header.startsWith('creator,')) {
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCsvLine(lines[i]);
          if (parts.length >= 3) {
            const [, pk, balStr] = parts;
            const bal = parseFloat(balStr) || 0;
            if (pk && bal > 0) holderToBalance.set(pk, (holderToBalance.get(pk) ?? 0) + bal);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load holders CSV:', e.message);
  }
  return holderToBalance;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' && !inQuotes) || c === '\r') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function initHoldersCsv() {
  if (!existsSync(HOLDERS_CSV)) {
    writeFileSync(HOLDERS_CSV, 'creator,publicKey,balanceDeso\n');
  }
}

function appendHoldersToCsv(creator, holders) {
  for (const { pk, balance } of holders) {
    appendFileSync(HOLDERS_CSV, `${escapeCsv(creator)},${escapeCsv(pk)},${balance}\n`);
  }
}

function parseTrackedPks() {
  const pks = new Set();
  const walletPath = join(__dirname, '..', 'src', 'api', 'walletApi.ts');
  const ccv1Path = join(__dirname, '..', 'src', 'data', 'ccv1OthersEntries.ts');
  for (const p of [walletPath, ccv1Path]) {
    try {
      const content = readFileSync(p, 'utf8');
      const matches = content.matchAll(/publicKeyBase58Check:\s*['"](BC1Y[A-Za-z0-9]+)['"]/g);
      for (const m of matches) pks.add(m[1]);
    } catch {
      // ignore
    }
  }
  return pks;
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  if (fresh) {
    console.log('--fresh: clearing cache and starting over');
    try {
      if (existsSync(CREATORS_CACHE)) unlinkSync(CREATORS_CACHE);
      if (existsSync(HOLDERS_CSV)) unlinkSync(HOLDERS_CSV);
      if (existsSync(PROGRESS_FILE)) unlinkSync(PROGRESS_FILE);
    } catch (e) {
      console.warn('Could not clear cache:', e.message);
    }
  }

  let creators = fresh ? null : loadCreatorsCache();
  if (!creators || creators.length < TOP_CREATORS) {
    console.log('Fetching top', TOP_CREATORS, 'CC creators (by DESO locked)...');
    creators = [];
    let after = null;
    do {
      const data = await gqlQuery(ACCOUNTS_QUERY, { first: 50, after });
      const conn = data?.accounts;
      const nodes = conn?.nodes ?? [];
      for (const n of nodes) {
        if (n?.username) creators.push(n.username);
      }
      if (creators.length >= TOP_CREATORS) break;
      after = conn?.pageInfo?.hasNextPage ? conn?.pageInfo?.endCursor : null;
      if (after) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    } while (after);
    creators = creators.slice(0, TOP_CREATORS);
    saveCreatorsCache(creators);
    console.log('Got', creators.length, 'creators, saved to', CREATORS_CACHE);
  } else {
    creators = creators.slice(0, TOP_CREATORS);
    console.log('Loaded', creators.length, 'creators from cache');
  }

  const topCreators = creators;
  initHoldersCsv();

  let startIndex = 0;
  const progress = fresh ? null : loadProgress();
  if (progress && Array.isArray(progress.creators) && progress.creators.length === topCreators.length) {
    const match = progress.creators.every((c, i) => c === topCreators[i]);
    if (match && progress.lastProcessedIndex >= 0) {
      startIndex = progress.lastProcessedIndex + 1;
      console.log('Resuming from creator index', startIndex, '/', topCreators.length);
    }
  }

  const holderToBalance = loadHoldersFromCsv();
  if (holderToBalance.size > 0) console.log('Loaded', holderToBalance.size, 'holders from CSV cache');

  console.log('Fetching top', TOP_HOLDERS_PER_CREATOR, 'holders per creator...');
  for (let i = startIndex; i < topCreators.length; i++) {
    const username = topCreators[i];
    try {
      const data = await gqlQuery(TOKEN_BALANCES_QUERY, {
        first: TOP_HOLDERS_PER_CREATOR,
        orderBy: 'BALANCE_NANOS_DESC',
        filter: {
          isDaoCoin: { equalTo: false },
          creator: { username: { equalTo: username } },
        },
      });
      const nodes = data?.tokenBalances?.nodes ?? [];
      const holders = [];
      for (const n of nodes) {
        const pk = n?.holder?.publicKey;
        if (!pk) continue;
        const bal = Number(n?.holder?.desoLockedNanos ?? 0) / 1e9;
        holderToBalance.set(pk, (holderToBalance.get(pk) ?? 0) + bal);
        holders.push({ pk, balance: bal });
      }
      appendHoldersToCsv(username, holders);
      saveProgress(i, topCreators);
    } catch (e) {
      console.warn('  Skip', username, ':', e.message);
      saveProgress(i, topCreators);
    }
    if ((i + 1) % 50 === 0) console.log('  ', i + 1, '/', topCreators.length);
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log('Collected', holderToBalance.size, 'unique holders. Filtering already-tracked...');
  const tracked = parseTrackedPks();
  const toAdd = Array.from(holderToBalance.entries())
    .filter(([pk]) => !tracked.has(pk))
    .sort((a, b) => b[1] - a[1]);

  const entries = toAdd.map(([pk]) => {
    const suffix = pk.length >= 6 ? pk.slice(-6) : pk.slice(-4);
    return {
      username: '',
      displayName: `Others (…${suffix})`,
      classification: 'OTHERS',
      publicKeyBase58Check: pk,
    };
  });

  const outPath = join(__dirname, 'ccv1-top-holders-to-add.json');
  writeFileSync(outPath, JSON.stringify(entries, null, 2));
  console.log('Wrote', entries.length, 'entries to', outPath);
  console.log('Run: node scripts/gen-ccv1-wallet-entries.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
