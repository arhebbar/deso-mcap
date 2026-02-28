# Dashboard metrics – API coverage and limitations

## Implemented (working)

### From `dashboardStats` (single GraphQL query)
- **30d:** `txnCount30D`, `activeWalletCount30D`, `newWalletCount30D`
- **All-time:** `txnCountAll`, `postCount`, `postLongformCount`, `commentCount`, `repostCount`, `txnCountCreatorCoin`, `txnCountNft`, `txnCountDex`, `txnCountSocial`, `followCount`, `messageCount`, `totalSupply`, `walletCountAll`, `blockHeightCurrent`

### From `accounts(first: 1) { totalCount }`
- **Users (all-time):** used when `walletCountAll` is not preferred

### From daily stats (30-day trend chart)
- **dailyTxnCountStats** (field: `transactionCount`) – transactions per day
- **dailyActiveWalletCountStats** (field: `count`) – active wallets per day
- **dailyNewWalletCountStats** (field: `walletCount`) – new wallets per day  

Chart data is cached; chronological order (oldest first) is built from `DAY_DESC` responses.

### Last 30 days Posts (optional)
- **posts(first: 0, filter: { timestamp: { greaterThan: "<iso 30 days ago>" } }) { totalCount }**
- Implemented in `fetchAnalyticsStats`; if the query succeeds, `dashboard.postCount30D` is set and the 30d tab shows it for **Posts**.
- **Note:** This query may be slow or time out on the public API (large filtered count). If it never returns, the 30d Posts card shows "—" and only all-time Posts are shown.

### Last 30 days – filtered social/content metrics (via `transactions` & `posts`)

These are implemented using explicit filters on `posts` and `transactions` and cached together for 24 hours in `fetchFilteredCounts30D`:

- **Comments (30d):**
  - Source: `posts(first: 0, filter: { timestamp: { between last 30d }, parentPostHash: { isNull: false } }) { totalCount }`
  - Dashboard field: `dashboard.commentCount30D`
- **NFT posts (30d):**
  - Source: `posts(first: 0, filter: { timestamp: { between last 30d }, isNft: { equalTo: true } }) { totalCount }`
  - Dashboard field: `dashboard.nftPostCount30D`
- **Posts that got reposted (30d):**
  - Source: `posts(first: 0, filter: { timestamp: { between last 30d }, repostsExist: true }) { totalCount }`
  - Dashboard field: `dashboard.postsRepostedCount30D`
- **Unique reposts (30d):**
  - Source: `posts(first: 0, filter: { timestamp: { between last 30d }, repostedPostHash: { isNull: false } }) { totalCount }`
  - Dashboard field: `dashboard.uniqueRepostsCount30D`
- **Follows (30d):**
  - Source: `transactions(first: 0, filter: { txnType: { equalTo: 9 }, timestamp: { between last 30d }, txIndexMetadata: { containsKey: "IsUnfollow", contains: { IsUnfollow: false } } }) { totalCount }`
  - Dashboard field: `dashboard.followsCount30D`
- **Unfollows (30d):**
  - Source: `transactions(first: 0, filter: { txnType: { equalTo: 9 }, timestamp: { between last 30d }, txIndexMetadata: { containsKey: "IsUnfollow", contains: { IsUnfollow: true } } }) { totalCount }`
  - Dashboard field: `dashboard.unfollowsCount30D`
- **Likes (30d):**
  - Source: `transactions(first: 0, filter: { txnType: { equalTo: 10 }, timestamp: { between last 30d }, txIndexMetadata: { contains: { IsUnlike: false } } }) { totalCount }`
  - Dashboard field: `dashboard.likesCount30D`
- **Unlikes (30d):**
  - Source: `transactions(first: 0, filter: { txnType: { equalTo: 10 }, timestamp: { between last 30d }, txIndexMetadata: { contains: { IsUnlike: true } } }) { totalCount }`
  - Dashboard field: `dashboard.unlikesCount30D`
- **Diamonds (30d):**
  - Source: `transactions(first: 0, filter: { txnType: { equalTo: 2 }, timestamp: { between last 30d }, extraData: { containsKey: "DiamondLevel" } }) { totalCount }`
  - Dashboard field: `dashboard.diamondsCount30D`

The dashboard shows a single **Diamonds** KPI for 30d; **Diamonds sent** and **Diamonds received** are not split because the underlying count is symmetric.

---

## Not available from DeSo GraphQL (show "—" for 30d or all-time)

| Metric | Reason |
|--------|--------|
| **Likes (all-time aggregate)** | No `likesCount` scalar in `dashboardStats`; only 30d counts are derived via filtered `transactions`. |
| **Diamonds sent / Diamonds recd.** | No separate “sent” vs “received” aggregates; we expose a single 30d **Diamonds** count from filtered `transactions`. |
| **DAO transactions** | No `daoTxnCount` or equivalent in schema. |
| **Socially active users (30d)** | Only `activeWalletCount30D` exists; no separate “socially active” 30d metric. |
| **Social transactions (30d)** | Only all-time `txnCountSocial`. |
| **Money transactions (30d)** | No 30d breakdown for creator coin/DEX/NFT; only all-time. |
| **Comments (30d)** | Only all-time `commentCount`; no daily comment stats or filtered count. |
| **Blogs (30d)** | Only all-time `postLongformCount`. |
| **Reposts (30d)** | Only all-time `repostCount`. |
| **Follows (30d)** | Only all-time `followCount`. |
| **Coin/DEX/NFT transactions (30d)** | Only all-time counts. |

---

## Reference: DeSo GraphQL Explorer

- Explorer: [DeSo GraphQL Explorer](https://graphql-prod.deso.com/?explorerURLState=N4IgJg9gxgrgtgUwHYBcQC4QEcYIE4CeABAAoQDOK5AFACQBmAlgDYr7qkUoBiLbeASiLAAOnhFIiRAA5caTVuyIM%2B%2BIaPGSpRFBBQBDZgGEIMVGIlSAvhaRWQAGhAA3fXkb6ARswTkMIDUtbKREQBX5QjkCtEJAURkRKfThpSOFg7VifcnIAFQALfSQAeTwAURxDXIg00IAGACYAegaAdhbGgDZQhwzM0IBzPAR9fgKi0oqYKpqMInqARhaADg6G7pA%2BohtNa1t7J1lKemZGAfyUYul8UcYIJABlKHdpNEwQKyA)
- Last 30 days Posts logic: same idea as in this codebase – filter `posts` by `timestamp.greaterThan` (ISO date 30 days ago) and use `totalCount` when the API supports it.
