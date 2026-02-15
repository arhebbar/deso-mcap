#!/usr/bin/env node
/**
 * Verify creator keys for main tokens and scan Randhir's hodlings
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

const OPENFUND_PK = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';

async function getCreator(username) {
  const res = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.Profile?.PublicKeyBase58Check ?? null;
}

function parseBal(e) {
  if (e.BalanceNanos != null) return e.BalanceNanos / NANOS_PER_DESO;
  if (e.BalanceNanosUint256) return parseInt(e.BalanceNanosUint256.replace(/^0x/, ''), 16) / NANOS_PER_DESO;
  return 0;
}

async function main() {
  console.log('Main token creator keys:');
  const focusPk = await getCreator('focus');
  const openfundPk = await getCreator('openfund');
  console.log('  focus:   ', focusPk);
  console.log('  openfund:', openfundPk);
  console.log('  OPENFUND (const):', OPENFUND_PK);
  console.log('  openfund match:', openfundPk === OPENFUND_PK);

  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const pk = (await profileRes.json())?.Profile?.PublicKeyBase58Check;
  if (!pk) return;

  const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [pk],
      SkipForLeaderboard: false,
      IncludeBalance: true,
    }),
  });
  const user = (await usersRes.json())?.UserList?.[0];
  const hodls = user?.UsersYouHODL ?? [];

  console.log('\nRandhir hodlings matching Focus or Openfund creator keys:');
  let focusTotal = 0, openfundTotal = 0;
  for (const h of hodls) {
    const c = h.CreatorPublicKeyBase58Check;
    const amt = parseBal(h);
    const uname = h.ProfileEntryResponse?.Username ?? '?';
    if (c === focusPk) {
      focusTotal += amt;
      console.log('  FOCUS match:', uname, amt.toFixed(4));
    }
    if (c === openfundPk || c === OPENFUND_PK) {
      openfundTotal += amt;
      console.log('  OPENFUND match:', uname, amt.toFixed(4));
    }
  }
  console.log('  Focus total:', focusTotal.toFixed(4));
  console.log('  Openfund total:', openfundTotal.toFixed(4));

  const unstaked = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;
  console.log('\nDESO unstaked:', unstaked.toFixed(4));
}

main();
