/**
 * Network & activity analytics – Beyond Social–style layout:
 * Current Status, then one shared KPI grid for 30d vs All time (same metrics in both tabs;
 * 30d shows "—" where the API does not expose a 30-day value).
 */

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Users,
  Link2,
  Hourglass,
  Flame,
  Wallet,
  UserPlus,
  MessageCircle,
  Heart,
  Image,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

import { useNetworkStats } from '@/hooks/useNetworkStats';
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats';
import { useFilteredCountsWithPrevious } from '@/hooks/useFilteredCounts';
import { use30DayTrend } from '@/hooks/use30DayTrend';
import { dashboardBlockHeight } from '@/api/analyticsStatsApi';
import type { DashboardStatsNode, FilteredCounts30D } from '@/api/analyticsStatsApi';

/** Toggle for showing tiny debug buttons on each KPI card that copy the GraphQL snippet. */
const SHOW_KPI_DEBUG_LINKS = true;

/** Shared comments for variables and headers so snippets are copy‑paste ready in the explorer. */
const DEBUG_GQL_RANGE_VARS_COMMENT = `# Variables (example: Jan 28 2026 – Feb 27 2026)
# {
#   "since": "2026-01-28T00:00:00Z",
#   "until": "2026-02-27T23:59:59Z"
# }`;

const DEBUG_GQL_RANGE_VARS_WITH_TYPE_COMMENT = `# Variables (example: Jan 28 2026 – Feb 27 2026, creator coin txnType 11)
# {
#   "since": "2026-01-28T00:00:00Z",
#   "until": "2026-02-27T23:59:59Z",
#   "txnType": 11
# }`;

const DEBUG_GQL_HEADERS_COMMENT = `# Headers (for HTTP clients; GraphQL explorer usually sets these automatically)
# {
#   "Content-Type": "application/json"
# }`;

/** Shared GraphQL snippets for quick troubleshooting (copied to clipboard when you click "GQL"). */
const DEBUG_GQL_DASHBOARD_METRICS = `# Dashboard scalar metrics from dashboardStats
query DashboardMetrics {
  dashboardStats(first: 1) {
    nodes {
      txnCountAll
      txnCount30D
      activeWalletCount30D
      newWalletCount30D
      postCount
      postLongformCount
      commentCount
      txnCountCreatorCoin
      txnCountNft
      txnCountDex
      txnCountSocial
      followCount
      messageCount
      repostCount
      totalSupply
      walletCountAll
      blockHeightCurrent
    }
  }
}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_ALL_TXN_RANGE = `# Transactions = all transactions in date range (no txnType filter, date filter only)
query AllTransactionsInRange($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_POSTS_30D = `# Posts in a date range (used for Posts 30d and similar)
query Posts30D($since: Datetime!, $until: Datetime!) {
  posts(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_COMMENTS_30D = `# Comments in a date range (parentPostHash is not null)
query Comments30D($since: Datetime!, $until: Datetime!) {
  posts(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      parentPostHash: { isNull: false }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_NFT_POSTS_30D = `# NFT posts in a date range (isNft true)
query NftPosts30D($since: Datetime!, $until: Datetime!) {
  posts(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      isNft: { equalTo: true }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_REPOSTS_30D = `# Unique reposts in a date range (repostedPostHash is not null)
query Reposts30D($since: Datetime!, $until: Datetime!) {
  posts(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      repostedPostHash: { isNull: false }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_POSTS_REPOSTED_30D = `# Posts that got reposted in a date range (repostsExist true)
query PostsReposted30D($since: Datetime!, $until: Datetime!) {
  posts(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      repostsExist: true
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_FOLLOW_TXN_30D = `# Follow transactions in a date range (txnType 9 – includes follows and unfollows)
query FollowTxn30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
    }
    condition: { txnType: 9 }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_SOCIAL_TXN_30D = `# Social transactions in date range: txnTypes 6,5,9,2,10,27,28,29,30 (profile, post, follow, diamonds, like, associations). Sum totalCount per type.
query SocialTxn30D($since: Datetime!, $until: Datetime!) {
  transactions(first: 0, filter: { timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until } }, condition: { txnType: 5 }) { totalCount }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_LIKES_REACTIONS_30D = `# Likes/Reactions = Likes (txnType 10) + Create Post Associations (29) - Delete Post Associations (30)
query LikesReactions30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: { contains: { IsUnlike: false } }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_UNLIKES_30D = `# Unlikes in a date range (txnType 10, IsUnlike true)
query Unlikes30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: { contains: { IsUnlike: true } }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_DIAMONDS_30D = `# Diamonds in a date range (txnType 2, extraData contains DiamondLevel)
query Diamonds30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 2 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      extraData: { containsKey: "DiamondLevel" }
    }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

const DEBUG_GQL_TXN_TYPE_30D = `# Generic txnType query in a date range.
# Example: run once per txnType you care about (e.g. 11, 14 for creator coin, 33 for SendMessage),
# then sum the totalCount values in your client code.
query TxnType30D($since: Datetime!, $until: Datetime!, $txnType: Int!) {
  transactions(
    first: 0
    filter: {
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
    }
    condition: { txnType: $txnType }
  ) {
    totalCount
  }
}

${DEBUG_GQL_RANGE_VARS_WITH_TYPE_COMMENT}

${DEBUG_GQL_HEADERS_COMMENT}`;

/** Sum numeric string fields from dashboard; returns null if all missing or zero. */
function sumFields(d: DashboardStatsNode | null, ...keys: (keyof DashboardStatsNode)[]): string | null {
  if (!d) return null;
  let total = 0;
  for (const k of keys) {
    const v = d[k];
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) total += n;
    }
  }
  return total > 0 ? String(total) : null;
}

/** Transactions column (Block Reward, Miscellaneous): light blue. */
const COLOR_TXN = 'border-sky-400/30 bg-sky-500/10';
/** Social = blue (aggregate = Messages + Posts + Reposts + Comments + Follows + Diamonds + Likes/Reactions). */
const COLOR_SOCIAL = 'border-blue-500/30 bg-blue-500/5';
/** Money = green (aggregate = Coin + DAO + NFT). */
const COLOR_MONEY = 'border-emerald-500/30 bg-emerald-500/5';
const COLOR_WALLET = 'border-amber-500/30 bg-amber-500/5';

/** KPI grid: Transactions at top; Social transactions = sum of same-color components; Money transactions = sum of same-color components. TBC-only metrics excluded. */
type MetricGetter = (d: DashboardStatsNode | null, totalUsers: number | null) => string | null;
const KPI_METRICS: {
  label: string;
  icon: React.ElementType;
  colorClass: string;
  get30d: MetricGetter;
  getAllTime: MetricGetter;
  debug30dQuery?: string;
  debugAllQuery?: string;
  has30dQuery?: boolean;
  hasAllTimeQuery?: boolean;
}[] = [
  { label: 'Transactions', icon: Zap, colorClass: COLOR_TXN, get30d: (d) => d?.txnCount30D ?? null, getAllTime: (d) => d?.txnCountAll ?? null, debug30dQuery: DEBUG_GQL_ALL_TXN_RANGE, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  {
    label: 'Social transactions',
    icon: Heart,
    colorClass: COLOR_SOCIAL,
    get30d: (d) =>
      sumFields(
        d,
        'messageTxnCount30D',
        'postCount30D',
        'uniqueRepostsCount30D',
        'commentCount30D',
        'followsCount30D',
        'diamondsCount30D',
        'likesReactionsCount30D'
      ),
    getAllTime: (d) => d?.txnCountSocial ?? null,
    debug30dQuery: DEBUG_GQL_SOCIAL_TXN_30D,
    debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS,
  },
  { label: 'Messages', icon: MessageCircle, colorClass: COLOR_SOCIAL, get30d: (d) => d?.messageTxnCount30D ?? null, getAllTime: (d) => d?.messageCount ?? null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  {
    label: 'Money transactions',
    icon: TrendingUp,
    colorClass: COLOR_MONEY,
    get30d: (d) => sumFields(d, 'coinTxnCount30D', 'daoTxnCount30D', 'nftTxnCount30D'),
    getAllTime: (d) => {
      if (!d) return null;
      const a = Number(d.txnCountCreatorCoin) || 0,
        c = Number(d.txnCountNft) || 0;
      return a + c ? String(a + c) : null;
    },
    debug30dQuery: DEBUG_GQL_TXN_TYPE_30D,
    debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS,
  },
  { label: 'Block reward transactions', icon: Zap, colorClass: COLOR_TXN, get30d: (d) => d?.blockRewardTxnCount30D ?? null, getAllTime: () => null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Posts', icon: MessageCircle, colorClass: COLOR_SOCIAL, get30d: (d) => d?.postCount30D ?? null, getAllTime: (d) => d?.postCount ?? null, debug30dQuery: DEBUG_GQL_POSTS_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Reposts', icon: MessageCircle, colorClass: COLOR_SOCIAL, get30d: (d) => d?.uniqueRepostsCount30D ?? null, getAllTime: (d) => d?.repostCount ?? null, debug30dQuery: DEBUG_GQL_REPOSTS_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Comments', icon: MessageCircle, colorClass: COLOR_SOCIAL, get30d: (d) => d?.commentCount30D ?? null, getAllTime: (d) => d?.commentCount ?? null, debug30dQuery: DEBUG_GQL_COMMENTS_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Coin transactions', icon: TrendingUp, colorClass: COLOR_MONEY, get30d: (d) => d?.coinTxnCount30D ?? null, getAllTime: (d) => d?.txnCountCreatorCoin ?? null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Miscellaneous transactions', icon: Hourglass, colorClass: COLOR_TXN, get30d: (d) => d?.miscTxnCount30D ?? null, getAllTime: () => null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Follows', icon: Users, colorClass: COLOR_SOCIAL, get30d: (d) => d?.followsCount30D ?? null, getAllTime: (d) => d?.followCount ?? null, debug30dQuery: DEBUG_GQL_FOLLOW_TXN_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Diamonds', icon: Zap, colorClass: COLOR_SOCIAL, get30d: (d) => d?.diamondsCount30D ?? null, getAllTime: () => null, debug30dQuery: DEBUG_GQL_DIAMONDS_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'Likes/Reactions', icon: Heart, colorClass: COLOR_SOCIAL, get30d: (d) => d?.likesReactionsCount30D ?? null, getAllTime: () => null, debug30dQuery: DEBUG_GQL_LIKES_REACTIONS_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'DAO transactions', icon: TrendingUp, colorClass: COLOR_MONEY, get30d: (d) => d?.daoTxnCount30D ?? null, getAllTime: () => null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
  { label: 'NFT transactions', icon: Image, colorClass: COLOR_MONEY, get30d: (d) => d?.nftTxnCount30D ?? null, getAllTime: (d) => d?.txnCountNft ?? null, debug30dQuery: DEBUG_GQL_TXN_TYPE_30D, debugAllQuery: DEBUG_GQL_DASHBOARD_METRICS },
];

/** Primary grid layout: 3 rows × 6 columns. Row 1 col 4 empty; order matches image. */
const PRIMARY_LAYOUT: (string | null)[][] = [
  ['Transactions', 'Social transactions', 'Messages', null, 'Money transactions', null],
  ['Block reward transactions', 'Posts', 'Reposts', 'Comments', 'Coin transactions', 'NFT transactions'],
  ['Miscellaneous transactions', 'Follows', 'Diamonds', 'Likes/Reactions', 'DAO transactions', null],
];

/** Mobile: 8 rows, Social and Money KPIs paired (2 cols). */
const MOBILE_PRIMARY_LAYOUT: string[][] = [
  ['Transactions'],
  ['Block reward transactions', 'Miscellaneous transactions'],
  ['Social transactions', 'Money transactions'],
  ['Posts', 'Coin transactions'],
  ['Follows', 'DAO transactions'],
  ['Likes/Reactions', 'NFT transactions'],
  ['Diamonds', 'Messages'],
  ['Reposts', 'Comments'],
];

/** Future KPIs: all-time/30d not yet available; shown in a separate section with — for now. */
const FUTURE_KPI_METRICS: { label: string; icon: React.ElementType; colorClass: string }[] = [
  { label: 'Total supply', icon: TrendingUp, colorClass: COLOR_MONEY },
  { label: 'Users', icon: Users, colorClass: COLOR_SOCIAL },
  { label: 'Wallets (all time)', icon: Wallet, colorClass: COLOR_MONEY },
  { label: 'New wallets', icon: UserPlus, colorClass: COLOR_WALLET },
  { label: 'Active wallets', icon: Wallet, colorClass: COLOR_WALLET },
];

function StatCard({
  label,
  value,
  deltaPct,
  icon: Icon,
  colorClass,
  debugQuery,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  icon: React.ElementType;
  colorClass: string;
  debugQuery?: string;
}) {
  const handleCopy = () => {
    if (!SHOW_KPI_DEBUG_LINKS || !debugQuery) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(debugQuery).catch(() => {
        // ignore clipboard errors
      });
    }
  };

  const IconEl = typeof Icon === 'function' ? Icon : Zap;
  const showDelta = deltaPct != null && Number.isFinite(deltaPct);
  const deltaDir = !showDelta ? null : deltaPct! > 0 ? 'up' : deltaPct! < 0 ? 'down' : 'flat';
  const DeltaIcon = deltaDir === 'up' ? ArrowUpRight : deltaDir === 'down' ? ArrowDownRight : Minus;
  const deltaText =
    !showDelta ? '' : `${deltaPct! > 0 ? '+' : deltaPct! < 0 ? '−' : ''}${Math.abs(deltaPct!).toFixed(1)}%`;
  const deltaClass =
    deltaDir === 'up'
      ? 'text-emerald-600'
      : deltaDir === 'down'
        ? 'text-rose-600'
        : 'text-muted-foreground';

  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 ${colorClass}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {SHOW_KPI_DEBUG_LINKS && debugQuery ? (
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground hover:text-primary"
            >
              GQL
            </button>
          ) : null}
          <IconEl className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {showDelta ? (
          <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${deltaClass}`}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {deltaText}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type TimeRangeTab = '7d' | '30d' | '90d' | '365d' | 'all';

/** Build a dashboard-like object from windowed filtered counts so get30d() can be reused. Transactions = all txns in window (date filter only). */
function dashboardFromCounts(counts: FilteredCounts30D | null): DashboardStatsNode | null {
  if (!counts) return null;
  return {
    ...counts,
    txnCount30D: counts.txnCount30D ?? null,
    activeWalletCount30D: null,
    newWalletCount30D: null,
  } as unknown as DashboardStatsNode;
}

export default function NetworkActivitySection() {
  const { blockHeight, nodeSynced, nodeReachable, mempoolOrNextBlockTxnCount, isLoading: statsLoading } = useNetworkStats();
  const { totalUsers, dashboard, formatStat, isLoading: analyticsLoading, isFetching: analyticsFetching } = useAnalyticsStats();
  const { current: counts7d, previous: prev7d, isLoading: loading7d, isFetching: fetching7d } = useFilteredCountsWithPrevious('7d');
  const { current: counts30d, previous: prev30d, isLoading: loading30d, isFetching: fetching30d } = useFilteredCountsWithPrevious('30d');
  const { current: counts90d, previous: prev90d, isLoading: loading90d, isFetching: fetching90d } = useFilteredCountsWithPrevious('90d');
  const { current: counts365d, previous: prev365d, isLoading: loading365d, isFetching: fetching365d } = useFilteredCountsWithPrevious('365d');
  const { data: trendData } = use30DayTrend();
  const blockHeightDisplay = blockHeight ?? dashboardBlockHeight(dashboard);
  const [timeRange, setTimeRange] = useState<TimeRangeTab>('30d');

  const isWindowed = timeRange !== 'all';
  const windowCounts =
    timeRange === '7d'
      ? counts7d
      : timeRange === '30d'
        ? counts30d
        : timeRange === '90d'
          ? counts90d
          : timeRange === '365d'
            ? counts365d
            : null;
  const prevWindowCounts =
    timeRange === '7d'
      ? prev7d
      : timeRange === '30d'
        ? prev30d
        : timeRange === '90d'
          ? prev90d
          : timeRange === '365d'
            ? prev365d
            : null;
  const windowLoading =
    timeRange === '7d'
      ? loading7d
      : timeRange === '30d'
        ? loading30d
        : timeRange === '90d'
          ? loading90d
          : timeRange === '365d'
            ? loading365d
            : false;
  const windowFetching =
    timeRange === '7d'
      ? fetching7d
      : timeRange === '30d'
        ? fetching30d
        : timeRange === '90d'
          ? fetching90d
          : timeRange === '365d'
            ? fetching365d
            : false;
  const dashboardForRange =
    timeRange === 'all' ? dashboard : dashboardFromCounts(windowCounts);
  const dashboardPrevForRange = timeRange === 'all' ? null : dashboardFromCounts(prevWindowCounts);

  // Helpers for derived metrics (per‑day, per‑post, mix percentages).
  const num = (v: string | null | undefined): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const windowDays =
    timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '365d' ? 365 : null;

  const perDay = (value: number | null, days: number | null): number | null =>
    value != null && days && days > 0 ? value / days : null;

  const perPost = (value: number | null, posts: number | null): number | null =>
    value != null && posts && posts > 0 ? value / posts : null;

  const pctOf = (numVal: number | null, denom: number | null): number | null =>
    numVal != null && denom && denom > 0 ? (numVal / denom) * 100 : null;

  const derivedLoading =
    timeRange === 'all'
      ? analyticsLoading
      : isWindowed
        ? windowLoading || (windowFetching && !windowCounts) || analyticsLoading
        : analyticsLoading;

  const pctChange = (cur: number | null, prev: number | null): number | null => {
    if (cur == null || prev == null) return null;
    if (prev === 0) return cur === 0 ? 0 : null;
    return ((cur - prev) / prev) * 100;
  };

  const makeDerivedDisplay = (
    src: DashboardStatsNode | null,
    calc: (d: DashboardStatsNode) => number | null,
    opts?: { percent?: boolean }
  ): string => {
    if (!windowDays || !src) return '—';
    if (derivedLoading) return '…';
    const v = calc(src);
    if (v == null || !Number.isFinite(v)) return '—';
    return opts?.percent ? `${v.toFixed(1)}%` : v.toFixed(2);
  };

  const calcFollowsPerDay = (src: DashboardStatsNode) => perDay(num(src.followsCount30D), windowDays);
  const followsPerDayDisplay = makeDerivedDisplay(dashboardForRange, calcFollowsPerDay);
  const followsPerDayDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcFollowsPerDay(dashboardForRange) : null,
          dashboardPrevForRange ? calcFollowsPerDay(dashboardPrevForRange) : null
        );

  const calcPostsPerDay = (src: DashboardStatsNode) => perDay(num(src.postCount30D), windowDays);
  const postsPerDayDisplay = makeDerivedDisplay(dashboardForRange, calcPostsPerDay);
  const postsPerDayDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcPostsPerDay(dashboardForRange) : null,
          dashboardPrevForRange ? calcPostsPerDay(dashboardPrevForRange) : null
        );

  const calcDiamondsPerPost = (src: DashboardStatsNode) => perPost(num(src.diamondsCount30D), num(src.postCount30D));
  const diamondsPerPostDisplay = makeDerivedDisplay(dashboardForRange, calcDiamondsPerPost);
  const diamondsPerPostDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcDiamondsPerPost(dashboardForRange) : null,
          dashboardPrevForRange ? calcDiamondsPerPost(dashboardPrevForRange) : null
        );

  const calcLikesPerPost = (src: DashboardStatsNode) =>
    perPost(num(src.likesReactionsCount30D), num(src.postCount30D));
  const likesPerPostDisplay = makeDerivedDisplay(dashboardForRange, calcLikesPerPost);
  const likesPerPostDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcLikesPerPost(dashboardForRange) : null,
          dashboardPrevForRange ? calcLikesPerPost(dashboardPrevForRange) : null
        );

  const calcCommentsPerPost = (src: DashboardStatsNode) => perPost(num(src.commentCount30D), num(src.postCount30D));
  const commentsPerPostDisplay = makeDerivedDisplay(dashboardForRange, calcCommentsPerPost);
  const commentsPerPostDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcCommentsPerPost(dashboardForRange) : null,
          dashboardPrevForRange ? calcCommentsPerPost(dashboardPrevForRange) : null
        );

  const calcRepostsPerPost = (src: DashboardStatsNode) => perPost(num(src.uniqueRepostsCount30D), num(src.postCount30D));
  const repostsPerPostDisplay = makeDerivedDisplay(dashboardForRange, calcRepostsPerPost);
  const repostsPerPostDeltaPct =
    derivedLoading || timeRange === 'all'
      ? null
      : pctChange(
          dashboardForRange ? calcRepostsPerPost(dashboardForRange) : null,
          dashboardPrevForRange ? calcRepostsPerPost(dashboardPrevForRange) : null
        );

  const socialTxMixDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const social = num(
        sumFields(
          src,
          'messageTxnCount30D',
          'postCount30D',
          'uniqueRepostsCount30D',
          'commentCount30D',
          'followsCount30D',
          'diamondsCount30D',
          'likesReactionsCount30D'
        )
      );
      const total = num(src.txnCount30D);
      return pctOf(social, total);
    },
    { percent: true }
  );

  const blockRewardMixDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const blockReward = num(src.blockRewardTxnCount30D);
      const total = num(src.txnCount30D);
      return pctOf(blockReward, total);
    },
    { percent: true }
  );

  const moneyTxMixDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const money = num(sumFields(src, 'coinTxnCount30D', 'daoTxnCount30D', 'nftTxnCount30D'));
      const total = num(src.txnCount30D);
      return pctOf(money, total);
    },
    { percent: true }
  );

  const ccShareOfMoneyDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const cc = num(src.coinTxnCount30D);
      const money = num(sumFields(src, 'coinTxnCount30D', 'daoTxnCount30D', 'nftTxnCount30D'));
      return pctOf(cc, money);
    },
    { percent: true }
  );

  const daoShareOfMoneyDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const dao = num(src.daoTxnCount30D);
      const money = num(sumFields(src, 'coinTxnCount30D', 'daoTxnCount30D', 'nftTxnCount30D'));
      return pctOf(dao, money);
    },
    { percent: true }
  );

  const nftShareOfMoneyDisplay = makeDerivedDisplay(
    dashboardForRange,
    (src) => {
      const nft = num(src.nftTxnCount30D);
      const money = num(sumFields(src, 'coinTxnCount30D', 'daoTxnCount30D', 'nftTxnCount30D'));
      return pctOf(nft, money);
    },
    { percent: true }
  );

  const renderPrimaryKpiCard = (label: string, key: string) => {
    const metric = KPI_METRICS.find((m) => m.label === label);
    if (!metric) return null;
    let raw: string | null = null;
    let prevRaw: string | null = null;
    let displayValue = '—';
    let deltaPct: number | null = null;
    try {
      const get30d = metric.get30d;
      const getAllTime = metric.getAllTime;
      if (typeof get30d !== 'function' || typeof getAllTime !== 'function') return null;
      const isAll = timeRange === 'all';
      const isWindowed = timeRange !== 'all';
      const supported = isAll ? metric.hasAllTimeQuery !== false : metric.has30dQuery !== false;
      raw = isAll ? getAllTime(dashboard, totalUsers) : get30d(dashboardForRange ?? null, totalUsers);
      prevRaw = isAll ? null : get30d(dashboardPrevForRange ?? null, totalUsers);
      const loading = isAll ? analyticsLoading : (windowLoading || (isWindowed && windowFetching && !windowCounts));
      if (!supported) displayValue = 'TBC';
      else if (loading) displayValue = '…';
      else {
        const format = typeof formatStat === 'function' ? formatStat : (v: string | null | undefined) => { const n = v != null && v !== '' ? Number(v) : NaN; return Number.isFinite(n) ? n.toLocaleString() : '—'; };
        displayValue = format(raw ?? undefined);
      }
      if (!isAll && supported && !loading) {
        const curN = num(raw);
        const prevN = num(prevRaw);
        if (curN != null && prevN != null) {
          if (prevN === 0) deltaPct = curN === 0 ? 0 : null;
          else deltaPct = ((curN - prevN) / prevN) * 100;
        }
      }
    } catch {
      displayValue = '—';
    }
    const debugQuery = timeRange === 'all' ? metric.debugAllQuery : metric.debug30dQuery;
    const IconComponent = metric.icon != null && typeof metric.icon === 'function' ? metric.icon : Zap;
    return (
      <StatCard
        key={key}
        label={label}
        value={displayValue}
        deltaPct={timeRange === 'all' ? null : deltaPct}
        icon={IconComponent}
        colorClass={metric.colorClass ?? ''}
        debugQuery={debugQuery}
      />
    );
  };

  return (
    <section className="space-y-4">
      {/* Current Status */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-medium text-muted-foreground">Current status</h4>
          <span className="text-xs font-mono text-muted-foreground">
            {statsLoading ? 'Node: Checking…' : nodeReachable ? (nodeSynced ? 'Node: Synced' : 'Node: Not synced') : 'Node: Unreachable'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Online users"
            value="—"
            icon={Users}
            colorClass="border-emerald-500/30 bg-emerald-500/5"
          />
          <StatCard
            label="Blockheight"
            value={
              statsLoading && !dashboard
                ? '…'
                : blockHeightDisplay != null
                  ? blockHeightDisplay.toLocaleString()
                  : '—'
            }
            icon={Link2}
            colorClass="border-blue-500/30 bg-blue-500/5"
          />
          <StatCard
            label="Mempool"
            value={
              statsLoading
                ? '…'
                : mempoolOrNextBlockTxnCount != null
                  ? String(mempoolOrNextBlockTxnCount)
                  : '0'
            }
            icon={Hourglass}
            colorClass="border-amber-500/30 bg-amber-500/5"
          />
          <StatCard
            label="Gas fee"
            value={'>$.01'}
            icon={Flame}
            colorClass="border-rose-500/30 bg-rose-500/5"
          />
        </div>
      </div>

      {/* Time period tabs – below Current Status */}
      <div className="flex flex-wrap items-center gap-2">
        {(analyticsFetching && !analyticsLoading) || (isWindowed && windowFetching) ? (
          <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            {isWindowed && (windowLoading || (windowFetching && !windowCounts)) ? 'Loading…' : 'Refreshing…'}
          </span>
        ) : null}
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 text-xs">
          {(['7d', '30d', '90d', '365d', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeRange(tab)}
              className={`px-3 py-1 rounded-full transition-colors ${
                timeRange === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {tab === 'all' ? 'All time' : tab === '365d' ? '1Y' : tab === '30d' ? '30D' : tab === '7d' ? '7D' : '90D'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPIs: desktop 3-row grid; mobile 8-row Social/Money paired */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          {timeRange === 'all'
            ? 'All time'
            : timeRange === '7d'
              ? 'Last 7 days'
              : timeRange === '30d'
                ? 'Last 30 days'
                : timeRange === '90d'
                  ? 'Last 90 days'
                  : 'Last 1 year'}
        </h4>
        {/* Desktop: 3-row grid */}
        <div className="hidden md:block space-y-4">
          {PRIMARY_LAYOUT.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4"
            >
              {row.map((label, colIdx) =>
                label === null ? <div key={`empty-${rowIdx}-${colIdx}`} /> : renderPrimaryKpiCard(label, `d-${rowIdx}-${colIdx}`)
              )}
            </div>
          ))}
        </div>
        {/* Mobile: 8 rows, Social/Money paired (2 cols) */}
        <div className="md:hidden space-y-4">
          {MOBILE_PRIMARY_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-2 gap-4">
              {row.map((label) => renderPrimaryKpiCard(label, `m-${rowIdx}-${label}`))}
            </div>
          ))}
        </div>
      </div>

      <div className="h-2" />

      {/* Derived metrics: per-day and per-post, only meaningful for windowed ranges. */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Derived activity metrics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <StatCard
            label="Follows/Day"
            value={followsPerDayDisplay}
            icon={Users}
            colorClass={COLOR_SOCIAL}
            deltaPct={followsPerDayDeltaPct}
          />
          <StatCard
            label="Posts/Day"
            value={postsPerDayDisplay}
            icon={MessageCircle}
            colorClass={COLOR_SOCIAL}
            deltaPct={postsPerDayDeltaPct}
          />
          <StatCard
            label="Diamonds/Post"
            value={diamondsPerPostDisplay}
            icon={Zap}
            colorClass={COLOR_SOCIAL}
            deltaPct={diamondsPerPostDeltaPct}
          />
          <StatCard
            label="Likes/Reactions/Post"
            value={likesPerPostDisplay}
            icon={Heart}
            colorClass={COLOR_SOCIAL}
            deltaPct={likesPerPostDeltaPct}
          />
          <StatCard
            label="Comments/Post"
            value={commentsPerPostDisplay}
            icon={MessageCircle}
            colorClass={COLOR_SOCIAL}
            deltaPct={commentsPerPostDeltaPct}
          />
          <StatCard
            label="Reposts/Post"
            value={repostsPerPostDisplay}
            icon={MessageCircle}
            colorClass={COLOR_SOCIAL}
            deltaPct={repostsPerPostDeltaPct}
          />
        </div>
      </div>

      <div className="h-2" />

      {/* Derived metrics: transaction mix (labels + values, then formula row). */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Transaction mix</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <StatCard
            label="Social Transaction Mix"
            value={socialTxMixDisplay}
            icon={Heart}
            colorClass={COLOR_SOCIAL}
          />
          <StatCard
            label="Block Reward Transactions %"
            value={blockRewardMixDisplay}
            icon={Zap}
            colorClass={COLOR_TXN}
          />
          <StatCard
            label="Money Transactions Mix"
            value={moneyTxMixDisplay}
            icon={TrendingUp}
            colorClass={COLOR_MONEY}
          />
          <StatCard
            label="CC Transactions %"
            value={ccShareOfMoneyDisplay}
            icon={TrendingUp}
            colorClass={COLOR_MONEY}
          />
          <StatCard
            label="DAO Transactions %"
            value={daoShareOfMoneyDisplay}
            icon={TrendingUp}
            colorClass={COLOR_MONEY}
          />
          <StatCard
            label="NFT Transactions %"
            value={nftShareOfMoneyDisplay}
            icon={Image}
            colorClass={COLOR_MONEY}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-2">
          <p className="text-xs text-muted-foreground">Social Transactions / Total Transactions</p>
          <p className="text-xs text-muted-foreground">Block Reward Transactions / Total Transactions</p>
          <p className="text-xs text-muted-foreground">Money Transactions / Total Transactions</p>
          <p className="text-xs text-muted-foreground">CC Transactions / Money Transactions</p>
          <p className="text-xs text-muted-foreground">DAO Transactions / Money Transactions</p>
          <p className="text-xs text-muted-foreground">NFT Transactions / Money Transactions</p>
        </div>
      </div>

      {/* Future KPIs: Total supply, Users, Wallets, New/Active wallets, DEX – placeholders until API supports. */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Future KPIs</h4>
        <p className="text-xs text-muted-foreground mb-3">
          These metrics will be added when all-time or windowed data is available (may require different queries or indexing).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {FUTURE_KPI_METRICS.map(({ label, icon: Icon, colorClass }) => (
            <StatCard
              key={label}
              label={label}
              value="—"
              icon={Icon}
              colorClass={colorClass}
            />
          ))}
        </div>
      </div>

      {/* 30 day trend chart (only when 30d tab is selected) */}
      {timeRange === '30d' && (
        <div>
            <div className="flex items-center gap-3 mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">30 day trend</h4>
              <span className="text-xs text-muted-foreground">Active wallets, transactions, new wallets (DeSo GraphQL)</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.toLocaleString()}
                  label={{ value: 'Users', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  label={{ value: 'Transaction count', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                />
                    <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    name === 'transactions' ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString(),
                    name === 'activeWallets' ? 'Active wallets' : name === 'newWallets' ? 'New wallets' : 'Transactions',
                  ]}
                />
                    <Legend
                  formatter={(value) =>
                    value === 'activeWallets'
                      ? 'Active wallets'
                      : value === 'newWallets'
                        ? 'New wallets'
                        : 'Transactions'
                  }
                />
                    <Line
                  type="monotone"
                  dataKey="activeWallets"
                  yAxisId="left"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2}
                  dot={false}
                  name="activeWallets"
                />
                    <Line
                  type="monotone"
                  dataKey="transactions"
                  yAxisId="right"
                  stroke="hsl(199, 89%, 48%)"
                  strokeWidth={2}
                  dot={false}
                  name="transactions"
                />
                    <Line
                  type="monotone"
                  dataKey="newWallets"
                  yAxisId="left"
                  stroke="hsl(173, 80%, 40%)"
                  strokeWidth={2}
                  dot={false}
                  name="newWallets"
                />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
      )}

    </section>
  );
}
