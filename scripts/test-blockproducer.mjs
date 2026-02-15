#!/usr/bin/env node
/** Test blockproducer.deso.org get-hodlers API (same as Openfund uses) */
const BLOCKPRODUCER = 'https://blockproducer.deso.org/api/v0';
const NODE = 'https://node.deso.org/api/v0';

async function fetchHodlers(baseUrl) {
  const res = await fetch(`${baseUrl}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: 'openfund',
      LastPublicKeyBase58Check: '',
      NumToFetch: 5,
      IsDAOCoin: true,
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  return { ok: true, hodlers: data?.Hodlers?.length ?? 0, data };
}

async function main() {
  console.log('Testing blockproducer.deso.org (Openfund uses this)...\n');
  const bp = await fetchHodlers(BLOCKPRODUCER);
  console.log('blockproducer.deso.org:', bp.ok ? `OK, ${bp.hodlers} hodlers` : `FAIL ${bp.status}`);
  if (bp.ok && bp.data?.Hodlers?.[0]) {
    const h = bp.data.Hodlers[0];
    console.log('  First holder:', h.ProfileEntryResponse?.Username ?? h.HODLerPublicKeyBase58Check?.slice(0, 12));
    console.log('  BalanceNanos:', h.BalanceNanos);
  }

  console.log('\nComparing with node.deso.org...');
  const nd = await fetchHodlers(NODE);
  console.log('node.deso.org:', nd.ok ? `OK, ${nd.hodlers} hodlers` : `FAIL ${nd.status}`);
  if (nd.ok && nd.data?.Hodlers?.[0]) {
    const h = nd.data.Hodlers[0];
    console.log('  First holder:', h.ProfileEntryResponse?.Username ?? h.HODLerPublicKeyBase58Check?.slice(0, 12));
    console.log('  BalanceNanos:', h.BalanceNanos);
  }
}

main().catch(console.error);
