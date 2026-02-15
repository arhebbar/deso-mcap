#!/usr/bin/env node
/**
 * Debug: What does the NEW method return for Randhir?
 * Uses get-hodlers-for-public-key with token Username (openfund, focus, etc.)
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

const TOKEN_USERNAMES = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

function parseBalance(entry) {
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DESO;
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return parseInt(hex, 16) / NANOS_PER_DESO;
  }
  return 0;
}

async function fetchTokenHolders(tokenUsername) {
  const out = new Map();
  let lastKey = '';
  for (;;) {
    const res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: tokenUsername,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: 100,
        FetchAll: false,
        IsDAOCoin: true,
      }),
    });
    const status = res.status;
    if (!res.ok) {
      return { status, error: await res.text(), holders: new Map() };
    }
    const data = await res.json();
    const hodlers = data?.Hodlers ?? [];
    for (const h of hodlers) {
      const pk = h.HODLerPublicKeyBase58Check;
      if (pk) {
        const amt = parseBalance(h);
        if (amt > 0) out.set(pk, (out.get(pk) ?? 0) + amt);
      }
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    if (hodlers.length < 100 || !lastKey) break;
  }
  return { status: 200, holders: out };
}

async function main() {
  console.log("=== Debug: Randhir via NEW method (get-hodlers-for-public-key per token) ===\n");

  // 1. Get Randhir's public key
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const profileData = await profileRes.json();
  const randhirPk = profileData?.Profile?.PublicKeyBase58Check;
  if (!randhirPk) {
    console.log("ERROR: Could not get Randhir's profile/public key");
    console.log("Profile response:", JSON.stringify(profileData, null, 2));
    return;
  }
  console.log("Randhir public key:", randhirPk);
  console.log();

  // 2. For each token, fetch holders and check if Randhir is in the list
  const tokenBalances = {};
  for (const { username, tokenName } of TOKEN_USERNAMES) {
    const result = await fetchTokenHolders(username);
    if (result.status !== 200) {
      console.log(`${tokenName} (${username}): API error ${result.status} - ${result.error}`);
      continue;
    }
    const amt = result.holders.get(randhirPk) ?? 0;
    tokenBalances[tokenName] = amt;
    const inList = result.holders.has(randhirPk);
    const totalHolders = result.holders.size;
    console.log(`${tokenName} (username: "${username}"): ${amt > 0 ? amt.toFixed(4) : '0'} | Randhir in list: ${inList} | Total holders fetched: ${totalHolders}`);
  }

  // 3. DESO (get-users-stateless + stake)
  console.log("\n--- DESO ---");
  const usersRes = await fetch(`${DESO_NODE}/get-users-stateless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeysBase58Check: [randhirPk],
      IncludeBalance: true,
    }),
  });
  const usersData = await usersRes.json();
  const user = usersData?.UserList?.[0];
  const unstaked = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;

  const stakeRes = await fetch(`${DESO_NODE}/get-stake-entries-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PublicKeyBase58Check: randhirPk }),
  });
  let staked = 0;
  if (stakeRes.ok) {
    const stakeData = await stakeRes.json();
    staked = (stakeData.StakeEntries ?? []).reduce(
      (sum, e) => sum + (e.StakeNanos ?? 0) / NANOS_PER_DESO,
      0
    );
  }

  console.log("get-users-stateless UserList length:", usersData?.UserList?.length ?? 0);
  console.log("UserList[0] keys:", user ? Object.keys(user) : 'N/A');
  console.log("DESO unstaked:", unstaked);
  console.log("DESO staked:", staked);
  console.log("DESO total:", unstaked + staked);

  // 4. Summary - what would the app show?
  console.log("\n=== SUMMARY: What the app would show for Randhir ===");
  const balances = { ...tokenBalances };
  if (unstaked + staked > 0) balances['DESO'] = unstaked + staked;
  console.log(JSON.stringify(balances, null, 2));
  const hasAny = Object.values(balances).some((v) => v > 0);
  console.log("\nHas any holdings:", hasAny);
}

main().catch(console.error);
