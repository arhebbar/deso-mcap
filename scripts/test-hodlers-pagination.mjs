#!/usr/bin/env node
/** Verify get-hodlers pagination - check LastPublicKeyBase58Check in response */
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';

async function main() {
  console.log('Fetching first page (NumToFetch: 100)...\n');
  const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: 'openfund',
      LastPublicKeyBase58Check: '',
      NumToFetch: 100,
      FetchAll: false,
      IsDAOCoin: true,
    }),
  });
  const data = await res.json();
  const hodlers = data?.Hodlers ?? [];
  const lastKey = data?.LastPublicKeyBase58Check;

  console.log('Hodlers count:', hodlers.length);
  console.log('LastPublicKeyBase58Check in response:', lastKey ? `yes (${lastKey.slice(0, 20)}...)` : 'NO/MISSING');
  console.log('Top-level keys in response:', Object.keys(data));

  if (hodlers.length > 0) {
    const lastHodlerPk = hodlers[hodlers.length - 1]?.HODLerPublicKeyBase58Check;
    console.log('\nLast hodler in array:', lastHodlerPk?.slice(0, 20) + '...');
    console.log('Matches LastPublicKeyBase58Check:', lastHodlerPk === lastKey);
  }

  if (lastKey && hodlers.length === 100) {
    console.log('\n--- Fetching second page with LastPublicKeyBase58Check ---');
    const res2 = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
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
    const data2 = await res2.json();
    const hodlers2 = data2?.Hodlers ?? [];
    console.log('Second page hodlers:', hodlers2.length);
    if (hodlers2.length > 0) {
      const firstPk = hodlers2[0]?.HODLerPublicKeyBase58Check;
      console.log('First hodler on page 2:', firstPk?.slice(0, 20) + '...');
      console.log('Different from page 1 last?', firstPk !== lastKey);
    }
  }
}

main().catch(console.error);
