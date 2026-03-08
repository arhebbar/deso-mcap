/**
 * Introspect DeSo GraphQL TransactionFilter and Transaction type to see if we can filter by recipient.
 */
const GQL = 'https://graphql-prod.deso.com/graphql';

const introspect = async (typeName) => {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { __type(name: "${typeName}") { name kind fields { name type { name kind ofType { name } } } inputFields { name type { name kind ofType { name } } } } }`,
    }),
  });
  const data = await res.json();
  return data?.data?.__type;
};

const main = async () => {
  console.log('=== TransactionFilter ===');
  const tf = await introspect('TransactionFilter');
  console.log(JSON.stringify(tf?.inputFields ?? tf, null, 2));

  console.log('\n=== Transaction (fields) ===');
  const txn = await introspect('Transaction');
  console.log(JSON.stringify(txn?.fields?.map((f) => ({ name: f.name, type: f.type?.name ?? f.type?.ofType?.name })) ?? txn, null, 2));

  // Try block rewards: txnType 1. Chain launched Jan 18 2021. Try Jan-Mar 2021.
  const since = '2021-01-18T00:00:00.000Z';
  const until = '2021-03-31T23:59:59.999Z';
  console.log('\n=== Sample: block rewards (txnType 1) Jan-Mar 2021, first 5 ===');
  const sampleRes = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query BlockRewardsJan2021 {
          transactions(first: 5, filter: {
            txnType: { equalTo: 1 }
            timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
          }) {
            totalCount
            pageInfo { hasNextPage }
            nodes {
              transactionHash
              txnType
              timestamp
              publicKey
              outputs
            }
          }
        }
      `,
    }),
  });
  const sampleData = await sampleRes.json();
  console.log(JSON.stringify(sampleData, null, 2));

  // Introspect affectedPublicKeys and outputs filter
  console.log('\n=== TransactionToManyAffectedPublicKeyFilter ===');
  const apk = await introspect('TransactionToManyAffectedPublicKeyFilter');
  console.log(JSON.stringify(apk?.inputFields ?? apk, null, 2));

  console.log('\n=== JSONFilter ===');
  const jf = await introspect('JSONFilter');
  console.log(JSON.stringify(jf?.inputFields ?? jf, null, 2));
};

main().catch(console.error);
