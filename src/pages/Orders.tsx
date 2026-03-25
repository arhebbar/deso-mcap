import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Minus, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  fetchTransactorOrders,
  fetchOrderBook,
  fetchUsernamesForPks,
  fetchUserProfilesForPks,
  getPublicKeyFromUsername,
  getBestSell,
  getBestBuy,
  ORDER_BOOK_SIDE_DEPTH,
  resolvePairOrientation,
  filterBidsForTokenPair,
  filterAsksForTokenPair,
  canonicalPairKeyFromOrder,
  normalizeDaoCoinCreatorPk,
  orderBookSortKey,
  orderBookRowDisplay,
  type CCv2Order,
} from '@/api/ccv2OrdersApi';
import { MARKET_DATA } from '@/data/desoData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useLiveData } from '@/hooks/useLiveData';

const DEFAULT_USERNAME = 'Randhir';
const ACTIVE_TOKEN_USERNAMES = new Set(
  [
    'focus',
    'openfund',
    'Dejak',
    'WhaleDShark',
    'Desocialworld',
    'dETH_',
    'dUSDC_',
    'dBTC_',
    'dSOL_',
    '0xWallStreetBets',
    'NFTzToken',
    'DesoOps',
    'SharkGang',
    'AB',
    'JohnJardin',
  ].map((v) => v.toLowerCase())
);

type PairSpec = { pairKey: string; tokenPk: string; quotePk: string };

/** Active-token pairs first (fetch + display priority), then stable by pairKey. */
function sortPairSpecsActiveFirst(specs: PairSpec[], usernameMap: Map<string, string>): PairSpec[] {
  return [...specs].sort((a, b) => {
    const aName = (usernameMap.get(a.tokenPk) ?? '').toLowerCase();
    const bName = (usernameMap.get(b.tokenPk) ?? '').toLowerCase();
    const aKey = aName === 'dusdc' ? 'dusdc_' : aName;
    const bKey = bName === 'dusdc' ? 'dusdc_' : bName;
    const activeA = ACTIVE_TOKEN_USERNAMES.has(aKey);
    const activeB = ACTIVE_TOKEN_USERNAMES.has(bKey);
    if (activeA !== activeB) return activeB ? 1 : -1;
    return a.pairKey.localeCompare(b.pairKey);
  });
}

/** True if this pair is an Active Token, or username not loaded yet (fetch in first wave). */
function isActiveTokenPairSpec(spec: PairSpec, usernameMap: Map<string, string>): boolean {
  const name = usernameMap.get(spec.tokenPk);
  if (name === undefined) return true;
  const key = name.toLowerCase();
  const norm = key === 'dusdc' ? 'dusdc_' : key;
  return ACTIVE_TOKEN_USERNAMES.has(norm);
}

type OrderRowEntry = {
  order: CCv2Order;
  pairKey: string;
  pairLabel: string;
  tokenUsername?: string;
  tokenDisplayName: string;
  tokenCreator: string;
  quoteCreator: string;
  quoteUsdPrice: number;
  quoteLabel: string;
};

function sortOrderRowsActiveFirst(entries: OrderRowEntry[]): OrderRowEntry[] {
  return [...entries].sort((a, b) => {
    const rawA = (a.tokenUsername ?? a.tokenDisplayName ?? '').toLowerCase();
    const rawB = (b.tokenUsername ?? b.tokenDisplayName ?? '').toLowerCase();
    const keyA = rawA === 'dusdc' ? 'dusdc_' : rawA;
    const keyB = rawB === 'dusdc' ? 'dusdc_' : rawB;
    const activeA = ACTIVE_TOKEN_USERNAMES.has(keyA);
    const activeB = ACTIVE_TOKEN_USERNAMES.has(keyB);
    if (activeA !== activeB) return activeB ? 1 : -1;
    return a.pairKey.localeCompare(b.pairKey);
  });
}

function formatRate(rate: number) {
  return rate >= 0.01 ? rate.toFixed(4) : rate.toFixed(8);
}

function formatValue(value: number) {
  if (!isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return value.toFixed(0);
  if (abs >= 1_000) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.01) return value.toFixed(6);
  return value.toExponential(2);
}

function formatQty(q: number) {
  if (!isFinite(q)) return '—';
  const abs = Math.abs(q);
  if (abs >= 1_000_000) return q.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 10_000) return q.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return q.toFixed(2);
}

function askPriceColumnTitle(quoteLabel: string): string {
  if (quoteLabel === 'Focus') return 'Ask price (USD / native)';
  if (quoteLabel === 'USDC') return 'Ask price (US$ / token)';
  return 'Ask price (USD / native)';
}

function bidPriceColumnTitle(quoteLabel: string): string {
  if (quoteLabel === 'Focus') return 'Bid price (USD / native)';
  if (quoteLabel === 'USDC') return 'Bid price (US$ / token)';
  return 'Bid price (USD / native)';
}

function OrderRow({
  order,
  pairLabel,
  tokenUsername,
  expanded,
  onToggle,
  pairKey,
}: {
  order: CCv2Order;
  pairLabel: string;
  tokenUsername?: string;
  expanded: boolean;
  pairKey: string;
  onToggle: (pairKey: string) => void;
}) {
  const openFundUrl = tokenUsername ? `https://openfund.com/trade/${tokenUsername}` : null;
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4 font-mono text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            {pairLabel}
            {openFundUrl && (
              <a
                href={openFundUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={`Trade on Openfund`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(pairKey);
            }}
            aria-label={expanded ? 'Collapse pair details' : 'Expand pair details'}
          >
            {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={order.OperationType === 'ASK' ? 'destructive' : 'default'}>
          {order.OperationType}
        </Badge>
      </td>
      <td className="py-3 px-4 font-mono text-sm">{formatRate(order.ExchangeRateCoinsToSellPerCoinToBuy)}</td>
      <td className="py-3 px-4 font-mono text-sm">{order.QuantityToFill.toFixed(2)}</td>
    </tr>
  );
}

type OrderFilter = 'notAtTop' | 'all';

export default function Orders() {
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [filter, setFilter] = useState<OrderFilter>('notAtTop');
  const [activeTokensOnly, setActiveTokensOnly] = useState(true);
  const [expandedPairKey, setExpandedPairKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isLive, lastUpdated } = useLiveData();

  const pkQuery = useQuery({
    queryKey: ['profile-pk', username],
    queryFn: () => getPublicKeyFromUsername(username),
    enabled: !!username && !username.startsWith('BC1Y'),
    retry: false,
  });
  const transactorPk = username.startsWith('BC1Y') ? username : pkQuery.data;

  const { data: orders, isLoading: ordersLoading, isError: ordersError } = useQuery({
    queryKey: ['ccv2-orders', transactorPk],
    queryFn: () => fetchTransactorOrders(transactorPk!),
    enabled: !!transactorPk,
    retry: false,
  });

  const tokenPks = orders
    ? [
        ...new Set(
          orders.flatMap((o) => {
            const b = normalizeDaoCoinCreatorPk(o.BuyingDAOCoinCreatorPublicKeyBase58Check);
            const s = normalizeDaoCoinCreatorPk(o.SellingDAOCoinCreatorPublicKeyBase58Check);
            return [b, s].filter((pk) => pk && pk !== 'DESO');
          })
        ),
      ]
    : [];
  const tokenPksKey = tokenPks.length > 0 ? [...tokenPks].sort().join(',') : '';
  const { data: usernameMap = new Map<string, string>() } = useQuery({
    queryKey: ['ccv2-token-usernames', tokenPksKey],
    queryFn: () => fetchUsernamesForPks(tokenPks),
    enabled: tokenPks.length > 0,
  });

  const pairSpecs = useMemo((): PairSpec[] => {
    if (!orders?.length || !transactorPk) return [];
    const pairs = new Set<string>();
    for (const o of orders) {
      pairs.add(canonicalPairKeyFromOrder(o));
    }
    const specs: PairSpec[] = [];
    for (const pair of pairs) {
      const oriented = resolvePairOrientation(pair, usernameMap);
      if (!oriented) continue;
      specs.push({ pairKey: pair, tokenPk: oriented.tokenPk, quotePk: oriented.quotePk });
    }
    return sortPairSpecsActiveFirst(specs, usernameMap);
  }, [orders, transactorPk, usernameMap]);

  const { activePairSpecs, restPairSpecs } = useMemo(() => {
    const active: PairSpec[] = [];
    const rest: PairSpec[] = [];
    for (const s of pairSpecs) {
      if (isActiveTokenPairSpec(s, usernameMap)) active.push(s);
      else rest.push(s);
    }
    return { activePairSpecs: active, restPairSpecs: rest };
  }, [pairSpecs, usernameMap]);

  const activeOrderBookQueries = useQueries({
    queries: activePairSpecs.map((spec) => ({
      queryKey: ['ccv2-orderbook', spec.pairKey, spec.tokenPk, spec.quotePk] as const,
      queryFn: () => fetchOrderBook(spec.tokenPk, spec.quotePk),
      enabled: !!transactorPk && activePairSpecs.length > 0,
      staleTime: 30_000,
    })),
  });

  const activeBooksSettled =
    activePairSpecs.length === 0 ||
    activeOrderBookQueries.every((q) => q.isSuccess || q.isError);

  const restOrderBookQueries = useQueries({
    queries: restPairSpecs.map((spec) => ({
      queryKey: ['ccv2-orderbook', spec.pairKey, spec.tokenPk, spec.quotePk] as const,
      queryFn: () => fetchOrderBook(spec.tokenPk, spec.quotePk),
      enabled: !!transactorPk && restPairSpecs.length > 0 && activeBooksSettled,
      staleTime: 30_000,
    })),
  });

  const orderBooksData = useMemo(() => {
    const m = new Map<string, CCv2Order[]>();
    activePairSpecs.forEach((spec, i) => {
      const data = activeOrderBookQueries[i]?.data;
      if (data !== undefined) m.set(spec.pairKey, data);
    });
    restPairSpecs.forEach((spec, i) => {
      const data = restOrderBookQueries[i]?.data;
      if (data !== undefined) m.set(spec.pairKey, data);
    });
    return m;
  }, [activePairSpecs, activeOrderBookQueries, restPairSpecs, restOrderBookQueries]);

  const orderBooksStillLoading =
    activeOrderBookQueries.some((q) => q.isPending || q.isFetching) ||
    restOrderBookQueries.some((q) => q.isPending || q.isFetching);

  const atTopOrders: {
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
    tokenCreator: string;
    quoteCreator: string;
    quoteUsdPrice: number;
    quoteLabel: string;
  }[] = [];
  const notAtTopOrders: {
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
    tokenCreator: string;
    quoteCreator: string;
    quoteUsdPrice: number;
    quoteLabel: string;
  }[] = [];
  const pendingOrders: {
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
    tokenCreator: string;
    quoteCreator: string;
    quoteUsdPrice: number;
    quoteLabel: string;
  }[] = [];
  if (orders && transactorPk) {
    for (const order of orders) {
      const pairKey = canonicalPairKeyFromOrder(order);
      const book = orderBooksData.get(pairKey);
      const bookLoaded = book !== undefined;
      const bookArr = book ?? [];
      const [sideA, sideB] = pairKey.split('/');
      const nameA = sideA === 'DESO' ? 'DESO' : (usernameMap.get(sideA) ?? sideA);
      const nameB = sideB === 'DESO' ? 'DESO' : (usernameMap.get(sideB) ?? sideB);

      // Normalize display so each row is always: token/DESO, token/USDC, or token/Focus.
      // We skip pairs where neither side is one of the supported quote assets.
      const lowerA = sideA === 'DESO' ? 'deso' : nameA.toLowerCase();
      const lowerB = sideB === 'DESO' ? 'deso' : nameB.toLowerCase();

      let tokenPk = '';
      let quoteLabel = '';
      let quoteCreator = '';
      let quoteUsdPrice = 0;
      if (sideA === 'DESO' || sideB === 'DESO') {
        quoteLabel = 'DESO';
        quoteCreator = 'DESO';
        quoteUsdPrice = MARKET_DATA.desoPrice;
        tokenPk = sideA === 'DESO' ? sideB : sideA;
      } else if (lowerA === 'focus' || lowerB === 'focus') {
        quoteLabel = 'Focus';
        quoteCreator = lowerA === 'focus' ? sideA : sideB;
        quoteUsdPrice = MARKET_DATA.focusPrice;
        tokenPk = lowerA === 'focus' ? sideB : sideA;
      } else if (lowerA === 'dusdc_' || lowerA === 'dusdc' || lowerB === 'dusdc_' || lowerB === 'dusdc') {
        quoteLabel = 'USDC';
        const isDusdcA = lowerA === 'dusdc_' || lowerA === 'dusdc';
        quoteCreator = isDusdcA ? sideA : sideB;
        quoteUsdPrice = 1;
        tokenPk = isDusdcA ? sideB : sideA;
      } else {
        continue; // unsupported quote pair
      }

      const tokenUsername = tokenPk ? usernameMap.get(tokenPk) : undefined;
      const tokenDisplayName = tokenPk ? tokenUsername ?? tokenPk : '';
      const pairLabel = tokenDisplayName ? `${tokenDisplayName}/${quoteLabel}` : '';
      const isAsk = order.OperationType === 'ASK';
      const entry = {
        order,
        pairKey,
        pairLabel,
        tokenUsername,
        tokenDisplayName,
        tokenCreator: tokenPk,
        quoteCreator,
        quoteUsdPrice,
        quoteLabel,
      };
      if (!bookLoaded) {
        pendingOrders.push(entry);
        continue;
      }
      const pairAsks = filterAsksForTokenPair(bookArr, pairKey, tokenPk);
      const pairBids = filterBidsForTokenPair(bookArr, pairKey, tokenPk);
      const isAtTop = isAsk
        ? getBestSell(pairAsks, quoteLabel)?.TransactorPublicKeyBase58Check === transactorPk
        : getBestBuy(pairBids, quoteLabel)?.TransactorPublicKeyBase58Check === transactorPk;
      if (isAtTop) atTopOrders.push(entry);
      else notAtTopOrders.push(entry);
    }
  }

  function bestOrderForPair(entries: OrderRowEntry[]): OrderRowEntry {
    const ql = entries[0]?.quoteLabel ?? 'DESO';
    return entries.reduce((best, cur) => {
      const metric = (o: CCv2Order) =>
        o.OperationType === 'ASK' ? -orderBookSortKey(o, ql) : orderBookSortKey(o, ql);
      return metric(cur.order) > metric(best.order) ? cur : best;
    });
  }

  const displayOrdersAllPairs = (() => {
    const all = [...pendingOrders, ...atTopOrders, ...notAtTopOrders];
    const byPair = new Map<string, typeof all>();
    for (const e of all) {
      const arr = byPair.get(e.pairKey) ?? [];
      arr.push(e);
      byPair.set(e.pairKey, arr);
    }
    return Array.from(byPair.values()).map((entries) => bestOrderForPair(entries));
  })();

  const displayOrdersNotAtTop = (() => {
    const byPair = new Map<string, typeof notAtTopOrders>();
    for (const e of notAtTopOrders) {
      const arr = byPair.get(e.pairKey) ?? [];
      arr.push(e);
      byPair.set(e.pairKey, arr);
    }
    return Array.from(byPair.values()).map((entries) => bestOrderForPair(entries));
  })();

  /** Open orders by pair — used so "Not at the Top" never lists a pair with zero open orders from @username. */
  const pairKeysWithOpenOrders = new Set((orders ?? []).map(canonicalPairKeyFromOrder));

  const displayOrdersBase =
    filter === 'notAtTop'
      ? displayOrdersNotAtTop.filter((entry) => pairKeysWithOpenOrders.has(entry.pairKey))
      : displayOrdersAllPairs;
  const displayOrders = sortOrderRowsActiveFirst(
    activeTokensOnly
      ? displayOrdersBase.filter(({ tokenUsername, tokenDisplayName }) => {
          const rawKey = (tokenUsername ?? tokenDisplayName ?? '').toLowerCase();
          const key = rawKey === 'dusdc' ? 'dusdc_' : rawKey;
          return ACTIVE_TOKEN_USERNAMES.has(key);
        })
      : displayOrdersBase
  );

  const sideOrdersByPairData = useMemo(() => {
    const map = new Map<
      string,
      {
        rawBookCount: number;
        bidCount: number;
        askCount: number;
        topBids: CCv2Order[];
        topAsks: CCv2Order[];
      }
    >();
    const partyPks = new Set<string>();

    if (!displayOrders?.length) return { map, partyPks };

    for (const entry of displayOrders) {
      if (!orderBooksData.has(entry.pairKey)) continue;
      const book = orderBooksData.get(entry.pairKey)!;

      // Full book → filter by OperationType + both legs (token + quote); see ccv2OrdersApi filter*ForTokenPair.
      const bidsAll = filterBidsForTokenPair(book, entry.pairKey, entry.tokenCreator);
      const asksAll = filterAsksForTokenPair(book, entry.pairKey, entry.tokenCreator);

      const ql = entry.quoteLabel;
      const sortedBids = [...bidsAll].sort(
        (a, b) => orderBookSortKey(b, ql) - orderBookSortKey(a, ql)
      );
      const sortedAsks = [...asksAll].sort(
        (a, b) => orderBookSortKey(a, ql) - orderBookSortKey(b, ql)
      );

      const topBids = sortedBids.slice(0, ORDER_BOOK_SIDE_DEPTH);
      const topAsks = sortedAsks.slice(0, ORDER_BOOK_SIDE_DEPTH);

      for (const o of [...topBids, ...topAsks]) {
        if (o.TransactorPublicKeyBase58Check) partyPks.add(o.TransactorPublicKeyBase58Check);
      }

      map.set(entry.pairKey, {
        rawBookCount: book.length,
        bidCount: bidsAll.length,
        askCount: asksAll.length,
        topBids,
        topAsks,
      });
    }

    return { map, partyPks };
  }, [orderBooksData, displayOrders]);

  const partyPksKey = [...sideOrdersByPairData.partyPks].sort().join(',');
  const { data: partyProfilesMap = new Map<string, { username: string; largeProfilePicUrl?: string }>() } = useQuery({
    queryKey: ['ccv2-party-profiles', partyPksKey],
    queryFn: () => fetchUserProfilesForPks(Array.from(sideOrdersByPairData.partyPks)),
    enabled: sideOrdersByPairData.partyPks.size > 0 && !!transactorPk,
    retry: false,
  });

  const toggleExpandedPair = (pairKey: string) => {
    setExpandedPairKey((cur) => (cur === pairKey ? null : pairKey));
  };

  function SideOrdersTable({
    orders,
    title,
    quoteLabel,
    sideLabel,
    qtyLabel,
    priceLabel,
    sideType,
    quoteUsdPrice,
    highlightMine,
  }: {
    orders: CCv2Order[];
    title: string;
    quoteLabel: string;
    sideLabel: string;
    qtyLabel: string;
    priceLabel: string;
    sideType: 'buy' | 'sell';
    /** USD per 1 unit of quote (DESO, Focus, USDC). */
    quoteUsdPrice: number;
    highlightMine: boolean;
  }) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase">{title}</div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase">
              <th className="py-1 px-2" colSpan={2}>
                {sideLabel}
              </th>
              <th className="py-1 px-2">{qtyLabel}</th>
              <th className="py-1 px-2">{priceLabel}</th>
              <th className="py-1 px-2">Total (USD)</th>
              <th className="py-1 px-2">Order Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="py-2 px-2 text-muted-foreground" colSpan={6}>
                  No {sideLabel} orders.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const partyPk = o.TransactorPublicKeyBase58Check;
                const partyMeta = partyProfilesMap.get(partyPk);
                const partyName = partyMeta?.username ?? `${partyPk.slice(0, 8)}…`;
                const avatarSrc = partyMeta?.largeProfilePicUrl;
                const isMine = highlightMine && !!transactorPk && partyPk === transactorPk;

                /** Price / Qty / Total from {@link orderBookRowDisplay} — same math as sort ({@link orderBookSortKey}). */
                const ql = quoteLabel as 'DESO' | 'USDC' | 'Focus';
                const row = orderBookRowDisplay(o, ql, sideType === 'buy' ? 'bid' : 'ask');
                const tokenQty = row.tokenQuantity;
                const priceUsd = row.quotePerToken * quoteUsdPrice;
                const totalUsd = row.totalQuote * quoteUsdPrice;

                let priceNativeLine: string | null = null;
                let totalNativeLine: string | null = null;
                if (quoteLabel === 'Focus') {
                  priceNativeLine = `${formatValue(row.quotePerToken)} Focus / token`;
                  totalNativeLine = `${formatValue(row.totalQuote)} Focus`;
                } else if (quoteLabel === 'DESO') {
                  priceNativeLine = `${formatValue(row.quotePerToken)} DESO / token`;
                  totalNativeLine = `${formatValue(row.totalQuote)} DESO`;
                } else if (quoteLabel === 'USDC') {
                  priceNativeLine = `${formatValue(row.quotePerToken)} USDC / token`;
                  totalNativeLine = `${formatValue(row.totalQuote)} USDC`;
                }

                const initials = partyName.slice(0, 1).toUpperCase();

                return (
                  <tr key={o.OrderID} className={isMine ? 'bg-primary/10' : undefined}>
                    <td className="py-1 px-2">
                      <Avatar className="h-6 w-6">
                        {avatarSrc && <AvatarImage src={avatarSrc} alt={partyName} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-1 px-2 font-medium">{partyName}</td>
                    <td className="py-1 px-2 font-mono" title="# tokens = Total (quote) / Price (quote per token)">
                      {formatQty(tokenQty)}
                    </td>
                    <td className="py-1 px-2">
                      <div className="font-mono text-sm">${formatValue(priceUsd)}</div>
                      {priceNativeLine && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{priceNativeLine}</div>
                      )}
                    </td>
                    <td className="py-1 px-2">
                      <div className="font-mono">${formatValue(totalUsd)}</div>
                      {totalNativeLine && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{totalNativeLine}</div>
                      )}
                    </td>
                    <td className="py-1 px-2 text-muted-foreground" title="CCv2 orderbook response does not include a timestamp.">
                      —
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader isLive={isLive} lastUpdated={lastUpdated} />
      <main className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6 pb-10">
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-card">
          <CardHeader>
            <CardTitle>CCv2 Limit Orders</CardTitle>
            <CardDescription>
              {filter === 'notAtTop'
                ? `Orders where @${username}'s limit is not the best (lowest sell or highest buy).`
                : `All of @${username}'s open limit orders (best order per pair only).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or public key"
                className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['profile-pk', username] });
                  queryClient.invalidateQueries({ queryKey: ['ccv2-orders'] });
                  queryClient.invalidateQueries({ queryKey: ['ccv2-orderbook'] });
                  queryClient.invalidateQueries({ queryKey: ['ccv2-token-usernames'] });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as OrderFilter)}
                className="flex h-9 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm"
              >
                <option value="notAtTop" className="bg-background text-foreground">Not at the Top</option>
                <option value="all" className="bg-background text-foreground">All Orders</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={activeTokensOnly}
                  onChange={(e) => setActiveTokensOnly(e.target.checked)}
                  className="h-4 w-4 rounded border border-input bg-transparent"
                />
                Active Tokens
              </label>
            </div>

            {pkQuery.isError && (
              <p className="text-sm text-destructive">Could not find profile for @{username}.</p>
            )}
            {ordersError && (
              <p className="text-sm text-destructive">Failed to load orders.</p>
            )}
            {(pkQuery.isLoading && !username.startsWith('BC1Y')) && (
              <p className="text-sm text-muted-foreground">Looking up @{username}…</p>
            )}
            {ordersLoading && !pkQuery.isError && !ordersError && (
              <p className="text-sm text-muted-foreground">Loading orders…</p>
            )}
            {orders && orders.length > 0 && !ordersLoading && orderBooksStillLoading && (
              <p className="text-sm text-muted-foreground">Loading order books (pairs fill in as they load)…</p>
            )}
            {orders && orders.length === 0 && !ordersLoading && !ordersError && (
              <p className="text-sm text-muted-foreground">No open orders for @{username}.</p>
            )}
            {orders &&
              orders.length > 0 &&
              displayOrders.length === 0 &&
              !ordersLoading &&
              (filter === 'notAtTop' && orderBooksStillLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading order books to determine &quot;not at top&quot;…
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filter === 'notAtTop'
                    ? activeTokensOnly
                      ? `No not-at-top orders found for @${username} in Active Tokens.`
                      : `All of @${username}'s orders are at the top of the book.`
                    : activeTokensOnly
                      ? `No orders found for @${username} in Active Tokens.`
                      : `No orders found for @${username}.`}
                </p>
              ))}
            {displayOrders.length > 0 && (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="py-2 px-4">Pair</th>
                    <th className="py-2 px-4">Type</th>
                    <th className="py-2 px-4">Rate</th>
                    <th className="py-2 px-4">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.map((entry) => {
                    const { order, pairKey, pairLabel, tokenUsername, quoteLabel, quoteUsdPrice, tokenCreator } =
                      entry;
                    const expanded = expandedPairKey === pairKey;
                    const sidePair = sideOrdersByPairData.map.get(pairKey);
                    /** Asks: sorted ascending by askNativePricePerToken (lowest/best first); slice(0,N) = N best asks. */
                    const sellsDisplay = sidePair ? sidePair.topAsks : [];
                    const buysDisplay = sidePair ? sidePair.topBids : [];

                    const orderBookDebugJson = sidePair
                      ? JSON.stringify(
                          {
                            source: 'get-dao-coin-limit-orders → full Orders[], then filterBids/AsksForTokenPair → sort → top N',
                            semantics: {
                              buy:
                                'BID + Buying=token + Selling=quote (DESO normalized via normalizeDaoCoinCreatorPk)',
                              sell:
                                'ASK + Selling=token + Buying=quote',
                              sort: `bids: highest orderBookSortKey first; asks: lowest first; N=${ORDER_BOOK_SIDE_DEPTH}`,
                            },
                            context: {
                              pairKey,
                              pairLabel,
                              tokenCreator,
                              quoteLabel,
                              quoteUsdPrice,
                            },
                            counts: {
                              rawBook: sidePair.rawBookCount,
                              bidsForToken: sidePair.bidCount,
                              asksForToken: sidePair.askCount,
                            },
                            displaySlices: {
                              topBids: sidePair.topBids,
                              topAsks: sidePair.topAsks,
                            },
                          },
                          null,
                          2
                        )
                      : '';

                    return (
                      <Fragment key={pairKey}>
                        <OrderRow
                          order={order}
                          pairKey={pairKey}
                          pairLabel={pairLabel}
                          tokenUsername={tokenUsername}
                          expanded={expanded}
                          onToggle={toggleExpandedPair}
                        />
                        {expanded && !orderBooksData.has(pairKey) && (
                          <tr>
                            <td colSpan={4} className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                              Loading order book…
                            </td>
                          </tr>
                        )}
                        {expanded && orderBooksData.has(pairKey) && sidePair && (
                          <tr>
                            <td colSpan={4} className="px-4 pb-4 pt-0">
                              <div className="space-y-4">
                                {sidePair && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Order book: {sidePair.rawBookCount} raw orders · {sidePair.bidCount} bids (buy
                                    token) · {sidePair.askCount} asks (sell token). Showing top {ORDER_BOOK_SIDE_DEPTH}{' '}
                                    per side after sort.
                                  </p>
                                )}
                                <SideOrdersTable
                                  orders={sellsDisplay}
                                  title={`Top ${ORDER_BOOK_SIDE_DEPTH} asks (sell ${tokenUsername ?? 'token'} — lowest price first)`}
                                  quoteLabel={quoteLabel}
                                  sideLabel="Seller"
                                  qtyLabel="# Tokens"
                                  priceLabel={askPriceColumnTitle(quoteLabel)}
                                  sideType="sell"
                                  quoteUsdPrice={quoteUsdPrice}
                                  highlightMine
                                />
                                <SideOrdersTable
                                  orders={buysDisplay}
                                  title={`Top ${ORDER_BOOK_SIDE_DEPTH} bids (buy ${tokenUsername ?? 'token'} — highest price first)`}
                                  quoteLabel={quoteLabel}
                                  sideLabel="Buyer"
                                  qtyLabel="# Tokens"
                                  priceLabel={bidPriceColumnTitle(quoteLabel)}
                                  sideType="buy"
                                  quoteUsdPrice={quoteUsdPrice}
                                  highlightMine
                                />
                                <details className="rounded-md border border-border bg-muted/40 p-3">
                                  <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                                    Debug: raw order JSON (API)
                                  </summary>
                                  <p className="mt-2 mb-2 text-[11px] text-muted-foreground">
                                    From <code className="rounded bg-muted px-1">get-dao-coin-limit-orders</code> —
                                    compare with your node response. Includes raw top/bottom slices and the arrays
                                    used for the tables above.
                                  </p>
                                  <pre className="max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground">
                                    {orderBookDebugJson}
                                  </pre>
                                </details>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <footer className="text-center pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground font-mono tracking-wide">
            {isLive ? 'Live data' : 'Cached'} · Last updated{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </p>
        </footer>
      </main>
    </div>
  );
}
