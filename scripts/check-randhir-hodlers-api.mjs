#!/usr/bin/env node
/**
 * Use get-hodlers-for-public-key with FetchHodlings=true (per DeSo frontend)
 * https://github.com/deso-protocol/frontend/blob/60cf5571269c01b13da618e214d35d7f2b5614f1/src/app/backend-api.service.ts#L1366
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const OPENFUND_PK = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';
const FOCUS_PK = 'BC1YLjEayZDjAPitJJX4Boy7LsEfN3sWAkYb3hgE9kGBirztsc2re1N';

function parseBal(e) {
  if (e.BalanceNanos != null) return e.BalanceNanos / NANOS_PER_DESO;
  if (e.BalanceNanosUint256) return parseInt(String(e.BalanceNanosUint256).replace(/^0x/, ''), 16) / NANOS_PER_DESO;
  return 0;
}

async function main() {
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const pk = (await profileRes.json())?.Profile?.PublicKeyBase58Check;
  if (!pk) {
    console.log('Randhir not found');
    return;
  }

  console.log('Calling get-hodlers-for-public-key with FetchHodlings=true, IsDAOCoin=true, FetchAll=true...');
  const res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeyBase58Check: pk,
      Username: '',
      LastPublicKeyBase58Check: '',
      NumToFetch: 1000,
      FetchHodlings: true,
      FetchAll: true,
      IsDAOCoin: true,
    }),
  });
  console.log('Status:', res.status);
  const data = await res.json();
  if (!res.ok) {
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
    return;
  }

  const hodlers = data?.Hodlers ?? [];
  console.log('Hodlers/Holdings count:', hodlers.length);

  let openfund = 0, focus = 0, deso = 0;
  const byToken = {};
  for (const h of hodlers) {
    const creatorKey = h.CreatorPublicKeyBase58Check;
    const amt = parseBal(h);
    const uname = h.ProfileEntryResponse?.Username ?? '?';
    if (creatorKey === OPENFUND_PK) openfund += amt;
    if (creatorKey === FOCUS_PK) focus += amt;
    byToken[uname] = (byToken[uname] ?? 0) + amt;
  }

  // DESO from get-users-stateless
  const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [pk],
      IncludeBalance: true,
    }),
  });
  const user = (await usersRes.json())?.UserList?.[0];
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

  console.log('\n--- Randhir main holdings ---');
  console.log('DESO:     ', (unstaked + staked).toFixed(4), '|', unstaked.toFixed(4), 'unstaked,', staked.toFixed(4), 'staked');
  console.log('Openfund: ', openfund.toFixed(4));
  console.log('Focus:    ', focus.toFixed(4));

  const KNOWN = { openfund: 'Openfund', open_fund: 'Openfund', focus: 'Focus', dusdc: 'dUSDC', dusdc_: 'dUSDC', dbtc: 'dBTC', deth: 'dETH', dsol: 'dSOL' };
  console.log('\nOther major tokens from hodlers:');
  for (const [uname, amt] of Object.entries(byToken)) {
    const key = uname.toLowerCase().replace(/-/g, '_');
    if (KNOWN[key] && amt > 0) {
      console.log(`  ${KNOWN[key]} (${uname}):`, amt.toFixed(4));
    }
  }
}

main();
