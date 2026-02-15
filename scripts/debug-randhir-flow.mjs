#!/usr/bin/env node
/**
 * Minimal debug: Simulate fetchWalletBalances flow for Randhir only.
 * Uses only Openfund (1 token) to keep it fast.
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;

async function desoPost(endpoint, body) {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status}`);
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
  console.log("=== Simulating fetchWalletBalances for Randhir ===\n");

  // 1. Get Randhir's public key (like step 1 in fetchWalletBalances)
  const profileRes = await desoPost('/get-single-profile', { Username: 'Randhir' });
  const randhirPk = profileRes?.Profile?.PublicKeyBase58Check;
  if (!randhirPk) {
    console.log("FAIL: No profile for Randhir");
    return;
  }
  console.log("1. Randhir PK:", randhirPk);

  // 2. Fetch Openfund holders (like step 2 - one token only)
  const trackedByPk = new Map([[randhirPk, { displayName: 'Randhir (Me)', classification: 'DESO_BULL' }]]);
  const tokenHoldingsByPk = new Map();

  const res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: 'openfund',
      LastPublicKeyBase58Check: '',
      NumToFetch: 1500,
      FetchAll: false,
      IsDAOCoin: true,
    }),
  });
  const data = await res.json();
  const hodlers = data?.Hodlers ?? [];
  console.log("2. Openfund hodlers fetched:", hodlers.length);

  for (const h of hodlers) {
    const pk = h.HODLerPublicKeyBase58Check;
    if (pk && trackedByPk.has(pk)) {
      const amt = parseBalance(h);
      if (amt > 0) {
        let m = tokenHoldingsByPk.get(pk);
        if (!m) {
          m = new Map();
          tokenHoldingsByPk.set(pk, m);
        }
        m.set('Openfund', (m.get('Openfund') ?? 0) + amt);
      }
    }
  }

  console.log("3. tokenHoldingsByPk for Randhir:", tokenHoldingsByPk.get(randhirPk));
  const tokenMap = tokenHoldingsByPk.get(randhirPk);
  const openfundAmt = tokenMap?.get('Openfund') ?? 0;
  console.log("4. Randhir Openfund balance:", openfundAmt);

  // 5. get-users-stateless
  const usersRes = await desoPost('/get-users-stateless', {
    PublicKeysBase58Check: [randhirPk],
    SkipForLeaderboard: false,
    IncludeBalance: true,
  });
  const usersList = usersRes?.UserList ?? [];
  const user = usersList.find((u) => u.PublicKeyBase58Check === randhirPk);
  console.log("5. UserList length:", usersList.length);
  console.log("   UserList[0] PublicKeyBase58Check:", usersList[0]?.PublicKeyBase58Check);
  console.log("   find by pk match:", !!user);
  console.log("   DESOBalanceNanos:", user?.DESOBalanceNanos);
  console.log("   BalanceNanos:", user?.BalanceNanos);

  // 6. Final result
  const balances = {};
  if (openfundAmt > 0) balances['Openfund'] = openfundAmt;
  const desoNanos = user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0;
  const deso = desoNanos / NANOS_PER_DESO;
  if (deso > 0) balances['DESO'] = deso;

  console.log("\n=== FINAL: What would be returned for Randhir ===");
  console.log(JSON.stringify({ name: 'Randhir (Me)', classification: 'DESO_BULL', balances }, null, 2));
}

main().catch(console.error);
