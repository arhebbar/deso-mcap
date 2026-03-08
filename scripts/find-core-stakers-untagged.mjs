#!/usr/bin/env node
/**
 * Find accounts staking >10K DESO in Core validators that are NOT yet tagged as
 * Core/Foundation/AMM/DeSo Bulls. Outputs candidates for adding as Core Affiliated.
 *
 * Usage: node scripts/find-core-stakers-untagged.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GQL = 'https://graphql-prod.deso.com/graphql';
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const MIN_CORE_STAKE_DESO = 10_000;

const CORE_VALIDATOR_USERNAMES = new Set([
  'LazyNina',
  'NOT_AN_AGI',
  'STAKE_TO_ME_OR_ELSE',
  'REVOLUTIONARY_STAKING',
  'simple_man_staking',
  'respect_for_yield',
  'AmericanStakers',
  'UtopianCondition',
  'yumyumstake',
  'DesoSpaceStation',
  'SAFU_Stake',
]);

const EXCLUDED_CLASSIFICATIONS = new Set([
  'FOUNDATION',
  'AMM',
  'FOUNDER',
  'DESO_BULL',
  'CORE_AFFILIATED',
  'EXCHANGE',
]);

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

async function desoPost(endpoint, body) {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeSo ${endpoint}: ${res.status}`);
  return res.json();
}

/** Fetch all stake entries (active + locked) from GraphQL */
async function fetchAllStakeNodes() {
  const all = [];
  const queries = [
    { key: 'stakeEntries', amountKey: 'stakeAmountNanos' },
    { key: 'lockedStakeEntries', amountKey: 'lockedAmountNanos' },
  ];

  for (const { key, amountKey } of queries) {
    let after = null;
    do {
      const query = `
        query($after: Cursor) {
          ${key}(first: 100, after: $after) {
            nodes {
              stakerPkid
              ${amountKey}
              validatorEntry { account { publicKey } }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;
      const data = await gqlQuery(query, { after });
      const conn = data?.[key];
      const nodes = conn?.nodes ?? [];
      for (const n of nodes) {
        const stakerPk = n.stakerPkid ?? '';
        const vPk = n.validatorEntry?.account?.publicKey ?? '';
        const nanos = Number(n[amountKey] ?? 0);
        if (stakerPk && vPk && nanos > 0) {
          all.push({ stakerPk, validatorPk: vPk, amountNanos: nanos });
        }
      }
      const hasNext = conn?.pageInfo?.hasNextPage ?? false;
      after = hasNext ? conn?.pageInfo?.endCursor ?? null : null;
      if (after) await new Promise((r) => setTimeout(r, 80));
    } while (after);
  }
  return all;
}

/** Resolve public keys to usernames via get-users-stateless (batched) */
async function fetchUsernamesForPks(pks) {
  const out = new Map();
  const BATCH = 100;
  for (let i = 0; i < pks.length; i += BATCH) {
    const batch = pks.slice(i, i + BATCH);
    const res = await desoPost('/get-users-stateless', {
      PublicKeysBase58Check: batch,
      SkipForLeaderboard: true,
    });
    const list = res?.UserList ?? [];
    for (const u of list) {
      const pk = u.PublicKeyBase58Check;
      const username = u.ProfileEntryResponse?.Username ?? u.Profile?.Username;
      if (pk && username) out.set(pk, username);
    }
    if (i + BATCH < pks.length) await new Promise((r) => setTimeout(r, 100));
  }
  return out;
}

/** Parse walletApi.ts to extract tracked config (publicKeyBase58Check + usernames) */
function parseTrackedConfig() {
  const walletPath = join(__dirname, '..', 'src', 'api', 'walletApi.ts');
  const content = readFileSync(walletPath, 'utf8');

  const tracked = { pks: new Set(), usernames: new Set() };
  const configMatch = content.match(/const WALLET_CONFIG[^[]*\[([\s\S]*?)\];/);
  if (!configMatch) return tracked;

  const configBlock = configMatch[1];
  const pkRegex = /publicKeyBase58Check:\s*['"](BC1Y[A-Za-z0-9]+)['"]/g;
  let m;
  while ((m = pkRegex.exec(configBlock)) !== null) {
    tracked.pks.add(m[1]);
  }

  const usernameRegex = /username:\s*['"]([^'"]+)['"]/g;
  while ((m = usernameRegex.exec(configBlock)) !== null) {
    tracked.usernames.add(m[1]);
  }

  return tracked;
}

/** Resolve usernames to public keys via get-single-profile */
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
    for (const pk of results) {
      if (pk) out.add(pk);
    }
    if (i + BATCH < list.length) await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

async function main() {
  console.log('Fetching all stake entries (active + locked)...');
  const nodes = await fetchAllStakeNodes();
  console.log(`  Total entries: ${nodes.length}`);

  const byValidatorStaker = new Map();
  for (const { stakerPk, validatorPk, amountNanos } of nodes) {
    let byStaker = byValidatorStaker.get(validatorPk);
    if (!byStaker) {
      byStaker = new Map();
      byValidatorStaker.set(validatorPk, byStaker);
    }
    byStaker.set(stakerPk, (byStaker.get(stakerPk) ?? 0) + amountNanos);
  }

  const validatorPks = Array.from(byValidatorStaker.keys());
  console.log('Resolving validator usernames...');
  const validatorNames = await fetchUsernamesForPks(validatorPks);

  const coreValidatorPks = new Set();
  for (const [pk, name] of validatorNames) {
    if (CORE_VALIDATOR_USERNAMES.has(name)) {
      coreValidatorPks.add(pk);
    }
  }
  console.log(`  Core validators: ${coreValidatorPks.size} (${[...coreValidatorPks].map((p) => validatorNames.get(p)).join(', ')})`);

  const stakerCoreStake = new Map();
  for (const [validatorPk, byStaker] of byValidatorStaker) {
    if (!coreValidatorPks.has(validatorPk)) continue;
    for (const [stakerPk, amountNanos] of byStaker) {
      stakerCoreStake.set(stakerPk, (stakerCoreStake.get(stakerPk) ?? 0) + amountNanos);
    }
  }

  const over10k = [];
  for (const [pk, nanos] of stakerCoreStake) {
    const deso = nanos / NANOS_PER_DESO;
    if (deso > MIN_CORE_STAKE_DESO) {
      over10k.push({ pk, deso });
    }
  }
  over10k.sort((a, b) => b.deso - a.deso);
  console.log(`\nStakers with >${MIN_CORE_STAKE_DESO.toLocaleString()} DESO in Core validators: ${over10k.length}`);

  console.log('Building tracked set (Foundation/AMM/Founder/DeSo Bulls/Core Affiliated/Exchange)...');
  const { pks: trackedPks, usernames } = parseTrackedConfig();
  const resolvedPks = await resolveUsernamesToPks(usernames);
  const allTracked = new Set([...trackedPks, ...resolvedPks]);
  console.log(`  Tracked PKs: ${allTracked.size} (${trackedPks.size} from config + ${resolvedPks.size} from usernames)`);

  const untagged = over10k.filter(({ pk }) => !allTracked.has(pk));
  console.log(`\n=== UNTAGGED (not yet Core/Foundation/AMM/DeSo Bulls): ${untagged.length} ===`);

  if (untagged.length === 0) {
    console.log('  None. All >10K Core stakers are already tagged.');
    return;
  }

  console.log('\nAdd these as Core Affiliated in src/api/walletApi.ts WALLET_CONFIG:\n');
  for (const { pk, deso } of untagged) {
    const suffix = pk.length >= 6 ? pk.slice(-6) : pk.slice(-4);
    const displayName = `Core Affiliated (…${suffix})`;
    console.log(`  { username: '', displayName: '${displayName}', classification: 'CORE_AFFILIATED', publicKeyBase58Check: '${pk}' },  // ${deso.toLocaleString(undefined, { maximumFractionDigits: 0 })} DESO staked in Core`);
  }
}

main().catch(console.error);
