#!/usr/bin/env node
/** Simulate fetchWalletBalances and check Randhir's Openfund value */
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DAO_COIN = 1e18;

function parseDaoBalance(entry) {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    const nanos = BigInt('0x' + hex);
    return Number(nanos) / NANOS_PER_DAO_COIN;
  }
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DAO_COIN;
  return 0;
}

async function main() {
  // Get Randhir's PK
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const profileData = await profileRes.json();
  const randhirPk = profileData?.Profile?.PublicKeyBase58Check;
  if (!randhirPk) {
    console.log('No Randhir profile');
    return;
  }

  // Fetch openfund hodlers with pagination (same as walletApi)
  const tokenHoldingsByPk = new Map();
  let lastKey = '';
  let page = 0;
  for (;;) {
    const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: 'openfund',
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: 100,
        FetchAll: false,
        IsDAOCoin: true,
      }),
    });
    const data = await res.json();
    const hodlers = data?.Hodlers ?? [];
    for (const h of hodlers) {
      const pk = h.HODLerPublicKeyBase58Check;
      if (pk === randhirPk) {
        const amt = parseDaoBalance(h);
        console.log(`Page ${page}, Randhir entry:`, {
          BalanceNanos: h.BalanceNanos,
          BalanceNanosUint256: h.BalanceNanosUint256,
          parseDaoBalance: amt,
        });
      }
      if (pk) {
        const amt = parseDaoBalance(h);
        if (amt > 0) tokenHoldingsByPk.set(pk, (tokenHoldingsByPk.get(pk) ?? 0) + amt);
      }
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    page++;
    if (hodlers.length < 100 || !lastKey) break;
  }

  const randhirOpenfund = tokenHoldingsByPk.get(randhirPk) ?? 0;
  console.log('\nFinal Randhir Openfund balance:', randhirOpenfund);
  console.log('Expected: 440788.42');
}

main().catch(console.error);
