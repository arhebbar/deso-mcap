#!/usr/bin/env node
/** Test: paginate through ALL openfund hodlers and count; also try FetchAll: true */
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';

async function fetchAllPaginated() {
  const out = new Map();
  let lastKey = '';
  let pages = 0;
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
      if (pk) out.set(pk, (out.get(pk) ?? 0) + 1);
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    pages++;
    if (hodlers.length < 100 || !lastKey) break;
  }
  return { count: out.size, pages };
}

async function fetchWithFetchAll() {
  const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: 'openfund',
      LastPublicKeyBase58Check: '',
      NumToFetch: 100,
      FetchAll: true,
      IsDAOCoin: true,
    }),
  });
  const data = await res.json();
  const hodlers = data?.Hodlers ?? [];
  return hodlers.length;
}

async function main() {
  console.log('1. Paginated fetch (our current logic):');
  const { count, pages } = await fetchAllPaginated();
  console.log(`   Total unique hodlers: ${count}, pages: ${pages}`);

  console.log('\n2. FetchAll: true (single request):');
  try {
    const fetchAllCount = await fetchWithFetchAll();
    console.log(`   Hodlers returned: ${fetchAllCount}`);
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

main().catch(console.error);
