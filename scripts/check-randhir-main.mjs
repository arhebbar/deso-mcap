#!/usr/bin/env node
/**
 * Randhir's main holdings only: DESO (staked/unstaked), Openfund, Focus, dUSDC, dBTC, dETH, dSOL
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const OPENFUND_PUBLIC_KEY = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';

const KNOWN_TOKEN_NAMES = {
  focus: 'Focus',
  openfund: 'Openfund',
  open_fund: 'Openfund',
  dusdc: 'dUSDC',
  dusdc_: 'dUSDC',
  dbtc: 'dBTC',
  deth: 'dETH',
  dsol: 'dSOL',
};

function parseBalance(entry) {
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DESO;
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return parseInt(hex, 16) / NANOS_PER_DESO;
  }
  return 0;
}

function toTokenName(username) {
  const key = (username ?? '').toLowerCase().replace(/-/g, '_').trim();
  return KNOWN_TOKEN_NAMES[key] ?? null;
}

async function main() {
  console.log("Randhir's main holdings\n");
  console.log('Token       | Amount      | Notes');
  console.log('------------|-------------|------');

  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const profileData = await profileRes.json();
  const pk = profileData?.Profile?.PublicKeyBase58Check;
  if (!pk) {
    console.log('No profile found');
    return;
  }

  // DESO staked/unstaked
  const balanceRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [pk],
      IncludeBalance: true,
    }),
  });
  const balanceData = await balanceRes.json();
  const user = balanceData?.UserList?.[0];
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

  const totalDeso = unstaked + staked;
  console.log(`DESO        | ${totalDeso.toFixed(4)}       | ${unstaked.toFixed(4)} unstaked, ${staked.toFixed(4)} staked`);

  // Major tokens from UsersYouHODL
  const hodls = user?.UsersYouHODL ?? [];
  const major = {};
  for (const h of hodls) {
    const username = h.ProfileEntryResponse?.Username;
    const tokenName = toTokenName(username);
    if (tokenName) {
      const amt = parseBalance(h);
      major[tokenName] = (major[tokenName] ?? 0) + amt;
    }
  }

  // Openfund from get-hodlings (DEX-held)
  const hodlRes = await fetch(`${DESO_NODE}/get-hodlings-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PublicKeyBase58Check: pk }),
  });
  if (hodlRes.ok) {
    const hodlData = await hodlRes.json();
    const hodlings = hodlData?.Hodlings ?? hodlData?.hodlings ?? [];
    const of = hodlings.find((h) => h.CreatorPublicKeyBase58Check === OPENFUND_PUBLIC_KEY);
    if (of) {
      const amt = parseBalance(of);
      major['Openfund'] = (major['Openfund'] ?? 0) + amt;
    }
  }

  const tokens = ['Openfund', 'Focus', 'dUSDC', 'dBTC', 'dETH', 'dSOL'];
  for (const t of tokens) {
    const amt = major[t] ?? 0;
    const str = amt >= 1_000_000 ? `${(amt / 1_000_000).toFixed(2)}M` : amt >= 1_000 ? `${(amt / 1_000).toFixed(2)}K` : amt.toFixed(4);
    if (amt > 0) {
      console.log(`${t.padEnd(11)} | ${str.padStart(11)} |`);
    } else {
      console.log(`${t.padEnd(11)} | 0           |`);
    }
  }
}

main();
