#!/usr/bin/env node
/**
 * Try get-hodlers-for-public-key with FetchHodlings=true to get all holdings including DEX
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const OPENFUND_PK = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';
const FOCUS_PK = 'BC1YLjEayZDjAPitJJX4Boy7LsEfN3sWAkYb3hgE9kGBirztsc2re1N';

async function main() {
  const profileRes = await fetch(`${DESO_NODE}/get-single-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: 'Randhir' }),
  });
  const pk = (await profileRes.json())?.Profile?.PublicKeyBase58Check;
  if (!pk) {
    console.log('Randhir not found');
    return;
  }

  console.log('Trying get-hodlers-for-public-key with FetchHodlings=true, IsDAOCoin=true...');
  const res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PublicKeyBase58Check: pk,
      FetchHodlings: true,
      IsDAOCoin: true,
      FetchAll: true,
    }),
  });
  console.log('Status:', res.status);
  if (!res.ok) {
    console.log(await res.text());
    return;
  }
  const data = await res.json();
  console.log('Keys:', Object.keys(data));
  const hodlings = data?.Hodlers ?? data?.hodlings ?? [];
  console.log('Hodlings count:', hodlings.length);

  function parseBal(e) {
    if (e.BalanceNanos != null) return e.BalanceNanos / NANOS_PER_DESO;
    if (e.BalanceNanosUint256) return parseInt(e.BalanceNanosUint256.replace(/^0x/, ''), 16) / NANOS_PER_DESO;
    return 0;
  }

  let openfund = 0, focus = 0;
  for (const h of hodlings) {
    const c = h.CreatorPublicKeyBase58Check ?? h.HODLerPublicKeyBase58Check;
    const amt = parseBal(h);
    if (c === OPENFUND_PK) openfund += amt;
    if (c === FOCUS_PK) focus += amt;
  }
  console.log('Openfund (from hodlers):', openfund);
  console.log('Focus (from hodlers):', focus);
}

main();
