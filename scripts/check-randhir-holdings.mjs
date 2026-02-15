#!/usr/bin/env node
/**
 * Fetch and display ALL holdings for Randhir from DeSo API
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

function parseBalance(entry) {
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DESO;
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return parseInt(hex, 16) / NANOS_PER_DESO;
  }
  return 0;
}

async function main() {
  console.log('Fetching all holdings for Randhir...\n');

  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  if (!profileRes.ok) {
    console.log('Profile error:', profileRes.status);
    return;
  }
  const profileData = await profileRes.json();
  const pk = profileData?.Profile?.PublicKeyBase58Check;
  if (!pk) {
    console.log('No public key found');
    return;
  }

  const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [pk],
      SkipForLeaderboard: false,
      IncludeBalance: true,
    }),
  });
  if (!usersRes.ok) {
    console.log('Users error:', usersRes.status);
    return;
  }
  const usersData = await usersRes.json();
  const user = usersData?.UserList?.[0];
  if (!user) {
    console.log('No user data');
    return;
  }

  const desoNanos = user.DESOBalanceNanos ?? user.BalanceNanos ?? 0;
  const deso = desoNanos / NANOS_PER_DESO;
  console.log('=== DESO (native) ===');
  console.log(`${deso.toFixed(4)} DESO\n`);

  const hodls = user.UsersYouHODL ?? [];
  console.log(`=== Creator coins / DAO tokens (${hodls.length} total) ===\n`);

  const holdings = hodls
    .map((h) => ({
      creator: h.ProfileEntryResponse?.Username ?? h.CreatorPublicKeyBase58Check?.slice(0, 12),
      amount: parseBalance(h),
    }))
    .filter((h) => h.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const fmt = (n) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(2)}K` :
    n.toFixed(4);

  console.log('Token/Creator          | Amount');
  console.log('----------------------|----------');
  for (const h of holdings) {
    console.log(`${h.creator.padEnd(21)} | ${fmt(h.amount)}`);
  }
}

main();
