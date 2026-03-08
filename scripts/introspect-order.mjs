const GQL = 'https://graphql-prod.deso.com/graphql';
const res = await fetch(GQL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'query { __type(name: "TransactionsOrderBy") { enumValues { name } } }',
  }),
});
const d = await res.json();
console.log(d?.data?.__type?.enumValues?.map((e) => e.name));
