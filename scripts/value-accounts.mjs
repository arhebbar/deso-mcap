#!/usr/bin/env node
/**
 * Realizable USD value held by every tracked account, using the same valuation method as PortTracker
 * (github.com/arhebbar/porttracker, src/lib/holdings.ts + tokenPrices.ts):
 *
 *  - DESO: unstaked + staked + locked-stake, from the GraphQL indexer's accountWealthByPublicKey (with a
 *    fallback to the Account type, which that query returns null for on some real accounts), × live DESO.
 *  - Focus (locked + unlocked) and dUSDC: the indexer's own USD valuation.
 *  - dBTC / dETH / dSOL: quantity × real-world market price (they track the underlying 1:1).
 *  - CCv1 creator coins: DeSo's bonding-curve sell proceeds (totalValueNanos), × live DESO.
 *  - Every other DAO coin (Openfund, CCv2 user tokens, ...), liquid + locked: walk the live bid book across
 *    DESO, Focus and dUSDC quotes, highest USD price first. Depth the book can't absorb is valued at $0.
 *
 * Corrections on top of PortTracker's method:
 *  - Buy side = every order buying the token, BID- or ASK-labelled (see bidsFor). PortTracker reads only BID rows,
 *    which misses every Focus buy order — they are all ASKs that sell DESO/dUSDC for Focus.
 *  - Focus is depth-walked like every other token instead of indexer price × full balance, which assumed
 *    unlimited buyers. The indexer's figure is kept as focusIndexerUsd for reference.
 *  - A token held by its own issuer (e.g. the focus account's unissued Focus) is reported as ownTokens and left
 *    out of totalUsd: it is supply, not something the market could absorb. The holder's own orders are also
 *    ignored when pricing its holdings, since it can't sell into them.
 *
 * Accounts sharing a mergeKey are also valued as a group, with quantities summed *before* the order-book
 * walk, so the group isn't priced as if each wallet were the only seller.
 *
 * Caveat: each account/group walks the full book independently, so summing values across unrelated
 * accounts overstates what everyone could realize if they all sold at once.
 *
 * Usage: node scripts/value-accounts.mjs
 * Output: scripts/account-values.json and scripts/account-values.md
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WALLET_CONFIG } from './wallet-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DESO_NODE = 'https://node.deso.org/api/v0';
const ORDER_BOOK_NODE = 'https://blockproducer.deso.org/api/v0';
const GRAPHQL_API = 'https://graphql-prod.deso.com/graphql';
const NANOS_PER_DESO = 1e9;
const NANOS_PER_DAO_COIN = 1e18;
const DESO_SENTINEL = 'DESO';
const FOCUS_PK = 'BC1YLjEayZDjAPitJJX4Boy7LsEfN3sWAkYb3hgE9kGBirztsc2re1N';
const DUSDC_PK = 'BC1YLiwTN3DbkU8VmD7F7wXcRR1tFX6jDEkLyruHD2WsH3URomimxLX';
const BRIDGED = { dbtc_: 'dBTC', deth_: 'dETH', dsol_: 'dSOL', dusdc_: 'dUSDC' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables = {}, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(GRAPHQL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
      return json.data;
    } catch (e) {
      // Retry load-related failures only; a query error (e.g. the CCv1 complex-number bug) is thrown straight away.
      if (attempt >= attempts || !/timeout|HTTP 5|HTTP 429|fetch failed/i.test(e.message)) throw e;
      await sleep(2000 * attempt);
    }
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ---------- prices ----------

async function fetchMarketPrices() {
  const [rate, cg] = await Promise.all([
    fetch(`${DESO_NODE}/get-exchange-rate`).then((r) => r.json()),
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
  ]);
  const deso = rate.USDCentsPerDeSoExchangeRate / 100;
  return {
    DESO: deso,
    BTC: cg.bitcoin?.usd ?? rate.USDCentsPerBitcoinExchangeRate / 100,
    ETH: cg.ethereum?.usd ?? rate.USDCentsPerETHExchangeRate / 100,
    SOL: cg.solana?.usd ?? 0,
  };
}

// ---------- per-wallet raw holdings ----------

async function fetchAccountWealth(pk) {
  const data = await gql(
    `query($pk: String!) { accountWealthByPublicKey(publicKey: $pk) {
      unstakedDesoBalanceNanos stakedDesoBalanceNanos lockedStakeDesoBalanceNanos
      focusTokenBalanceUsdCents focusTokenBalanceBaseUnits
      focusTokenLockedBalanceUsdCents focusTokenLockedBalanceBaseUnits
      usdBalanceUsdCents usdBalanceBaseUnits } }`,
    { pk }
  );
  return data.accountWealthByPublicKey ?? fetchAccountWealthFallback(pk);
}

/** accountWealthByPublicKey returns null for some real accounts; rebuild the same fields from Account,
 * whose desoBalanceNanos is the TOTAL (unstaked + staked + locked). */
async function fetchAccountWealthFallback(pk) {
  const data = await gql(
    `query($pk: String!) { accounts(filter: { publicKey: { equalTo: $pk } }) { nodes {
      desoBalanceNanos focusTokenBalanceUsdCents focusTokenBalanceBaseUnits
      focusTokenLockedBalanceUsdCents focusTokenLockedBalanceBaseUnits usdBalanceUsdCents usdBalanceBaseUnits
      stakeEntries { nodes { stakeAmountNanos } } lockedStakeEntries { nodes { lockedAmountNanos } } } } }`,
    { pk }
  );
  const a = data.accounts.nodes[0];
  if (!a) return null;
  const staked = a.stakeEntries.nodes.reduce((s, e) => s + Number(e.stakeAmountNanos), 0);
  const locked = a.lockedStakeEntries.nodes.reduce((s, e) => s + Number(e.lockedAmountNanos), 0);
  return {
    unstakedDesoBalanceNanos: String(Math.max(Number(a.desoBalanceNanos) - staked - locked, 0)),
    stakedDesoBalanceNanos: String(staked),
    lockedStakeDesoBalanceNanos: String(locked),
    focusTokenBalanceUsdCents: a.focusTokenBalanceUsdCents,
    focusTokenBalanceBaseUnits: a.focusTokenBalanceBaseUnits,
    focusTokenLockedBalanceUsdCents: a.focusTokenLockedBalanceUsdCents,
    focusTokenLockedBalanceBaseUnits: a.focusTokenLockedBalanceBaseUnits,
    usdBalanceUsdCents: a.usdBalanceUsdCents,
    usdBalanceBaseUnits: a.usdBalanceBaseUnits,
  };
}

async function paginate(query, pk, key, mapNode) {
  const out = [];
  let after = null;
  for (let page = 0; page < 20; page++) {
    const data = await gql(query, { pk, after });
    const conn = data[key];
    for (const n of conn.nodes) {
      const v = mapNode(n);
      if (v) out.push(v);
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return out;
}

/** CCv1 holdings at bonding-curve sell value. DeSo's indexer can fail a whole page computing totalValueNanos for
 * a degenerate coin, so on failure fetch raw fields and resolve each row on its own, falling back to
 * balance × spot only for the rows that can't be priced exactly. */
async function fetchCcv1(pk) {
  const exactQ = `query($pk: String!, $after: Cursor) { creatorCoinBalances(first: 500, after: $after,
    filter: { holder: { publicKey: { equalTo: $pk } } }) { pageInfo { hasNextPage endCursor }
    nodes { totalValueNanos creator { username publicKey } } } }`;
  try {
    return await paginate(exactQ, pk, 'creatorCoinBalances', (n) =>
      n.creator ? { username: n.creator.username ?? '', creatorPk: n.creator.publicKey, valueNanos: parseFloat(n.totalValueNanos) } : null
    );
  } catch {
    const rawQ = `query($pk: String!, $after: Cursor) { creatorCoinBalances(first: 500, after: $after,
      filter: { holder: { publicKey: { equalTo: $pk } } }) { pageInfo { hasNextPage endCursor }
      nodes { balanceNanos coinPriceDesoNanos creator { username publicKey } } } }`;
    const raw = await paginate(rawQ, pk, 'creatorCoinBalances', (n) => (n.creator ? n : null));
    return mapWithConcurrency(raw, 5, async (n) => {
      const approx = (parseFloat(n.balanceNanos) * parseFloat(n.coinPriceDesoNanos)) / 1e9;
      let valueNanos = approx;
      try {
        const d = await gql(
          `query($pk: String!, $c: String!) { creatorCoinBalances(first: 1, filter: { holder: { publicKey: { equalTo: $pk } },
            creator: { publicKey: { equalTo: $c } } }) { nodes { totalValueNanos } } }`,
          { pk, c: n.creator.publicKey }
        );
        const exact = d.creatorCoinBalances.nodes[0]?.totalValueNanos;
        if (exact != null) valueNanos = parseFloat(exact);
      } catch {
        // keep balance × spot approximation
      }
      return { username: n.creator.username ?? '', creatorPk: n.creator.publicKey, valueNanos };
    });
  }
}

async function fetchDaoCoins(pk) {
  const liquid = await paginate(
    `query($pk: String!, $after: Cursor) { tokenBalances(first: 500, after: $after,
      filter: { hodlerPkid: { equalTo: $pk }, isDaoCoin: { equalTo: true } }) { pageInfo { hasNextPage endCursor }
      nodes { balanceNanos creator { username publicKey } } } }`,
    pk,
    'tokenBalances',
    (n) => (n.creator ? { username: n.creator.username ?? '', creatorPk: n.creator.publicKey, nanos: Number(n.balanceNanos) } : null)
  );
  // Coin lockups (vesting) live in a separate bucket from ordinary token balances.
  const locked = await paginate(
    `query($pk: String!, $after: Cursor) { lockedBalances(first: 500, after: $after,
      filter: { hodlerPkid: { equalTo: $pk } }) { pageInfo { hasNextPage endCursor }
      nodes { totalBalanceBaseUnits profileAccount { username publicKey } } } }`,
    pk,
    'lockedBalances',
    (n) =>
      n.profileAccount
        ? { username: n.profileAccount.username ?? '', creatorPk: n.profileAccount.publicKey, nanos: Number(n.totalBalanceBaseUnits) }
        : null
  );
  return [...liquid, ...locked];
}

async function fetchRawHoldings(pk) {
  const [wealth, ccv1, daoCoins] = await Promise.all([fetchAccountWealth(pk), fetchCcv1(pk), fetchDaoCoins(pk)]);
  return { wealth, ccv1, daoCoins };
}

// ---------- order books ----------

const bookCache = new Map();
function fetchOrderBook(quotePk, tokenPk) {
  const key = `${quotePk}|${tokenPk}`;
  if (!bookCache.has(key)) {
    bookCache.set(
      key,
      (async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch(`${ORDER_BOOK_NODE}/get-dao-coin-limit-orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ DAOCoin1CreatorPublicKeyBase58Check: quotePk, DAOCoin2CreatorPublicKeyBase58Check: tokenPk }),
            });
            if (res.ok) return (await res.json()).Orders ?? [];
            if (res.status < 500 && res.status !== 429) return [];
          } catch {
            // retry
          }
          await sleep(1000 * attempt);
        }
        return [];
      })()
    );
  }
  return bookCache.get(key);
}

/**
 * Buy-side liquidity for a token: every order whose *buying* coin is the token. OperationType is relative to the
 * order's own coin pair, not this market — an ASK that sells DESO for Focus is a buy on the Focus/DESO book (it is
 * the 2.23B-Focus top bid openfund.com shows). Price is always buying-coin vs selling-coin:
 *   BID: Price = quote per token, QuantityToFill = tokens.
 *   ASK: Price = token per quote, QuantityToFill = quote.
 */
function bidsFor(orders, tokenPk, quoteUsd) {
  return orders
    .filter((o) => o.BuyingDAOCoinCreatorPublicKeyBase58Check === tokenPk)
    .map((o) => {
      const price = parseFloat(o.Price);
      return o.OperationType === 'BID'
        ? { priceUsd: price * quoteUsd, qty: o.QuantityToFill, by: o.TransactorPublicKeyBase58Check }
        : { priceUsd: quoteUsd / price, qty: o.QuantityToFill * price, by: o.TransactorPublicKeyBase58Check };
    })
    .filter((b) => Number.isFinite(b.priceUsd) && b.priceUsd > 0 && b.qty > 0);
}

async function combinedBids(tokenPk, prices, holderPks) {
  const quotes = [
    { pk: DESO_SENTINEL, usd: prices.DESO },
    { pk: FOCUS_PK, usd: prices.FOCUS },
    { pk: DUSDC_PK, usd: 1 },
  ].filter((q) => q.usd > 0);
  const books = await Promise.all(quotes.map((q) => fetchOrderBook(q.pk, tokenPk)));
  return quotes
    .filter((q) => q.pk !== tokenPk)
    .flatMap((q) => bidsFor(books[quotes.indexOf(q)], tokenPk, q.usd))
    .filter((b) => !holderPks.has(b.by))
    .sort((a, b) => b.priceUsd - a.priceUsd);
}

function walkBook(bids, quantity) {
  let remaining = quantity;
  let proceeds = 0;
  for (const b of bids) {
    if (remaining <= 0) break;
    const filled = Math.min(remaining, b.qty);
    proceeds += filled * b.priceUsd;
    remaining -= filled;
  }
  return { valueUsd: proceeds, sellableQuantity: quantity - remaining, priced: bids.length > 0 };
}

// ---------- valuation ----------

async function valueHoldings(raws, prices, holderPks) {
  const sum = (f) => raws.reduce((s, r) => s + Number(f(r) ?? 0), 0);
  const desoUnstaked = sum((r) => r.wealth?.unstakedDesoBalanceNanos) / NANOS_PER_DESO;
  const desoStaked =
    (sum((r) => r.wealth?.stakedDesoBalanceNanos) + sum((r) => r.wealth?.lockedStakeDesoBalanceNanos)) / NANOS_PER_DESO;
  const focusQty =
    (sum((r) => r.wealth?.focusTokenBalanceBaseUnits) + sum((r) => r.wealth?.focusTokenLockedBalanceBaseUnits)) / NANOS_PER_DAO_COIN;
  const focusIndexerUsd = (sum((r) => r.wealth?.focusTokenBalanceUsdCents) + sum((r) => r.wealth?.focusTokenLockedBalanceUsdCents)) / 100;
  const dUsdcQty = sum((r) => r.wealth?.usdBalanceBaseUnits) / NANOS_PER_DAO_COIN;
  const dUsdcUsd = sum((r) => r.wealth?.usdBalanceUsdCents) / 100;

  const ccv1Deso = raws.reduce((s, r) => s + r.ccv1.reduce((t, c) => t + c.valueNanos, 0), 0) / NANOS_PER_DESO;
  const ccv1Count = new Set(raws.flatMap((r) => r.ccv1.map((c) => c.creatorPk))).size;

  // Merge DAO coin quantities across wallets (and liquid + locked) before pricing.
  const byCreator = new Map();
  for (const r of raws) {
    for (const h of r.daoCoins) {
      const e = byCreator.get(h.creatorPk);
      if (e) e.nanos += h.nanos;
      else byCreator.set(h.creatorPk, { ...h });
    }
  }
  const bridged = { dBTC: 0, dETH: 0, dSOL: 0 };
  const others = [];
  for (const h of byCreator.values()) {
    const label = BRIDGED[h.username.toLowerCase()];
    const qty = h.nanos / NANOS_PER_DAO_COIN;
    if (label === 'dBTC' || label === 'dETH' || label === 'dSOL') bridged[label] += qty;
    else if (label === 'dUSDC' || h.username.toLowerCase() === 'focus') continue; // quantities come from wealth above
    else if (qty > 0) others.push({ username: h.username, creatorPk: h.creatorPk, quantity: qty });
  }
  const ownTokens = [];
  const isOwn = (creatorPk) => holderPks.has(creatorPk);
  const focusOwn = isOwn(FOCUS_PK);
  const focusWalk = focusQty > 0 && !focusOwn ? walkBook(await combinedBids(FOCUS_PK, prices, holderPks), focusQty) : null;
  if (focusOwn && focusQty > 0) ownTokens.push({ username: 'focus', quantity: focusQty, indexerUsd: focusIndexerUsd });
  for (const o of others.filter((o) => isOwn(o.creatorPk))) ownTokens.push({ username: o.username, quantity: o.quantity });
  const otherDaoCoins = await Promise.all(
    others
      .filter((o) => !isOwn(o.creatorPk))
      .map(async (o) => ({ ...o, ...walkBook(await combinedBids(o.creatorPk, prices, holderPks), o.quantity) }))
  );
  otherDaoCoins.sort((a, b) => b.valueUsd - a.valueUsd);

  const lines = {
    desoUnstaked: { quantity: desoUnstaked, usd: desoUnstaked * prices.DESO },
    desoStaked: { quantity: desoStaked, usd: desoStaked * prices.DESO },
    focus: { quantity: focusOwn ? 0 : focusQty, usd: focusWalk?.valueUsd ?? 0, sellableQuantity: focusWalk?.sellableQuantity ?? 0, focusIndexerUsd: focusOwn ? 0 : focusIndexerUsd },
    dUSDC: { quantity: dUsdcQty, usd: dUsdcUsd },
    dBTC: { quantity: bridged.dBTC, usd: bridged.dBTC * prices.BTC },
    dETH: { quantity: bridged.dETH, usd: bridged.dETH * prices.ETH },
    dSOL: { quantity: bridged.dSOL, usd: bridged.dSOL * prices.SOL },
    ccv1: { quantity: ccv1Deso, usd: ccv1Deso * prices.DESO, count: ccv1Count },
    otherDaoCoins: { usd: otherDaoCoins.reduce((s, c) => s + c.valueUsd, 0) },
  };
  const totalUsd = Object.values(lines).reduce((s, l) => s + l.usd, 0);
  return { totalUsd, lines, otherDaoCoins, ownTokens };
}

/** The naive valuation the dashboard uses today: every Openfund/Focus/dUSDC unit at one fixed price. */
function naiveDashboardValue(v, prices) {
  // The dashboard counts openfund's own Openfund but drops focus's own Focus.
  const openfund = [...v.otherDaoCoins, ...v.ownTokens].find((c) => c.username.toLowerCase() === 'openfund');
  return (
    (v.lines.desoUnstaked.quantity + v.lines.desoStaked.quantity) * prices.DESO +
    v.lines.focus.quantity * 0.00034 +
    (openfund?.quantity ?? 0) * 0.087 +
    v.lines.dUSDC.quantity
  );
}

// ---------- main ----------

const fmtUsd = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`);

async function main() {
  const prices = await fetchMarketPrices();
  console.log(`Prices: DESO $${prices.DESO}, BTC $${prices.BTC}, ETH $${prices.ETH}, SOL $${prices.SOL}`);

  console.log('Resolving accounts...');
  const resolved = (
    await mapWithConcurrency(WALLET_CONFIG, 5, async (cfg) => {
      try {
        const res = await fetch(`${DESO_NODE}/get-single-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Username: cfg.username }),
        });
        const pk = (await res.json())?.Profile?.PublicKeyBase58Check;
        return pk ? { ...cfg, pk } : (console.warn(`  unresolved: ${cfg.username}`), null);
      } catch {
        console.warn(`  unresolved: ${cfg.username}`);
        return null;
      }
    })
  ).filter(Boolean);
  // Same account listed twice under different casing (e.g. Stevonagy / StevoNagy) — keep one.
  const accounts = [...new Map(resolved.map((a) => [a.pk, a])).values()];
  console.log(`Resolved ${accounts.length} unique accounts`);

  console.log('Fetching holdings...');
  let done = 0;
  const raws = await mapWithConcurrency(accounts, 4, async (a) => {
    try {
      const raw = await fetchRawHoldings(a.pk);
      if (++done % 10 === 0) console.log(`  ${done}/${accounts.length}`);
      return raw;
    } catch (e) {
      console.warn(`  failed: ${a.username}: ${e.message}`);
      return null;
    }
  });

  // Focus's live USD price = indexer's Focus USD value / Focus quantity, across everything fetched.
  const ok = raws.filter(Boolean);
  const fUsd = ok.reduce((s, r) => s + (r.wealth?.focusTokenBalanceUsdCents ?? 0) + (r.wealth?.focusTokenLockedBalanceUsdCents ?? 0), 0) / 100;
  const fQty =
    ok.reduce((s, r) => s + Number(r.wealth?.focusTokenBalanceBaseUnits ?? 0) + Number(r.wealth?.focusTokenLockedBalanceBaseUnits ?? 0), 0) /
    NANOS_PER_DAO_COIN;
  prices.FOCUS = fQty > 0 ? fUsd / fQty : 0;
  console.log(`Focus price (from indexer): $${prices.FOCUS.toPrecision(4)}`);

  console.log('Walking order books...');
  const accountRows = [];
  const failed = [];
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    if (!raws[i]) {
      failed.push(a.username);
      continue;
    }
    const v = await valueHoldings([raws[i]], prices, new Set([a.pk]));
    accountRows.push({
      username: a.displayName ?? a.username,
      publicKey: a.pk,
      classification: a.classification,
      group: a.mergeKey ?? a.username,
      ...v,
      dashboardNaiveUsd: naiveDashboardValue(v, prices),
    });
  }

  // Groups: quantities merged across the group's wallets before the book walk.
  const groupNames = [...new Set(accountRows.map((r) => r.group))];
  const groupRows = [];
  for (const g of groupNames) {
    const idx = accounts.map((a, i) => ((a.mergeKey ?? a.username) === g && raws[i] ? i : -1)).filter((i) => i >= 0);
    const v = await valueHoldings(
      idx.map((i) => raws[i]),
      prices,
      new Set(idx.map((i) => accounts[i].pk))
    );
    groupRows.push({
      group: g,
      classification: accounts[idx[0]].classification,
      wallets: idx.map((i) => accounts[i].displayName ?? accounts[i].username),
      ...v,
      dashboardNaiveUsd: naiveDashboardValue(v, prices),
    });
  }
  accountRows.sort((a, b) => b.totalUsd - a.totalUsd);
  groupRows.sort((a, b) => b.totalUsd - a.totalUsd);

  const out = { generatedAt: new Date().toISOString(), prices, accounts: accountRows, groups: groupRows, failed };
  writeFileSync(join(__dirname, 'account-values.json'), JSON.stringify(out, null, 2), 'utf8');

  // Markdown report
  const md = [];
  md.push(`# Account values (realizable)\n`);
  md.push(`Generated ${out.generatedAt}. Method: PortTracker holdings valuation (see header of scripts/value-accounts.mjs).\n`);
  md.push(
    `Prices: DESO $${prices.DESO.toFixed(2)} · BTC $${prices.BTC.toLocaleString()} · ETH $${prices.ETH.toLocaleString()} · SOL $${prices.SOL} · Focus $${prices.FOCUS.toPrecision(3)}\n`
  );
  md.push(`Dashboard (naive) = DESO × price + Focus × $0.00034 + Openfund × $0.087 + dUSDC — the fixed prices deso-mcap uses today.\n`);
  md.push(`## By group (aliases merged)\n`);
  md.push(`| # | Group | Class | Total | DESO (unst / staked) | Focus (indexer price) | dUSDC | Bridged | CCv1 | Other DAO coins | Own token (excluded) | Dashboard (naive) |`);
  md.push(`|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|`);
  groupRows.forEach((r, i) => {
    const L = r.lines;
    const top = r.otherDaoCoins.filter((c) => c.valueUsd >= 1).slice(0, 3).map((c) => `${c.username} ${fmtUsd(c.valueUsd)}`).join(', ');
    md.push(
      `| ${i + 1} | ${r.group}${r.wallets.length > 1 ? ` (${r.wallets.length} wallets)` : ''} | ${r.classification} | **${fmtUsd(r.totalUsd)}** | ${fmtUsd(
        L.desoUnstaked.usd
      )} / ${fmtUsd(L.desoStaked.usd)} | ${fmtUsd(L.focus.usd)}${L.focus.focusIndexerUsd >= 1 ? ` (${fmtUsd(L.focus.focusIndexerUsd)})` : ''} | ${fmtUsd(L.dUSDC.usd)} | ${fmtUsd(L.dBTC.usd + L.dETH.usd + L.dSOL.usd)} | ${fmtUsd(
        L.ccv1.usd
      )} | ${fmtUsd(L.otherDaoCoins.usd)}${top ? ` (${top})` : ''} | ${r.ownTokens.map((t) => `${t.username} ${t.quantity.toExponential(2)}`).join(', ')} | ${fmtUsd(r.dashboardNaiveUsd)} |`
    );
  });
  md.push(`\n## By account\n`);
  md.push(`| # | Account | Group | Total | DESO | Focus | dUSDC | CCv1 | Other DAO coins |`);
  md.push(`|---|---|---|---:|---:|---:|---:|---:|---:|`);
  accountRows.forEach((r, i) => {
    const L = r.lines;
    md.push(
      `| ${i + 1} | ${r.username} | ${r.group} | **${fmtUsd(r.totalUsd)}** | ${fmtUsd(L.desoUnstaked.usd + L.desoStaked.usd)} | ${fmtUsd(L.focus.usd)} | ${fmtUsd(
        L.dUSDC.usd
      )} | ${fmtUsd(L.ccv1.usd)} | ${fmtUsd(L.otherDaoCoins.usd)} |`
    );
  });
  if (failed.length) md.push(`\nFailed to fetch: ${failed.join(', ')}`);
  writeFileSync(join(__dirname, 'account-values.md'), md.join('\n') + '\n', 'utf8');

  const total = groupRows.reduce((s, r) => s + r.totalUsd, 0);
  const naive = groupRows.reduce((s, r) => s + r.dashboardNaiveUsd, 0);
  console.log(`\n${accountRows.length} accounts, ${groupRows.length} groups. Total realizable ${fmtUsd(total)} vs dashboard-naive ${fmtUsd(naive)}`);
  console.log('Top 15 groups:');
  for (const r of groupRows.slice(0, 15)) console.log(`  ${r.group.padEnd(26)} ${fmtUsd(r.totalUsd).padStart(9)}   (naive ${fmtUsd(r.dashboardNaiveUsd)})`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
  console.log('\nWrote scripts/account-values.json and scripts/account-values.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
