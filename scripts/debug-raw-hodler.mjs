#!/usr/bin/env node
/** Check raw get-hodlers response for Randhir (uses blockproducer like Openfund) */
const DESO_NODE = 'https://node.deso.org/api/v0';
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';

async function main() {
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const profileData = await profileRes.json();
  const randhirPk = profileData?.Profile?.PublicKeyBase58Check;

  const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: 'openfund',
      LastPublicKeyBase58Check: '',
      NumToFetch: 2000,
      FetchAll: false,
      IsDAOCoin: true,
    }),
  });
  const data = await res.json();
  const hodlers = data?.Hodlers ?? [];
  const r = hodlers.find((h) => h.HODLerPublicKeyBase58Check === randhirPk);
  if (r) {
    console.log('Raw hodler entry for Randhir:', JSON.stringify(r, null, 2));
    console.log('\nBalanceNanos:', r.BalanceNanos);
    console.log('BalanceNanosUint256:', r.BalanceNanosUint256);
    if (r.BalanceNanosUint256) {
      const hex = r.BalanceNanosUint256.replace(/^0x/, '');
      const parsed = parseInt(hex, 16);
      console.log('Parsed (decimal):', parsed);
      console.log('Divided by 1e9:', parsed / 1e9);
      console.log('Divided by 1e18:', parsed / 1e18);
    }
  } else {
    console.log('Randhir not in first 2000 hodlers');
  }
}

main().catch(console.error);
