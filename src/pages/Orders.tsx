import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Minus, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  fetchTransactorOrders,
  fetchOrderBook,
  fetchUsernamesForPks,
  getPublicKeyFromUsername,
  getBestSell,
  getBestBuy,
  type CCv2Order,
} from '@/api/ccv2OrdersApi';

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
  const [activeTokensOnly, setActiveTokensOnly] = useState(false);
  const [expandedPairKey, setExpandedPairKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const { data: orderBooksData, isLoading: orderBooksLoading } = useQuery({
    queryKey: ['ccv2-orderbooks', orders, transactorPk],
    queryFn: async () => {
      if (!orders?.length || !transactorPk) return new Map<string, CCv2Order[]>();
      const pairs = new Set<string>();
      for (const o of orders) {
        const buying = o.BuyingDAOCoinCreatorPublicKeyBase58Check || '';
        const selling = o.SellingDAOCoinCreatorPublicKeyBase58Check || '';
        const key = [buying || 'DESO', selling || 'DESO'].sort().join('/');
        pairs.add(key);
      }
      const map = new Map<string, CCv2Order[]>();
      for (const pair of pairs) {
        const [a, b] = pair.split('/');
        const tokenPk = a === 'DESO' ? b : a;
        const quotePk = a === 'DESO' ? '' : b;
        const book = await fetchOrderBook(tokenPk, quotePk);
        map.set(pair, book);
      }
      return map;
    },
    enabled: !!orders?.length && !!transactorPk,
  });

  const tokenPks = orders
    ? [...new Set(
        orders.flatMap((o) => {
          const b = o.BuyingDAOCoinCreatorPublicKeyBase58Check || '';
          const s = o.SellingDAOCoinCreatorPublicKeyBase58Check || '';
          return [b, s].filter((pk) => pk && pk !== 'DESO');
        })
      )]
    : [];
  const tokenPksKey = tokenPks.length > 0 ? [...tokenPks].sort().join(',') : '';
  const { data: usernameMap = new Map<string, string>() } = useQuery({
    queryKey: ['ccv2-token-usernames', tokenPksKey],
    queryFn: () => fetchUsernamesForPks(tokenPks),
    enabled: tokenPks.length > 0,
  });

  const atTopOrders: {
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
  }[] = [];
  const notAtTopOrders: {
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
  }[] = [];
  if (orders && orderBooksData && transactorPk) {
    for (const order of orders) {
      const buying = order.BuyingDAOCoinCreatorPublicKeyBase58Check || '';
      const selling = order.SellingDAOCoinCreatorPublicKeyBase58Check || '';
      const pairKey = [buying || 'DESO', selling || 'DESO'].sort().join('/');
      const book = orderBooksData.get(pairKey) ?? [];
      const [sideA, sideB] = pairKey.split('/');
      const nameA = sideA === 'DESO' ? 'DESO' : (usernameMap.get(sideA) ?? sideA);
      const nameB = sideB === 'DESO' ? 'DESO' : (usernameMap.get(sideB) ?? sideB);

      // Normalize display so each row is always: token/DESO, token/USDC, or token/Focus.
      // We skip pairs where neither side is one of the supported quote assets.
      const lowerA = sideA === 'DESO' ? 'deso' : nameA.toLowerCase();
      const lowerB = sideB === 'DESO' ? 'deso' : nameB.toLowerCase();

      let tokenPk = '';
      let quoteLabel = '';
      if (sideA === 'DESO' || sideB === 'DESO') {
        quoteLabel = 'DESO';
        tokenPk = sideA === 'DESO' ? sideB : sideA;
      } else if (lowerA === 'focus' || lowerB === 'focus') {
        quoteLabel = 'Focus';
        tokenPk = lowerA === 'focus' ? sideB : sideA;
      } else if (lowerA === 'dusdc_' || lowerA === 'dusdc' || lowerB === 'dusdc_' || lowerB === 'dusdc') {
        quoteLabel = 'USDC';
        const isDusdcA = lowerA === 'dusdc_' || lowerA === 'dusdc';
        tokenPk = isDusdcA ? sideB : sideA;
      } else {
        continue; // unsupported quote pair
      }

      const tokenUsername = tokenPk ? usernameMap.get(tokenPk) : undefined;
      const tokenDisplayName = tokenPk ? tokenUsername ?? tokenPk : '';
      const pairLabel = tokenDisplayName ? `${tokenDisplayName}/${quoteLabel}` : '';
      const isAsk = order.OperationType === 'ASK';
      const isAtTop = isAsk
        ? getBestSell(book)?.TransactorPublicKeyBase58Check === transactorPk
        : getBestBuy(book)?.TransactorPublicKeyBase58Check === transactorPk;
      const entry = { order, pairKey, pairLabel, tokenUsername, tokenDisplayName };
      if (isAtTop) atTopOrders.push(entry);
      else notAtTopOrders.push(entry);
    }
  }

  function bestOrderForPair(entries: Array<{
    order: CCv2Order;
    pairKey: string;
    pairLabel: string;
    tokenUsername?: string;
    tokenDisplayName: string;
  }>) {
    // "Best" means: for ASKs the lowest rate wins (best sell), for BID the highest rate wins (best buy).
    // If both ASK and BID exist for the same pair, we use a simple normalized metric to pick one row.
    return entries.reduce((best, cur) => {
      const bestMetric =
        best.order.OperationType === 'ASK'
          ? -best.order.ExchangeRateCoinsToSellPerCoinToBuy
          : best.order.ExchangeRateCoinsToSellPerCoinToBuy;
      const curMetric =
        cur.order.OperationType === 'ASK'
          ? -cur.order.ExchangeRateCoinsToSellPerCoinToBuy
          : cur.order.ExchangeRateCoinsToSellPerCoinToBuy;
      return curMetric > bestMetric ? cur : best;
    });
  }

  const displayOrdersAllPairs = (() => {
    const all = [...atTopOrders, ...notAtTopOrders];
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

  const displayOrdersBase = filter === 'notAtTop' ? displayOrdersNotAtTop : displayOrdersAllPairs;
  const displayOrders = activeTokensOnly
    ? displayOrdersBase.filter(({ tokenUsername, tokenDisplayName }) => {
        const rawKey = (tokenUsername ?? tokenDisplayName ?? '').toLowerCase();
        const key = rawKey === 'dusdc' ? 'dusdc_' : rawKey;
        return ACTIVE_TOKEN_USERNAMES.has(key);
      })
    : displayOrdersBase;

  const buyOrdersByPairData = useMemo(() => {
    const map = new Map<string, { top3: CCv2Order[]; bottom3: CCv2Order[] }>();
    const buyerPks = new Set<string>();

    if (!orderBooksData || !displayOrders?.length) return { map, buyerPks };

    for (const entry of displayOrders) {
      const book = orderBooksData.get(entry.pairKey) ?? [];
      const bids = book.filter((o) => o.OperationType === 'BID');
      const sorted = [...bids].sort(
        (a, b) => b.ExchangeRateCoinsToSellPerCoinToBuy - a.ExchangeRateCoinsToSellPerCoinToBuy
      );
      const top3 = sorted.slice(0, 3);
      const bottom3 = sorted.slice(-3);

      for (const o of [...top3, ...bottom3]) {
        if (o.TransactorPublicKeyBase58Check) buyerPks.add(o.TransactorPublicKeyBase58Check);
      }

      map.set(entry.pairKey, { top3, bottom3 });
    }

    return { map, buyerPks };
  }, [orderBooksData, displayOrders]);

  const buyerPksKey = [...buyOrdersByPairData.buyerPks].sort().join(',');
  const { data: buyerUsernameMap = new Map<string, string>() } = useQuery({
    queryKey: ['ccv2-buyer-usernames', buyerPksKey],
    queryFn: () => fetchUsernamesForPks(Array.from(buyOrdersByPairData.buyerPks)),
    enabled: buyOrdersByPairData.buyerPks.size > 0 && !!transactorPk,
    retry: false,
  });

  const toggleExpandedPair = (pairKey: string) => {
    setExpandedPairKey((cur) => (cur === pairKey ? null : pairKey));
  };

  function BuyOrdersTable({
    orders,
    title,
    quoteLabel,
    highlightMine,
  }: {
    orders: CCv2Order[];
    title: string;
    quoteLabel: string;
    highlightMine: boolean;
  }) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase">{title}</div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase">
              <th className="py-1 px-2" colSpan={2}>
                Buyer
              </th>
              <th className="py-1 px-2">Bid Qty</th>
              <th className="py-1 px-2">Bid Price</th>
              <th className="py-1 px-2">Value</th>
              <th className="py-1 px-2">Order Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="py-2 px-2 text-muted-foreground" colSpan={6}>
                  No BID orders.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const buyerPk = o.TransactorPublicKeyBase58Check;
                const buyerName = buyerUsernameMap.get(buyerPk) ?? `${buyerPk.slice(0, 8)}…`;
                const isMine = highlightMine && !!transactorPk && buyerPk === transactorPk;
                const value = o.QuantityToFill * o.ExchangeRateCoinsToSellPerCoinToBuy;
                const initials = buyerName.slice(0, 1).toUpperCase();
                return (
                  <tr key={o.OrderID} className={isMine ? 'bg-primary/10' : undefined}>
                    <td className="py-1 px-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-1 px-2 font-medium">{buyerName}</td>
                    <td className="py-1 px-2 font-mono">{o.QuantityToFill.toFixed(2)}</td>
                    <td className="py-1 px-2 font-mono">{formatRate(o.ExchangeRateCoinsToSellPerCoinToBuy)}</td>
                    <td className="py-1 px-2 font-mono">
                      {formatValue(value)} {quoteLabel}
                    </td>
                    <td className="py-1 px-2 text-muted-foreground" title="The CCv2 orderbook response does not include a timestamp.">
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <Card>
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
                  queryClient.invalidateQueries({ queryKey: ['ccv2-orderbooks'] });
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
            {(ordersLoading || orderBooksLoading) && !pkQuery.isError && !ordersError && (
              <p className="text-sm text-muted-foreground">Loading orders…</p>
            )}
            {orders && orders.length === 0 && !ordersLoading && !ordersError && (
              <p className="text-sm text-muted-foreground">No open orders for @{username}.</p>
            )}
            {orders && orders.length > 0 && displayOrders.length === 0 && !ordersLoading && !orderBooksLoading && (
              <p className="text-sm text-muted-foreground">
                {filter === 'notAtTop'
                  ? activeTokensOnly
                    ? `No not-at-top orders found for @${username} in Active Tokens.`
                    : `All of @${username}'s orders are at the top of the book.`
                  : activeTokensOnly
                    ? `No orders found for @${username} in Active Tokens.`
                    : `No orders found for @${username}.`}
              </p>
            )}
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
                    const { order, pairKey, pairLabel, tokenUsername } = entry;
                    const expanded = expandedPairKey === pairKey;
                    const buyPair = buyOrdersByPairData.map.get(pairKey);
                    const quoteLabel = pairLabel.split('/')[1] ?? '';

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
                        {expanded && buyPair && (
                          <tr>
                            <td colSpan={4} className="px-4 pb-4 pt-0">
                              <div className="space-y-4">
                                <BuyOrdersTable
                                  orders={buyPair.top3}
                                  title="Top 3 Buy Orders"
                                  quoteLabel={quoteLabel}
                                  highlightMine
                                />
                                <BuyOrdersTable
                                  orders={buyPair.bottom3}
                                  title="Bottom 3 Buy Orders"
                                  quoteLabel={quoteLabel}
                                  highlightMine={false}
                                />
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
      </div>
    </div>
  );
}
