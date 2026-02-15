#!/usr/bin/env node
/**
 * Debug: Find Randhir's main token holdings by creator public key
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

// Known creator usernames for main tokens (fetch their public keys first)
const CREATOR_USERNAMES = ['openfund', 'open_fund', 'focus', 'dusdc', 'dusdc_', 'dbtc', 'deth', 'dsol'];

async function getCreatorKey(username) {
  const res = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.Profile?.PublicKeyBase58Check ?? null;
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
  console.log('Building creator key map...');
  const keyToToken = {};
  for (const uname of CREATOR_USERNAMES) {
    const pk = await getCreatorKey(uname);
    if (pk) {
      const token = uname === 'openfund' || uname === 'open_fund' ? 'Openfund' :
        uname === 'focus' ? 'Focus' : uname === 'dusdc' || uname === 'dusdc_' ? 'dUSDC' :
        uname === 'dbtc' ? 'dBTC' : uname === 'deth' ? 'dETH' : uname === 'dsol' ? 'dSOL' : uname;
      keyToToken[pk] = token;
    }
  }
  console.log('Creator keys:', Object.keys(keyToToken).length);

  // Randhir profile
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const profileData = await profileRes.json();
  const pk = profileData?.Profile?.PublicKeyBase58Check;
  if (!pk) {
    console.log('Randhir not found');
    return;
  }

  // get-users-stateless
  const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [pk],
      SkipForLeaderboard: false,
      IncludeBalance: true,
    }),
  });
  const usersData = await usersRes.json();
  const user = usersData?.UserList?.[0];

  const unstaked = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;

  const stakeRes = await fetch(`${DESO_NODE}/get-stake-entries-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PublicKeyBase58Check: pk }),
  });
  let staked = 0;
  if (stakeRes.ok) {
    const stakeData = await stakeRes.json();
    staked = (stakeData.StakeEntries ?? []).reduce(
      (sum, e) => sum + (e.StakeNanos ?? 0) / NANOS_PER_DESO,
      0
    );
  }

  const major = { DESO: unstaked + staked, Openfund: 0, Focus: 0, dUSDC: 0, dBTC: 0, dETH: 0, dSOL: 0 };

  // Match by creator key in UsersYouHODL
  const hodls = user?.UsersYouHODL ?? [];
  for (const h of hodls) {
    const creatorKey = h.CreatorPublicKeyBase58Check;
    const token = keyToToken[creatorKey];
    if (token && token !== 'DESO') {
      major[token] = (major[token] ?? 0) + parseBalance(h);
    }
  }

  // get-hodlings-for-public-key (DEX-held)
  const hodlRes = await fetch(`${DESO_NODE}/get-hodlings-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PublicKeyBase58Check: pk }),
  });
  console.log('get-hodlings status:', hodlRes.status);
  if (hodlRes.ok) {
    const hodlData = await hodlRes.json();
    const hodlings = hodlData?.Hodlings ?? hodlData?.hodlings ?? [];
    console.log('Hodlings count:', hodlings.length);
    for (const h of hodlings) {
      const creatorKey = h.CreatorPublicKeyBase58Check;
      const token = keyToToken[creatorKey];
      if (token) {
        major[token] = (major[token] ?? 0) + parseBalance(h);
      }
    }
  }

  console.log('\n--- Randhir main holdings (by creator public key) ---');
  console.log('DESO:', major.DESO?.toFixed(4), '| unstaked:', unstaked.toFixed(4), '| staked:', staked.toFixed(4));
  console.log('Openfund:', major.Openfund?.toFixed(4));
  console.log('Focus:', major.Focus?.toFixed(4));
  console.log('dUSDC:', major.dUSDC?.toFixed(4));
  console.log('dBTC:', major.dBTC?.toFixed(4));
  console.log('dETH:', major.dETH?.toFixed(4));
  console.log('dSOL:', major.dSOL?.toFixed(4));

  // Also show hodlings that have similar names (might be different creators)
  console.log('\n--- Hodlings with "openfund"/"focus"/"dusdc" in creator username ---');
  for (const h of hodls) {
    const uname = (h.ProfileEntryResponse?.Username ?? '').toLowerCase();
    if (uname.includes('openfund') || uname.includes('focus') || uname === 'dusdc' || uname === 'dusdc_' ||
        uname === 'dbtc' || uname === 'deth' || uname === 'dsol') {
      console.log(`  ${h.ProfileEntryResponse?.Username}: ${parseBalance(h).toFixed(4)} (key: ${h.CreatorPublicKeyBase58Check?.slice(0, 12)}...)`);
    }
  }
}

main();
