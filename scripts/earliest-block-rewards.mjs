const GQL = 'https://graphql-prod.deso.com/graphql';

const res = await fetch(GQL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query EarliestBlockRewards {
        transactions(first: 10, orderBy: TIMESTAMP_ASC, filter: { txnType: { equalTo: 1 } }) {
          totalCount
          nodes { transactionHash txnType timestamp publicKey outputs }
        }
      }
    `,
  }),
});
const d = await res.json();
console.log(JSON.stringify(d?.data?.transactions ?? d, null, 2));
