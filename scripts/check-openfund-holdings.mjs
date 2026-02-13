/**
 * Fetches Openfund holdings for all tracked accounts from DeSo API.
 * Uses get-hodlers-for-public-key to get holder list, then matches by username.
 * Run: node scripts/check-openfund-holdings.mjs
 */

const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

const ACCOUNTS = [
  { username: 'Gringotts_Wizarding_Bank', class: 'FOUNDATION' },
  { username: 'focus', class: 'FOUNDATION' },
  { username: 'openfund', class: 'FOUNDATION' },
  { username: 'Deso', class: 'FOUNDATION' },
  { username: 'AMM_DESO_24_PlAEU', class: 'AMM' },
  { username: 'AMM_DESO_23_GrYpe', class: 'AMM' },
  { username: 'AMM_focus_12_nzWku', class: 'AMM' },
  { username: 'AMM_openfund_12_gOR1b', class: 'AMM' },
  { username: 'AMM_DESO_19_W5vn0', class: 'AMM' },
  { username: 'AMM_openfund_13_1gbih', class: 'AMM' },
  { username: 'Whoami', class: 'FOUNDER' },
  { username: 'Nader', class: 'FOUNDER' },
  { username: 'Mossified', class: 'FOUNDER' },
  { username: 'LazyNina', class: 'FOUNDER' },
];

async function desoPost(endpoint, body) {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function parseBalance(entry) {
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DESO;
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return parseInt(hex, 16) / NANOS_PER_DESO;
  }
  return 0;
}

async function main() {
  const openfundProfile = await desoPost('/get-single-profile', { Username: 'openfund' });
  const openfundKey = openfundProfile?.Profile?.PublicKeyBase58Check;
  if (!openfundKey) {
    console.error('Could not fetch Openfund profile');
    process.exit(1);
  }

  const usernameToKey = new Map();
  for (const acc of ACCOUNTS) {
    try {
      const pr = await desoPost('/get-single-profile', { Username: acc.username });
      const pk = pr?.Profile?.PublicKeyBase58Check;
      if (pk) usernameToKey.set(acc.username.toLowerCase(), pk);
    } catch {}
  }

  let hodlers = [];
  try {
    const hodlersRes = await desoPost('/get-hodlers-for-public-key', {
      PublicKeyBase58Check: openfundKey,
      FetchAll: true,
    });
    hodlers = hodlersRes?.Hodlers ?? hodlersRes?.hodlers ?? [];
  } catch (e) {
    console.error('get-hodlers failed:', e.message);
  }
  const keyToBalance = new Map();
  for (const h of hodlers) {
    const bal = parseBalance(h);
    const pk = h.HodlerPublicKeyBase58Check ?? h.HodlerPublicKey ?? h.PublicKeyBase58Check;
    if (pk) keyToBalance.set(pk, (keyToBalance.get(pk) ?? 0) + bal);
  }

  const keyToUsername = new Map();
  for (const [un, pk] of usernameToKey) keyToUsername.set(pk, un);

  console.log('Openfund holdings for all tracked accounts:\n');
  console.log('Account'.padEnd(28) + 'Class'.padEnd(12) + 'Openfund'.padStart(20) + '  Source');
  console.log('-'.repeat(72));

  for (const acc of ACCOUNTS) {
    const pk = usernameToKey.get(acc.username.toLowerCase());
    if (!pk) {
      console.log(`${acc.username.padEnd(28)}${acc.class.padEnd(12)}${'N/A'.padStart(20)}  profile not found`);
      continue;
    }
    const bal = keyToBalance.get(pk) ?? 0;
    const formatted = bal >= 1_000_000
      ? `${(bal / 1_000_000).toFixed(2)}M`
      : bal >= 1_000
        ? `${(bal / 1_000).toFixed(1)}K`
        : bal.toFixed(2);
    const src = bal > 0 ? 'hodlers API' : '0 (or in AMM/DEX)';
    console.log(`${acc.username.padEnd(28)}${acc.class.padEnd(12)}${formatted.padStart(20)}  ${src}`);
  }

  console.log('\nNote: AMM wallets hold Openfund in liquidity pools (order-book/AMM),');
  console.log('not as direct creator-coin holdings, so they may show 0 from get-hodlers.');
}

main().catch((e) => { console.error(e); process.exit(1); });
