const introspect = async (typeName) => {
  const res = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "${typeName}") { name kind fields { name type { name kind ofType { name } } } inputFields { name type { name } } } }`,
    }),
  });
  const data = await res.json();
  return data?.data?.__type;
};

const main = async () => {
  console.log('=== LockedStakeEntry ===');
  const lse = await introspect('LockedStakeEntry');
  console.log(JSON.stringify(lse, null, 2));

  console.log('\n=== StakeEntry ===');
  const se = await introspect('StakeEntry');
  console.log(JSON.stringify(se, null, 2));

  console.log('\n=== Query: lockedStakeEntries args ===');
  const qRes = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "Query") { fields(includeDeprecated: true) { name args { name type { name } } } } }`,
    }),
  });
  const qData = await qRes.json();
  const lockedField = qData?.data?.__type?.fields?.find((f) => f.name === 'lockedStakeEntries');
  console.log('lockedStakeEntries:', JSON.stringify(lockedField, null, 2));

  // Try validatorLockedStakeEntries - maybe on ValidatorEntry?
  console.log('\n=== ValidatorEntry ===');
  const ve = await introspect('ValidatorEntry');
  console.log(JSON.stringify(ve, null, 2));

  console.log('\n=== StakeEntryFilter ===');
  const sef = await introspect('StakeEntryFilter');
  console.log(JSON.stringify(sef, null, 2));

  console.log('\n=== AccountFilter ===');
  const af = await introspect('AccountFilter');
  console.log(JSON.stringify(af, null, 2));
  console.log('\n=== StringFilter ===');
  const sf = await introspect('StringFilter');
  console.log(JSON.stringify(sf, null, 2));

  console.log('\n=== LockedStakeEntryFilter ===');
  const lsef = await introspect('LockedStakeEntryFilter');
  console.log(JSON.stringify(lsef, null, 2));

  // Test: get all locked stake entries (no filter)
  console.log('\n=== Test: lockedStakeEntries first 5 ===');
  const testRes = await fetch('https://graphql-prod.deso.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { lockedStakeEntries(first: 5) { nodes { stakerPkid validatorPkid lockedAmountNanos staker { publicKey } validatorEntry { account { publicKey } } } } }`,
    }),
  });
  const testData = await testRes.json();
  console.log(JSON.stringify(testData, null, 2));
};

main().catch(console.error);
