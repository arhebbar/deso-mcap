#!/usr/bin/env node
const G = 'https://graphql-prod.deso.com/graphql';

async function introspect(name) {
  const r = await fetch(G, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "${name}") { name kind inputFields { name type { name kind } } enumValues { name } } }`,
    }),
  });
  const d = await r.json();
  return d?.data?.__type;
}

async function main() {
  const q = await introspect('Query');
  console.log('Query inputFields (accounts):', q?.inputFields?.filter((f) => f.name?.includes('account')));

  const conn = await introspect('AccountsConnection');
  console.log('\nAccountsConnection:', JSON.stringify(conn?.inputFields?.map((f) => f.name), null, 2));

  for (const name of ['AccountOrder', 'AccountsOrder', 'AccountOrderBy', 'OrderBy']) {
    const t = await introspect(name);
    if (t?.inputFields?.length) {
      console.log(`\n${name}:`, JSON.stringify(t.inputFields.map((f) => f.name), null, 2));
    }
  }

  const schema = await fetch(G, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __schema { queryType { fields(includeDeprecated: true) { name args { name type { name } } } } } }`,
    }),
  });
  const schemaData = await schema.json();
  const accountsField = schemaData?.data?.__schema?.queryType?.fields?.find((f) => f.name === 'accounts');
  console.log('\naccounts field args:', accountsField?.args?.map((a) => ({ name: a.name, type: a.type?.name, ofType: a.type?.ofType?.name })));

  const orderByType = accountsField?.args?.find((a) => a.name === 'orderBy')?.type;
  console.log('\norderBy type:', orderByType);
  if (orderByType?.name) {
    const orderType = await introspect(orderByType.name);
    console.log('orderBy type details:', JSON.stringify(orderType, null, 2));
  }
  if (orderByType?.ofType?.name) {
    const orderType = await introspect(orderByType.ofType.name);
    console.log('orderBy ofType details:', JSON.stringify(orderType, null, 2));
  }

  const orderBy = await introspect('AccountsOrderBy');
  console.log('\nAccountsOrderBy enum values:', orderBy?.enumValues?.map((e) => e.name));
}

main().catch(console.error);
