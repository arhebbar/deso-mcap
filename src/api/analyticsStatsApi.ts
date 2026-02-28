/**
 * Analytics stats from DeSo GraphQL (dashboardStats + accounts totalCount + daily stats for trend).
 * Uses posts(filter: { timestamp: { greaterThan } }) for Last 30 days Posts when supported.
 * Values are cached in localStorage for fast load.
 *
 * Transaction type reference (DeSo):
 * — Social: Update Profile 6, SUBMIT_POST 5, FOLLOW/UNFOLLOW 9, DIAMONDS 2, LIKE 10,
 *   Create User Associations 27, Delete User Associations 28, Create Post Associations 29, Delete Post Associations 30.
 * — Social Messaging: SEND_MESSAGE (deprecated) 4, Create/Update Access Group 31, Add/Remove Access Group Members 32,
 *   SEND_DIRECT_MESSAGE / UPDATE MSG / SEND GROUP CHAT 33.
 * — Money (CC/DESO): Send DESO 2, Buy or Sell CC 11, Transfer CC 14.
 * — Money (DESO Tokens): Create DESO Token 24, Send DESO Token 25, Buy/Sell Limit Order 26, Cancel Limit Order 26 (CancelOrderID).
 */

import { getCachedValue, setCachedValue } from '@/utils/localCache';

const DESO_GRAPHQL = import.meta.env.DEV ? '/deso-graphql' : '/api/deso-graphql';
const ANALYTICS_CACHE_KEY = 'analytics-stats-cache-v1';
const TREND_CACHE_KEY = 'analytics-trend-cache-v1';
// Bump version whenever we change the shape or queries of the filtered counts payload.
const FILTERED_COUNTS_CACHE_VERSION = 'v7';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Time windows for filtered counts (same query set, different date range). */
export type TimeWindow = '7d' | '30d' | '90d' | '365d';

export function getFilteredCountsCacheKey(window: TimeWindow): string {
  return `analytics-filtered-${window}-${FILTERED_COUNTS_CACHE_VERSION}`;
}

export function getFilteredCountsPrevCacheKey(window: TimeWindow): string {
  return `analytics-filtered-${window}-prev-${FILTERED_COUNTS_CACHE_VERSION}`;
}

/** Raw dashboard node from GraphQL (BigInt/BigFloat are returned as strings). */
export interface DashboardStatsNode {
  txnCountAll: string | null;
  txnCount30D: string | null;
  activeWalletCount30D: string | null;
  newWalletCount30D: string | null;
  postCount: string | null;
  postLongformCount: string | null;
  commentCount: string | null;
  txnCountCreatorCoin: string | null;
  txnCountNft: string | null;
  txnCountDex: string | null;
  txnCountSocial: string | null;
  blockHeightCurrent: string | null;
  followCount: string | null;
  messageCount: string | null;
  repostCount: string | null;
  totalSupply: string | null;
  walletCountAll: string | null;
  /** Set when posts(filter: { timestamp }) totalCount succeeds (Last 30 days). */
  postCount30D?: string | null;
  /** Comments in last 30d: posts with parentPostHash isNull false + timestamp range. */
  commentCount30D?: string | null;
  /** NFT posts in last 30d: posts with isNft equalTo true + timestamp range. */
  nftPostCount30D?: string | null;
  /** Posts that got reposted in last 30d: repostsExist true + timestamp range. */
  postsRepostedCount30D?: string | null;
  /** Unique reposts in last 30d: repostedPostHash isNull false + timestamp range. */
  uniqueRepostsCount30D?: string | null;
  /** Follows in last 30d: Follow transaction (txnType 9) with IsUnfollow false + timestamp range. */
  followsCount30D?: string | null;
  /** Unfollows in last 30d: Follow transaction (txnType 9) with IsUnfollow true + timestamp range. */
  unfollowsCount30D?: string | null;
  /** Likes in last 30d: Like transaction (txnType 10) with IsUnlike false + timestamp range. */
  likesCount30D?: string | null;
  /** Unlikes in last 30d: Like transaction (txnType 10) with IsUnlike true + timestamp range. */
  unlikesCount30D?: string | null;
  /** Likes/Reactions in last 30d: Likes (10) + Create Post Associations (29) - Delete Post Associations (30). */
  likesReactionsCount30D?: string | null;
  /** Diamonds in last 30d: Basic transfer (txnType 2) with DiamondLevel extraData + timestamp range. */
  diamondsCount30D?: string | null;
  /** Creator coin txns in last 30d: txnType 11 (buy/sell) + 14 (transfer). */
  coinTxnCount30D?: string | null;
  /** Message txns in last 30d: txnType 4. */
  messageTxnCount30D?: string | null;
  /** DAO coin txns in last 30d: txnType 25 (transfer) + 26 (place/cancel limit order). */
  daoTxnCount30D?: string | null;
  /** NFT txns in last 30d: txnTypes 15,16,17,19,20 aggregated. */
  nftTxnCount30D?: string | null;
  /** Block reward txns in last 30d: txnType 1. */
  blockRewardTxnCount30D?: string | null;
  /** Misc txns in last 30d: 6 (Update Profile), 22 (Authorize Derived Key), 27/28 (User Associations). */
  miscTxnCount30D?: string | null;
}

/** One day of activity for the 30-day trend chart. */
export interface DailyTrendPoint {
  date: string;
  activeWallets: number;
  transactions: number;
  newWallets: number;
}

export interface AnalyticsStats {
  /** Total accounts (profiles) from accounts connection; fallback when dashboard has no walletCountAll. */
  totalUsers: number | null;
  /** Single dashboard node with all metrics (null if query failed). */
  dashboard: DashboardStatsNode | null;
}

/** Result of posts(filter: ...) and transactions(filter: ...) totalCount queries per window. Cached 24h. */
export interface FilteredCounts30D {
  /** All transactions in window (no txnType filter, date filter only). */
  txnCount30D: string | null;
  postCount30D: string | null;
  commentCount30D: string | null;
  nftPostCount30D: string | null;
  postsRepostedCount30D: string | null;
  uniqueRepostsCount30D: string | null;
  followsCount30D: string | null;
  unfollowsCount30D: string | null;
  likesCount30D: string | null;
  unlikesCount30D: string | null;
  /** Likes/Reactions = Likes (10) + Create Post Associations (29) - Delete Post Associations (30). */
  likesReactionsCount30D: string | null;
  diamondsCount30D: string | null;
  coinTxnCount30D: string | null;
  messageTxnCount30D: string | null;
  daoTxnCount30D: string | null;
  nftTxnCount30D: string | null;
  blockRewardTxnCount30D: string | null;
  miscTxnCount30D: string | null;
}

const DASHBOARD_METRICS_QUERY = `
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
        blockHeightCurrent
        followCount
        messageCount
        repostCount
        totalSupply
        walletCountAll
      }
    }
  }
`;

const ACCOUNTS_TOTAL_QUERY = `
  query AccountsTotal {
    accounts(first: 1) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;

/** ISO 8601 datetime for GraphQL Datetime filters (e.g. 2025-01-15T00:00:00.000Z). */
function fmtISO(d: Date): string {
  return d.toISOString();
}

function daysForWindow(window: TimeWindow): number {
  return window === '7d' ? 7 : window === '30d' ? 30 : window === '90d' ? 90 : 365;
}

/** Date range for a time window in API format (MM/DD/YYYY). */
export function getRangeForWindow(window: TimeWindow): { since: string; until: string } {
  return getRangeForWindowOffset(window, 0);
}

/**
 * Date range for a time window with an offset.
 * offsetPeriods=0 => current window (e.g. last 7 days)
 * offsetPeriods=1 => previous window (e.g. previous 7 days)
 */
/** Date range for a time window. Returns ISO 8601 strings for GraphQL Datetime filters. */
export function getRangeForWindowOffset(window: TimeWindow, offsetPeriods: number): { since: string; until: string } {
  const days = daysForWindow(window);
  const until = new Date();
  const since = new Date();
  until.setDate(until.getDate() - days * offsetPeriods);
  since.setDate(since.getDate() - days * (offsetPeriods + 1));
  return { since: fmtISO(since), until: fmtISO(until) };
}

/** Date range for last 30 days (convenience). */
function last30DayRange(): { since: string; until: string } {
  return getRangeForWindow('30d');
}

/** Last 30 days posts: timestamp greaterThan. */
function postsCount30DQuery(since: string) {
  return `
  query PostsCount30D {
    posts(first: 0, filter: { timestamp: { greaterThan: "${since}" } }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Comments in range: parentPostHash isNull false + timestamp range. */
function comments30DQuery(since: string, until: string) {
  return `
  query Comments30D {
    posts(first: 0, filter: {
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      parentPostHash: { isNull: false }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** NFT posts in range: isNft equalTo true + timestamp range. */
function nftPosts30DQuery(since: string, until: string) {
  return `
  query NftPosts30D {
    posts(first: 0, filter: {
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      isNft: { equalTo: true }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Posts that got reposted in range: repostsExist true + timestamp range. */
function postsReposted30DQuery(since: string, until: string) {
  return `
  query PostsReposted30D {
    posts(first: 0, filter: {
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      repostsExist: true
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Unique reposts in range: repostedPostHash isNull false + timestamp range. */
function uniqueReposts30DQuery(since: string, until: string) {
  return `
  query UniqueReposts30D {
    posts(first: 0, filter: {
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      repostedPostHash: { isNull: false }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Follow txns in range (follows + unfollows combined): condition txnType 9 + timestamp range. */
function followTxn30DQuery(since: string, until: string) {
  return `
  query FollowTxn30D {
    transactions(
      first: 0
      filter: {
        timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      }
      condition: { txnType: 9 }
    ) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Follows in range: txnType 9 + IsUnfollow false + timestamp range. */
function follows30DQuery(since: string, until: string) {
  return `
  query Follows30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: 9 }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      txIndexMetadata: {
        containsKey: "IsUnfollow"
        contains: { IsUnfollow: false }
      }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Unfollows in range: txnType 9 + IsUnfollow true + timestamp range. */
function unfollows30DQuery(since: string, until: string) {
  return `
  query Unfollows30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: 9 }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      txIndexMetadata: {
        containsKey: "IsUnfollow"
        contains: { IsUnfollow: true }
      }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Likes in range: txnType 10 + IsUnlike false + timestamp range. */
function likes30DQuery(since: string, until: string) {
  return `
  query Likes30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      txIndexMetadata: {
        contains: { IsUnlike: false }
      }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Unlikes in range: txnType 10 + IsUnlike true + timestamp range. */
function unlikes30DQuery(since: string, until: string) {
  return `
  query Unlikes30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      txIndexMetadata: {
        contains: { IsUnlike: true }
      }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Diamonds in range: txnType 2 + extraData contains DiamondLevel + timestamp range. */
function diamonds30DQuery(since: string, until: string) {
  return `
  query Diamonds30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: 2 }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
      extraData: {
        containsKey: "DiamondLevel"
      }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** All transactions in date range (no txnType filter, date filter only). */
function allTransactionsInRangeQuery(since: string, until: string) {
  return `
  query AllTransactionsInRange {
    transactions(first: 0, filter: {
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

/** Simple helper: single txnType within 30d window, no extra metadata filters. */
function simpleTxnType30DQuery(txnType: number, since: string, until: string) {
  return `
  query TxnType${txnType}Count30D {
    transactions(first: 0, filter: {
      txnType: { equalTo: ${txnType} }
      timestamp: { greaterThanOrEqualTo: "${since}", lessThanOrEqualTo: "${until}" }
    }) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;
}

const DAILY_TREND_QUERY = `
  query DailyTrend($first: Int!) {
    dailyTxnCountStats(first: $first, orderBy: [DAY_DESC]) {
      nodes { day transactionCount }
    }
    dailyActiveWalletCountStats(first: $first, orderBy: [DAY_DESC]) {
      nodes { day count }
    }
    dailyNewWalletCountStats(first: $first, orderBy: [DAY_DESC]) {
      nodes { day walletCount }
    }
  }
`;

function parseNum(s: string | null | undefined): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Run a single posts totalCount query; returns count or null. */
async function runPostsCountQuery(query: string): Promise<number | null> {
  try {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { posts?: { totalCount?: number } };
      errors?: Array<{ message?: string }>;
    };
    if (json?.errors?.length) return null;
    const n = json?.data?.posts?.totalCount;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Run a single transactions totalCount query; returns count or null. */
async function runTransactionsCountQuery(query: string): Promise<number | null> {
  try {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { transactions?: { totalCount?: number } };
      errors?: Array<{ message?: string }>;
    };
    if (json?.errors?.length) return null;
    const n = json?.data?.transactions?.totalCount;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Fetch filtered counts for a time window (posts, comments, NFT posts, reposts, follows, likes, diamonds, coin/DAO/NFT txns, messages, block rewards, misc).
 * Uses 24h cache per window.
 */
export async function fetchFilteredCountsForWindow(window: TimeWindow): Promise<FilteredCounts30D> {
  return fetchFilteredCountsForWindowOffset(window, 0);
}

async function fetchFilteredCountsForWindowOffset(window: TimeWindow, offsetPeriods: number): Promise<FilteredCounts30D> {
  const cacheKey = offsetPeriods === 0 ? getFilteredCountsCacheKey(window) : getFilteredCountsPrevCacheKey(window);
  const cached = getCachedValue<FilteredCounts30D>(cacheKey, ONE_DAY_MS);
  if (cached) return cached;

  const { since, until } = getRangeForWindowOffset(window, offsetPeriods);

  const [
    allTxnCount,
    postCount,
    commentCount,
    nftCount,
    postsReposted,
    uniqueReposts,
    followTxn,
    likes,
    unlikes,
    diamonds,
    coin11,
    coin14,
    msg33,
    dao25,
    dao26,
    nft15,
    nft16,
    nft17,
    nft18,
    nft19,
    nft20,
    nft21,
    txn29,
    txn30,
    blockReward1,
    updateProfile6,
    derivedKey22,
    userAssoc27,
    userAssoc28,
  ] = await Promise.all([
    runTransactionsCountQuery(allTransactionsInRangeQuery(since, until)),
    runPostsCountQuery(postsCount30DQuery(since)),
    runPostsCountQuery(comments30DQuery(since, until)),
    runPostsCountQuery(nftPosts30DQuery(since, until)),
    runPostsCountQuery(postsReposted30DQuery(since, until)),
    runPostsCountQuery(uniqueReposts30DQuery(since, until)),
    runTransactionsCountQuery(followTxn30DQuery(since, until)),
    runTransactionsCountQuery(likes30DQuery(since, until)),
    runTransactionsCountQuery(unlikes30DQuery(since, until)),
    runTransactionsCountQuery(diamonds30DQuery(since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(11, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(14, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(33, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(25, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(26, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(15, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(16, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(17, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(18, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(19, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(20, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(21, since, until)),
    runTransactionsCountQuery(simpleTxnType30DQuery(29, since, until)), // Create Post Associations
    runTransactionsCountQuery(simpleTxnType30DQuery(30, since, until)), // Delete Post Associations
    runTransactionsCountQuery(simpleTxnType30DQuery(1, since, until)), // Block Reward
    runTransactionsCountQuery(simpleTxnType30DQuery(6, since, until)), // Update Profile
    runTransactionsCountQuery(simpleTxnType30DQuery(22, since, until)), // Authorize Derived Key
    runTransactionsCountQuery(simpleTxnType30DQuery(27, since, until)), // Create User Associations
    runTransactionsCountQuery(simpleTxnType30DQuery(28, since, until)), // Delete User Associations
  ]);

  const sum = (...values: Array<number | null>): number | null => {
    let total = 0;
    for (const v of values) {
      if (typeof v === 'number' && Number.isFinite(v)) total += v;
    }
    return total > 0 ? total : null;
  };

  const result: FilteredCounts30D = {
    txnCount30D: allTxnCount != null ? String(allTxnCount) : null,
    postCount30D: postCount != null ? String(postCount) : null,
    commentCount30D: commentCount != null ? String(commentCount) : null,
    nftPostCount30D: nftCount != null ? String(nftCount) : null,
    postsRepostedCount30D: postsReposted != null ? String(postsReposted) : null,
    uniqueRepostsCount30D: uniqueReposts != null ? String(uniqueReposts) : null,
    followsCount30D: followTxn != null ? String(followTxn) : null,
    unfollowsCount30D: null,
    likesCount30D: likes != null ? String(likes) : null,
    unlikesCount30D: unlikes != null ? String(unlikes) : null,
    likesReactionsCount30D: (() => {
      const l = likes ?? 0;
      const c29 = txn29 ?? 0;
      const d30 = txn30 ?? 0;
      const val = l + c29 - d30;
      return val > 0 ? String(val) : null;
    })(),
    diamondsCount30D: diamonds != null ? String(diamonds) : null,
    coinTxnCount30D: sum(coin11, coin14) != null ? String(sum(coin11, coin14)!) : null,
    messageTxnCount30D: msg33 != null ? String(msg33) : null,
    daoTxnCount30D: sum(dao25, dao26) != null ? String(sum(dao25, dao26)!) : null,
    nftTxnCount30D:
      sum(nft15, nft16, nft17, nft18, nft19, nft20, nft21) != null
        ? String(sum(nft15, nft16, nft17, nft18, nft19, nft20, nft21)!)
        : null,
    blockRewardTxnCount30D: blockReward1 != null ? String(blockReward1) : null,
    miscTxnCount30D:
      sum(updateProfile6, derivedKey22, userAssoc27, userAssoc28) != null
        ? String(sum(updateProfile6, derivedKey22, userAssoc27, userAssoc28)!)
        : null,
  };

  setCachedValue<FilteredCounts30D>(cacheKey, result);
  return result;
}

/** Fetch 30d filtered counts (delegates to fetchFilteredCountsForWindow). */
export async function fetchFilteredCounts30D(): Promise<FilteredCounts30D> {
  return fetchFilteredCountsForWindow('30d');
}

export interface FilteredCountsWithPrevious {
  current: FilteredCounts30D;
  previous: FilteredCounts30D;
}

/** Fetch current + previous window counts (both cached for 24h). */
export async function fetchFilteredCountsWithPrevious(window: TimeWindow): Promise<FilteredCountsWithPrevious> {
  const [current, previous] = await Promise.all([
    fetchFilteredCountsForWindowOffset(window, 0),
    fetchFilteredCountsForWindowOffset(window, 1),
  ]);
  return { current, previous };
}

/**
 * Fetch analytics: runs DashboardMetrics then AccountsTotal (for totalUsers fallback).
 * Returns all dashboard stats so the UI can show them; numbers not showing before was because
 * we only fetched accounts totalCount and never dashboardStats.
 */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  let totalUsers: number | null = null;
  let dashboard: DashboardStatsNode | null = null;

  try {
    const [dashboardRes, accountsRes] = await Promise.all([
      fetch(DESO_GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: DASHBOARD_METRICS_QUERY }),
      }),
      fetch(DESO_GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ACCOUNTS_TOTAL_QUERY }),
      }),
    ]);

    if (dashboardRes.ok) {
      const dashboardJson = (await dashboardRes.json()) as {
        data?: { dashboardStats?: { nodes?: DashboardStatsNode[] } };
        errors?: Array<{ message?: string }>;
      };
      if (!dashboardJson?.errors?.length && dashboardJson?.data?.dashboardStats?.nodes?.length) {
        dashboard = { ...dashboardJson.data.dashboardStats.nodes[0] };
        // 30d filtered counts (comments, NFTs, reposts, follows, likes, diamonds, txns): cached 24h, time-consuming queries
        const filtered = await fetchFilteredCounts30D();
        if (filtered.postCount30D != null) dashboard.postCount30D = filtered.postCount30D;
        if (filtered.commentCount30D != null) dashboard.commentCount30D = filtered.commentCount30D;
        if (filtered.nftPostCount30D != null) dashboard.nftPostCount30D = filtered.nftPostCount30D;
        if (filtered.postsRepostedCount30D != null) dashboard.postsRepostedCount30D = filtered.postsRepostedCount30D;
        if (filtered.uniqueRepostsCount30D != null) dashboard.uniqueRepostsCount30D = filtered.uniqueRepostsCount30D;
        if (filtered.followsCount30D != null) dashboard.followsCount30D = filtered.followsCount30D;
        if (filtered.unfollowsCount30D != null) dashboard.unfollowsCount30D = filtered.unfollowsCount30D;
        if (filtered.likesCount30D != null) dashboard.likesCount30D = filtered.likesCount30D;
        if (filtered.unlikesCount30D != null) dashboard.unlikesCount30D = filtered.unlikesCount30D;
        if (filtered.likesReactionsCount30D != null) dashboard.likesReactionsCount30D = filtered.likesReactionsCount30D;
        if (filtered.diamondsCount30D != null) dashboard.diamondsCount30D = filtered.diamondsCount30D;
        if (filtered.coinTxnCount30D != null) dashboard.coinTxnCount30D = filtered.coinTxnCount30D;
        if (filtered.messageTxnCount30D != null) dashboard.messageTxnCount30D = filtered.messageTxnCount30D;
        if (filtered.daoTxnCount30D != null) dashboard.daoTxnCount30D = filtered.daoTxnCount30D;
        if (filtered.nftTxnCount30D != null) dashboard.nftTxnCount30D = filtered.nftTxnCount30D;
        if (filtered.blockRewardTxnCount30D != null)
          dashboard.blockRewardTxnCount30D = filtered.blockRewardTxnCount30D;
        if (filtered.miscTxnCount30D != null) dashboard.miscTxnCount30D = filtered.miscTxnCount30D;
      }
    }

    if (accountsRes.ok) {
      const accountsJson = (await accountsRes.json()) as {
        data?: { accounts?: { totalCount?: number } };
        errors?: Array<{ message?: string }>;
      };
      if (!accountsJson?.errors?.length) {
        const c = accountsJson?.data?.accounts?.totalCount;
        if (typeof c === 'number' && Number.isFinite(c)) totalUsers = c;
      }
    }
  } catch {
    // ignore
  }

  const result: AnalyticsStats = { totalUsers, dashboard };

  // If we got something useful, cache it for fast subsequent loads.
  if (dashboard || totalUsers !== null) {
    setCachedValue<AnalyticsStats>(ANALYTICS_CACHE_KEY, result);
    return result;
  }

  // If the live call failed or returned nothing, fall back to last cached value.
  const cached = getCachedValue<AnalyticsStats>(ANALYTICS_CACHE_KEY);
  if (cached) return cached;

  return result;
}

/** Format a dashboard string number for display (e.g. "175759265" -> "175,759,265"). */
export function formatStat(value: string | null | undefined): string {
  const n = parseNum(value);
  if (n == null) return '—';
  return n.toLocaleString();
}

/** Optional block height from GraphQL (can supplement network node). */
export function dashboardBlockHeight(dashboard: DashboardStatsNode | null): number | null {
  return parseNum(dashboard?.blockHeightCurrent);
}

/** Fetch 30-day daily stats for the trend chart. Returns chronological (oldest first). Cached. */
export async function fetchDailyTrend(): Promise<DailyTrendPoint[]> {
  try {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DAILY_TREND_QUERY, variables: { first: 30 } }),
    });
    if (!res.ok) return getCachedTrendOrEmpty();

    const json = (await res.json()) as {
      data?: {
        dailyTxnCountStats?: { nodes?: { day: string; transactionCount: string }[] };
        dailyActiveWalletCountStats?: { nodes?: { day: string; count: string }[] };
        dailyNewWalletCountStats?: { nodes?: { day: string; walletCount: string }[] };
      };
      errors?: Array<{ message?: string }>;
    };
    if (json?.errors?.length) return getCachedTrendOrEmpty();

    const byDay = new Map<string, DailyTrendPoint>();
    const add = (day: string, patch: Partial<DailyTrendPoint>) => {
      let p = byDay.get(day);
      if (!p) {
        p = { date: day, activeWallets: 0, transactions: 0, newWallets: 0 };
        byDay.set(day, p);
      }
      Object.assign(p, patch);
    };

    for (const n of json.data?.dailyTxnCountStats?.nodes ?? []) {
      add(n.day, { transactions: Number(n.transactionCount) || 0 });
    }
    for (const n of json.data?.dailyActiveWalletCountStats?.nodes ?? []) {
      add(n.day, { activeWallets: Number(n.count) || 0 });
    }
    for (const n of json.data?.dailyNewWalletCountStats?.nodes ?? []) {
      add(n.day, { newWallets: Number(n.walletCount) || 0 });
    }

    const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, p]) => p);
    if (sorted.length) setCachedValue<DailyTrendPoint[]>(TREND_CACHE_KEY, sorted);
    return sorted;
  } catch {
    return getCachedTrendOrEmpty();
  }
}

function getCachedTrendOrEmpty(): DailyTrendPoint[] {
  const cached = getCachedValue<DailyTrendPoint[]>(TREND_CACHE_KEY);
  return cached?.length ? cached : [];
}
