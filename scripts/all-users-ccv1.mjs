#!/usr/bin/env node
/**
 * Fetch CCv1 holdings for all dashboard users (same method as walletApi).
 * Uses GraphQL creatorCoinBalances: sum(totalValueNanos/1e9) per holder.
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const GRAPHQL = 'https://graphql-prod.deso.com/graphql';
const NANOS = 1e9;

const WALLET_CONFIG = [
  { username: 'Gringotts_Wizarding_Bank', displayName: 'Gringotts_Wizarding_Bank' },
  { username: 'focus', displayName: 'focus' },
  { username: 'openfund', displayName: 'openfund' },
  { username: 'Randhir', displayName: 'Randhir (Me)', mergeKey: 'Randhir' },
  { username: 'RandhirStakingWallet', displayName: 'Randhir (Me)', mergeKey: 'Randhir' },
  { username: 'Krassenstein', displayName: 'Krassenstein' },
  { username: 'Gatucu', displayName: 'Gatucu' },
  { username: 'StarGeezer', displayName: 'StarGeezer', mergeKey: 'StarGeezer' },
  { username: 'SG_Vault', displayName: 'StarGeezer', mergeKey: 'StarGeezer' },
  { username: 'BeyondSocialValidator', displayName: 'StarGeezer', mergeKey: 'StarGeezer' },
  { username: 'Pixelangelo', displayName: 'Pixelangelo' },
  { username: 'Homey', displayName: 'Homey' },
  { username: 'Nader', displayName: 'Nader' },
  { username: 'Whoami', displayName: 'Whoami' },
  { username: 'Mossified', displayName: 'Mossified' },
  { username: 'LazyNina', displayName: 'LazyNina' },
  { username: 'HighKey', displayName: 'HighKey', mergeKey: 'HighKey' },
  { username: 'JordanLintz', displayName: 'HighKey', mergeKey: 'HighKey' },
  { username: 'LukeLintz', displayName: 'HighKey', mergeKey: 'HighKey' },
  { username: 'HighKeyValidator', displayName: 'HighKey', mergeKey: 'HighKey' },
  { username: 'DesocialWorld', displayName: 'DesocialWorld', mergeKey: 'DesocialWorld' },
  { username: '0xAustin', displayName: '0xAustin', mergeKey: '0xAustin' },
  { username: '0xVault', displayName: '0xAustin', mergeKey: '0xAustin' },
  { username: 'FedeDM', displayName: 'FedeDM', mergeKey: 'FedeDM' },
  { username: 'FedeDM_Guardian', displayName: 'FedeDM', mergeKey: 'FedeDM' },
  { username: 'ThisDayInMusicHistory', displayName: 'ThisDayInMusicHistory', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'MusicHeals', displayName: 'ThisDayInMusicHistory', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'EileenCoyle', displayName: 'EileenCoyle', mergeKey: 'EileenCoyle' },
  { username: 'EileenVault', displayName: 'EileenCoyle', mergeKey: 'EileenCoyle' },
  { username: 'WhaleDShark', displayName: 'WhaleDShark', mergeKey: 'WhaleDShark' },
  { username: 'WhaleDVault', displayName: 'WhaleDShark', mergeKey: 'WhaleDShark' },
  { username: 'mcMarsh', displayName: 'mcMarsh', mergeKey: 'mcMarsh' },
  { username: 'mcMarshstaking', displayName: 'mcMarsh', mergeKey: 'mcMarsh' },
  { username: 'jemarsh', displayName: 'mcMarsh', mergeKey: 'mcMarsh' },
  { username: 'ImJigarShah', displayName: 'ImJigarShah', mergeKey: 'ImJigarShah' },
  { username: 'thesarcasm', displayName: 'ImJigarShah', mergeKey: 'ImJigarShah' },
  { username: 'VishalGulia', displayName: 'VishalGulia', mergeKey: 'VishalGulia' },
  { username: 'VishalWallet', displayName: 'VishalGulia', mergeKey: 'VishalGulia' },
  { username: 'Crowd33', displayName: 'Crowd33', mergeKey: 'Crowd33' },
  { username: 'CrowdWallet', displayName: 'Crowd33', mergeKey: 'Crowd33' },
  { username: 'Krassenstein', displayName: 'Krassenstein' },
  { username: 'Kra_Wallet', displayName: 'Krassenstein', mergeKey: 'Krassenstein' },
  { username: 'HKrassenstein', displayName: 'Krassenstein', mergeKey: 'Krassenstein' },
  { username: 'TangledBrush918', displayName: 'TangledBrush918', mergeKey: 'TangledBrush918' },
  { username: 'Tangyshroom', displayName: 'TangledBrush918', mergeKey: 'TangledBrush918' },
  { username: 'ReihanRei', displayName: 'ReihanRei', mergeKey: 'ReihanRei' },
  { username: 'AlecsandrosRei', displayName: 'ReihanRei', mergeKey: 'ReihanRei' },
  { username: 'dennishlewis', displayName: 'dennishlewis', mergeKey: 'dennishlewis' },
  { username: 'desonocode', displayName: 'dennishlewis', mergeKey: 'dennishlewis' },
  { username: 'SafetyNet', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetStaking', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetFunding', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetValidator', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'JohnJardin', displayName: 'JohnJardin', mergeKey: 'JohnJardin' },
  { username: 'Capatin', displayName: 'JohnJardin', mergeKey: 'JohnJardin' },
  { username: 'GoldBerry', displayName: 'GoldBerry', mergeKey: 'GoldBerry' },
  { username: 'GoldberryWal', displayName: 'GoldBerry', mergeKey: 'GoldBerry' },
  { username: 'ryleesnet', displayName: 'ryleesnet', mergeKey: 'ryleesnet' },
  { username: 'rylee19', displayName: 'ryleesnet', mergeKey: 'ryleesnet' },
  { username: 'ryleesnetvalidator', displayName: 'ryleesnet', mergeKey: 'ryleesnet' },
  { username: 'Gabrielist', displayName: 'Gabrielist', mergeKey: 'Gabrielist' },
  { username: 'gabrielvault', displayName: 'Gabrielist', mergeKey: 'Gabrielist' },
  { username: 'SharkGang', displayName: 'SharkGang', mergeKey: 'SharkGang' },
  { username: 'Metaphilosopher', displayName: 'SharkGang', mergeKey: 'SharkGang' },
  { username: 'SharkToken', displayName: 'SharkGang', mergeKey: 'SharkGang' },
  { username: 'SharkBank', displayName: 'SharkGang', mergeKey: 'SharkGang' },
  { username: 'SharkCoin', displayName: 'SharkGang', mergeKey: 'SharkGang' },
];

async function getPk(username) {
  const res = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username }),
  });
  const d = await res.json();
  return d?.Profile?.PublicKeyBase58Check;
}

/** Per-user fetch avoids statement timeout (same as walletApi) */
async function fetchCcV1ForOnePk(pk) {
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
    if (d.errors) return 0;
    const nodes = d?.data?.creatorCoinBalances?.nodes ?? [];
    for (const n of nodes) total += parseFloat(n.totalValueNanos || 0) / NANOS;
    const conn = d?.data?.creatorCoinBalances;
    after = conn?.pageInfo?.hasNextPage ? conn?.pageInfo?.endCursor : null;
  } while (after);
  return total;
}

async function fetchCcV1ForPks(publicKeys) {
  const out = new Map();
  const CONCURRENCY = 5;
  for (let i = 0; i < publicKeys.length; i += CONCURRENCY) {
    const batch = publicKeys.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((pk) => fetchCcV1ForOnePk(pk).then((t) => ({ pk, t }))));
    for (const { pk, t } of results) if (t > 0) out.set(pk, t);
  }
  return out;
}

async function main() {
  console.log('Resolving public keys for', WALLET_CONFIG.length, 'configs...\n');
  const pkToConfig = new Map();
  for (const c of WALLET_CONFIG) {
    const pk = await getPk(c.username);
    if (pk) pkToConfig.set(pk, c);
  }
  const publicKeys = Array.from(pkToConfig.keys());
  console.log('Resolved', publicKeys.length, 'public keys\n');
  console.log('Fetching CCv1 via GraphQL (creatorCoinBalances, sum totalValueNanos/1e9)...\n');

  const ccv1ByPk = await fetchCcV1ForPks(publicKeys);

  const groupKeyToPks = new Map();
  for (const pk of publicKeys) {
    const c = pkToConfig.get(pk);
    const key = c.mergeKey ?? pk;
    const arr = groupKeyToPks.get(key) ?? [];
    arr.push(pk);
    groupKeyToPks.set(key, arr);
  }

  const byDisplayName = [];
  for (const [key, pks] of groupKeyToPks) {
    const c = pkToConfig.get(pks[0]);
    const total = pks.reduce((s, pk) => s + (ccv1ByPk.get(pk) ?? 0), 0);
    byDisplayName.push({ name: c.displayName, ccv1Deso: total });
  }
  byDisplayName.sort((a, b) => b.ccv1Deso - a.ccv1Deso);

  console.log('CCv1 value (DESO) by display name:\n');
  let grandTotal = 0;
  byDisplayName.forEach((r, i) => {
    if (r.ccv1Deso > 0) {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${r.name.padEnd(35)} ${r.ccv1Deso.toFixed(4)} DESO`);
      grandTotal += r.ccv1Deso;
    }
  });
  console.log('\n  Total CCv1 (tracked users):', grandTotal.toFixed(4), 'DESO');
}

main().catch(console.error);
