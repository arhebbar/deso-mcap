const q = `
query Introspection {
  __schema {
    queryType {
      fields(includeDeprecated: false) {
        name
        type { name kind ofType { name } }
        args { name type { name kind ofType { name } } }
      }
    }
  }
}
`;
const res = await fetch('https://graphql-prod.deso.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: q }),
});
const d = await res.json();
const fields = d.data?.__schema?.queryType?.fields || [];
const names = [
  'dashboardStats',
  'dailyActiveWalletCountStats',
  'dailyNewWalletCountStats',
  'dailyTxnCountStats',
  'monthlyTxnCountStats',
  'monthlyNewWalletCountStats',
  'blocks',
  'blockByHeight',
  'posts',
  'accounts',
  'transactions',
];
for (const n of names) {
  const f = fields.find((x) => x.name === n);
  if (f) console.log(JSON.stringify({ name: f.name, type: f.type, args: f.args }, null, 2));
}
