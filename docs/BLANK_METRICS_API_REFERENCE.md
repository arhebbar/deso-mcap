# Blank Metrics – API Call & Response Reference

Each blank metric on the dashboard can be filled using the DeSo GraphQL API at `https://graphql-prod.deso.com/graphql`. Below is the API call and sample response for each.

---

## 1. Online users

**Status:** No public DeSo API exposes real-time online users. This metric would require a custom indexer or backend that tracks active sessions/connections.

**Recommendation:** Keep as "—" or remove the card unless you add a custom backend.

---

## 2. Last 30 days – Socially active

**API:** `dashboardStats` → `txnCountSocial`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountSocial }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCountSocial": "95312752" }]
    }
  }
}
```

**Note:** This is all-time social txns, not 30-day. DeSo GraphQL does not expose `txnCountSocial30D`. Use `txnCountSocial` as a proxy or leave as all-time.

---

## 3. Last 30 days – Transactions

**API:** `dashboardStats` → `txnCount30D`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCount30D }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCount30D": "1391421" }]
    }
  }
}
```

---

## 4. Last 30 days – New wallets

**API:** `dashboardStats` → `newWalletCount30D`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { newWalletCount30D }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "newWalletCount30D": "1928" }]
    }
  }
}
```

---

## 5. Last 30 days – Active wallets

**API:** `dashboardStats` → `activeWalletCount30D`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { activeWalletCount30D }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "activeWalletCount30D": "3767" }]
    }
  }
}
```

---

## 6. 30 day trend (chart)

**APIs:** Three time-series queries for daily data.

**GraphQL (all in one request):**
```graphql
query {
  dailyTxnCountStats(first: 30, orderBy: [DAY_DESC]) {
    nodes { day transactionCount }
  }
  dailyActiveWalletCountStats(first: 30, orderBy: [DAY_DESC]) {
    nodes { day count }
  }
  dailyNewWalletCountStats(first: 30, orderBy: [DAY_DESC]) {
    nodes { day walletCount }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dailyTxnCountStats": {
      "nodes": [
        { "day": "2026-02-26", "transactionCount": "..." },
        { "day": "2026-02-25", "transactionCount": "..." }
      ]
    },
    "dailyActiveWalletCountStats": {
      "nodes": [
        { "day": "2026-02-26", "count": "137" },
        { "day": "2026-02-25", "count": "399" }
      ]
    },
    "dailyNewWalletCountStats": {
      "nodes": [
        { "day": "2026-02-26", "walletCount": "71" },
        { "day": "2026-02-25", "walletCount": "99" }
      ]
    }
  }
}
```

**Note:** Reverse the arrays (oldest first) for the chart. Use `transactionCount` for transactions, `count` for active wallets, `walletCount` for new wallets.

---

## 7. All time – Transactions

**API:** `dashboardStats` → `txnCountAll`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountAll }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCountAll": "175759265" }]
    }
  }
}
```

---

## 8. All time – Coin txns

**API:** `dashboardStats` → `txnCountCreatorCoin`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountCreatorCoin }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCountCreatorCoin": "8774623" }]
    }
  }
}
```

---

## 9. All time – Interactions

**API:** `dashboardStats` → `txnCountSocial` (or `followCount` for follows)

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountSocial followCount }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [
        { "txnCountSocial": "95312752", "followCount": "..." }
      ]
    }
  }
}
```

---

## 10. All time – NFT txns

**API:** `dashboardStats` → `txnCountNft`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountNft }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCountNft": "3532650" }]
    }
  }
}
```

---

## 11. All time – DEX txns

**API:** `dashboardStats` → `txnCountDex`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { txnCountDex }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "txnCountDex": "8673377" }]
    }
  }
}
```

---

## 12. Content – Posts

**API:** `dashboardStats` → `postCount`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { postCount }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "postCount": "6457343" }]
    }
  }
}
```

---

## 13. Content – Blogs

**API:** `dashboardStats` → `postLongformCount`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { postLongformCount }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "postLongformCount": "9877" }]
    }
  }
}
```

---

## 14. Content – Comments

**API:** `dashboardStats` → `commentCount`

**GraphQL:**
```graphql
query {
  dashboardStats(first: 1) {
    nodes { commentCount }
  }
}
```

**Sample response:**
```json
{
  "data": {
    "dashboardStats": {
      "nodes": [{ "commentCount": "7199685" }]
    }
  }
}
```

---

## 15. Last 30 days – Follows / Unfollows / Likes / Unlikes / Diamonds

These 30-day interaction metrics are derived from the `transactions` connection using filters on `txnType`, `timestamp`, and metadata fields. All of them are queried and cached together.

### 15.1 Follows (30d)

**API:** `transactions` with `txnType = 9`, `IsUnfollow = false`

**GraphQL:**
```graphql
query Follows30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 9 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: {
        containsKey: "IsUnfollow"
        contains: { IsUnfollow: false }
      }
    }
  ) {
    totalCount
  }
}
```

### 15.2 Unfollows (30d)

**API:** `transactions` with `txnType = 9`, `IsUnfollow = true`

**GraphQL:**
```graphql
query Unfollows30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 9 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: {
        containsKey: "IsUnfollow"
        contains: { IsUnfollow: true }
      }
    }
  ) {
    totalCount
  }
}
```

### 15.3 Likes (30d)

**API:** `transactions` with `txnType = 10`, `IsUnlike = false`

**GraphQL:**
```graphql
query Likes30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: {
        contains: { IsUnlike: false }
      }
    }
  ) {
    totalCount
  }
}
```

### 15.4 Unlikes (30d)

**API:** `transactions` with `txnType = 10`, `IsUnlike = true`

**GraphQL:**
```graphql
query Unlikes30D($since: Datetime!, $until: Datetime!) {
  transactions(
    first: 0
    filter: {
      txnType: { equalTo: 10 }
      timestamp: { greaterThanOrEqualTo: $since, lessThanOrEqualTo: $until }
      txIndexMetadata: {
        contains: { IsUnlike: true }
      }
    }
  ) {
    totalCount
  }
}
```

### 15.5 Diamonds (30d)

**API:** `transactions` with `txnType = 2`, `extraData.containsKey = "DiamondLevel"`

**GraphQL:**
```graphql
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
```

**Note:** The dashboard displays a single **Diamonds** KPI for the 30-day period. Diamonds sent and Diamonds received are equal for this purpose, so we do not expose them as separate metrics.

## Single combined query (recommended)

Use one `dashboardStats` call for all scalar metrics:

```graphql
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
    }
  }
}
```

Then use separate queries for the 30-day trend chart:
- `dailyTxnCountStats` (field: `transactionCount`)
- `dailyActiveWalletCountStats` (field: `count`)
- `dailyNewWalletCountStats` (field: `walletCount`)
