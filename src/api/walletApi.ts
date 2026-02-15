/**
 * Fetches wallet balances from DeSo blockchain API.
 * Uses get-hodlers-for-public-key with token Username (openfund, focus, dusdc, etc.) to fetch holders
 * of each token, then filters for our tracked users (Foundation, Team, DeSo Bulls).
 * LastPublicKeyBase58Check in requests is a pagination cursor (last hodler from previous page), not a tracked account.
 * Uses blockproducer.deso.org for get-hodlers (same as Openfund: https://openfund.com/d/openfund)
 */

/** Use Vite proxy in dev, Vercel rewrites in prod to avoid CORS */
const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';
const HODLERS_API = import.meta.env.DEV ? '/deso-hodlers' : '/api/deso-hodlers';
const NANOS_PER_DESO = 1e9;
/** DAO coins (Openfund, Focus, dUSDC, etc.) use 1e18 decimals like ERC-20 */
const NANOS_PER_DAO_COIN = 1e18;

export interface WalletConfig {
  username: string;
  displayName?: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL';
}

export interface WalletData {
  name: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL';
  balances: Record<string, number>;
  usdValue: number;
  desoStaked?: number;
  desoUnstaked?: number;
}

const WALLET_CONFIG: WalletConfig[] = [
  // Foundation
  { username: 'Gringotts_Wizarding_Bank', classification: 'FOUNDATION' },
  { username: 'FOCUS_COLD_000', classification: 'FOUNDATION' },
  { username: 'focus', classification: 'FOUNDATION' },
  { username: 'openfund', classification: 'FOUNDATION' },
  { username: 'Deso', classification: 'FOUNDATION' },
  // AMM
  { username: 'AMM_DESO_24_PlAEU', classification: 'AMM' },
  { username: 'AMM_DESO_23_GrYpe', classification: 'AMM' },
  { username: 'AMM_focus_12_nzWku', classification: 'AMM' },
  { username: 'AMM_openfund_12_gOR1b', classification: 'AMM' },
  { username: 'AMM_DESO_19_W5vn0', classification: 'AMM' },
  { username: 'AMM_openfund_13_1gbih', classification: 'AMM' },
  // Founding Team
  { username: 'Whoami', classification: 'FOUNDER' },
  { username: 'Nader', classification: 'FOUNDER' },
  { username: 'Mossified', classification: 'FOUNDER' },
  { username: 'LazyNina', classification: 'FOUNDER' },
  // DeSo Bulls (same fetch method as Foundation/Founder)
  { username: 'Randhir', displayName: 'Randhir (Me)', classification: 'DESO_BULL' },
  { username: 'HighKey', classification: 'DESO_BULL' },
  { username: 'JordanLintz', classification: 'DESO_BULL' },
  { username: 'LukeLintz', classification: 'DESO_BULL' },
  { username: 'StarGeezer', classification: 'DESO_BULL' },
  { username: 'DesocialWorld', classification: 'DESO_BULL' },
  { username: 'Edokoevoet', classification: 'DESO_BULL' },
  { username: 'Gabrielist', classification: 'DESO_BULL' },
  { username: 'RobertGraham', classification: 'DESO_BULL' },
  { username: '0xAustin', classification: 'DESO_BULL' },
  { username: 'BenErsing', classification: 'DESO_BULL' },
  { username: 'Darian_Parrish', classification: 'DESO_BULL' },
  { username: 'VishalGulia', classification: 'DESO_BULL' },
  { username: 'ZeroToOne', classification: 'DESO_BULL' },
  { username: 'whoisanku', classification: 'DESO_BULL' },
  { username: 'fllwthrvr', classification: 'DESO_BULL' },
  { username: 'PremierNS', classification: 'DESO_BULL' },
  { username: 'WhaleDShark', classification: 'DESO_BULL' },
];

async function desoPost(endpoint: string, body: object): Promise<unknown> {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeSo API ${endpoint}: ${res.status}`);
  return res.json();
}

/**
 * Fetch staked DESO per user via get-stake-entries-for-public-key.
 * One call per tracked user; fallback to LockedBalanceNanos from get-users-stateless when API unavailable.
 */
async function fetchStakedByPublicKey(
  publicKeys: string[]
): Promise<Map<string, number>> {
  const stakedByPk = new Map<string, number>();
  const BATCH_SIZE = 5;
  for (let i = 0; i < publicKeys.length; i += BATCH_SIZE) {
    const batch = publicKeys.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (pk) => {
        try {
          const res = await fetch(`${DESO_NODE}/get-stake-entries-for-public-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ PublicKeyBase58Check: pk }),
          });
          if (!res.ok) return { pk, staked: 0 };
          const data = (await res.json()) as {
            StakeEntries?: Array<{ StakeNanos?: number }>;
          };
          const staked = (data?.StakeEntries ?? []).reduce(
            (sum, e) => sum + (e.StakeNanos ?? 0),
            0
          );
          return { pk, staked: staked / NANOS_PER_DESO };
        } catch {
          return { pk, staked: 0 };
        }
      })
    );
    for (const { pk, staked } of results) {
      if (staked > 0) stakedByPk.set(pk, staked);
    }
  }
  return stakedByPk;
}

/** Token creator usernames for get-hodlers-for-public-key (fetches all holders of that token) */
const TOKEN_USERNAMES: { username: string; tokenName: string }[] = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

/** Stop pagination when smallest balance in page is below this USD value (hodlers are sorted by balance desc) */
const MIN_HOLDING_USD = 10;
const HODLERS_PAGE_SIZE = 200;

/** Approximate token prices for early-stop threshold (from desoData) */
const TOKEN_PRICE_USD: Record<string, number> = {
  Openfund: 0.087,
  Focus: 0.00034,
  dUSDC: 1,
  dBTC: 97_400,
  dETH: 2_640,
  dSOL: 196,
};

/**
 * Fetch holders of a token via get-hodlers-for-public-key with Username (token creator).
 * Sorts each page by balance descending before processing (avoids stopping too early if API order varies).
 * Stops when smallest balance in page is below MIN_HOLDING_USD.
 * Uses LastPublicKeyBase58Check only as pagination cursor (not querying that account).
 */
async function fetchTokenHolders(
  tokenUsername: string,
  tokenName: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const priceUsd = TOKEN_PRICE_USD[tokenName] ?? 0;
  try {
    let lastKey = '';
    for (;;) {
      const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Username: tokenUsername,
          LastPublicKeyBase58Check: lastKey,
          NumToFetch: HODLERS_PAGE_SIZE,
          FetchAll: false,
          IsDAOCoin: true,
        }),
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        Hodlers?: Array<{
          HODLerPublicKeyBase58Check?: string;
          BalanceNanos?: number;
          BalanceNanosUint256?: string;
        }>;
        LastPublicKeyBase58Check?: string;
      };
      const hodlers = data?.Hodlers ?? [];
      // Sort by balance descending so we process largest first; min is last (avoids stopping too early if API order varies)
      const withBalance = hodlers
        .filter((h) => h.HODLerPublicKeyBase58Check)
        .map((h) => ({ h, amt: parseDaoBalance(h) }))
        .filter((x) => x.amt > 0)
        .sort((a, b) => b.amt - a.amt);
      for (const { h, amt } of withBalance) {
        const pk = h.HODLerPublicKeyBase58Check!;
        out.set(pk, (out.get(pk) ?? 0) + amt);
      }
      const minBalanceInPage = withBalance.length > 0 ? withBalance[withBalance.length - 1].amt : Infinity;
      lastKey = data?.LastPublicKeyBase58Check ?? '';
      const minUsd = priceUsd > 0 && minBalanceInPage !== Infinity ? minBalanceInPage * priceUsd : Infinity;
      if (hodlers.length < HODLERS_PAGE_SIZE || !lastKey || minUsd < MIN_HOLDING_USD) break;
    }
  } catch {
    // ignore
  }
  return out;
}

function parseDaoBalance(entry: { BalanceNanos?: number; BalanceNanosUint256?: string }): number {
  const divisor = NANOS_PER_DAO_COIN; // 1e18 for all DAO coins (Openfund, Focus, dUSDC, etc.)
  // Prefer BalanceNanosUint256 - preserves full precision (440788 vs 3.47); BalanceNanos (number) loses precision
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    const nanos = BigInt('0x' + hex);
    return Number(nanos) / divisor;
  }
  if (entry.BalanceNanos != null) return entry.BalanceNanos / divisor;
  return 0;
}

/** Run up to N promises at a time */
async function runBatched<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R | undefined>
): Promise<Map<T, R>> {
  const results = new Map<T, R>();
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled' && r.value !== undefined) {
        results.set(batch[j], r.value);
      }
    }
  }
  return results;
}

export async function fetchWalletBalances(): Promise<WalletData[]> {
  // 1. Build tracked users: publicKey -> { displayName, classification } (5 at a time to avoid rate limits)
  const trackedByPk = new Map<string, { displayName: string; classification: WalletConfig['classification'] }>();
  const profileResults = await runBatched(WALLET_CONFIG, 5, async (config) => {
    try {
      const profileRes = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };
      const pk = profileRes.Profile?.PublicKeyBase58Check;
      if (pk) return { pk, config };
      return undefined;
    } catch {
      return undefined;
    }
  });
  for (const { pk, config } of profileResults.values()) {
    if (pk && config) {
      trackedByPk.set(pk, {
        displayName: config.displayName ?? config.username,
        classification: config.classification,
      });
    }
  }

  const publicKeys = Array.from(trackedByPk.keys());

  // 2. Fetch all holders for each token (Openfund, Focus, dUSDC, etc.) - one shot per token
  const tokenHoldingsByPk = new Map<string, Map<string, number>>();
  for (const { username, tokenName } of TOKEN_USERNAMES) {
    const holders = await fetchTokenHolders(username, tokenName);
    for (const [hodlerPk, amt] of holders) {
      if (trackedByPk.has(hodlerPk) && amt > 0) {
        let m = tokenHoldingsByPk.get(hodlerPk);
        if (!m) {
          m = new Map();
          tokenHoldingsByPk.set(hodlerPk, m);
        }
        m.set(tokenName, (m.get(tokenName) ?? 0) + amt);
      }
    }
  }

  // 3. Fetch DESO (unstaked + staked) for all tracked users
  type UserBalance = {
    PublicKeyBase58Check?: string;
    BalanceNanos?: number;
    DESOBalanceNanos?: number;
    /** Some node builds include locked/staked balance; Staked ≈ Total - Spendable */
    LockedBalanceNanos?: number;
  };
  let usersList: UserBalance[] = [];
  if (publicKeys.length > 0) {
    try {
      const usersRes = (await desoPost('/get-users-stateless', {
        PublicKeysBase58Check: publicKeys,
        SkipForLeaderboard: false,
        IncludeBalance: true,
      })) as { UserList?: UserBalance[] };
      usersList = usersRes.UserList ?? [];
    } catch {
      // ignore
    }
  }

  const stakedByPk = await fetchStakedByPublicKey(publicKeys);
  const stakeByPk = new Map<string, { unstaked: number; staked: number }>();
  for (const pk of publicKeys) {
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    // DESOBalanceNanos = spendable (liquid) balance; Spendable_DESO = DESOBalanceNanos / 1e9
    const spendable = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;
    let staked = stakedByPk.get(pk) ?? 0;
    // Option 2 fallback: if validator API returned nothing, try LockedBalanceNanos from get-users-stateless (when node exposes it)
    if (staked === 0 && user?.LockedBalanceNanos != null) {
      staked = user.LockedBalanceNanos / NANOS_PER_DESO;
    }
    stakeByPk.set(pk, { unstaked: spendable, staked });
  }

  // 4. Build results
  const results: WalletData[] = [];
  for (const pk of publicKeys) {
    const meta = trackedByPk.get(pk)!;
    const balances: Record<string, number> = {};

    const tokenMap = tokenHoldingsByPk.get(pk);
    if (tokenMap) {
      for (const [token, amt] of tokenMap) {
        if (amt > 0) balances[token] = amt;
      }
    }

    const stakeData = stakeByPk.get(pk);
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    let desoBalance: number;
    if (stakeData) {
      desoBalance = stakeData.unstaked + stakeData.staked;
    } else {
      desoBalance = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;
    }
    if (desoBalance > 0) balances['DESO'] = desoBalance;

    // Exclude Focus account's Focus balance (minted, not bought on DeSo – no real significance)
    if (meta.displayName === 'focus' && balances.Focus) {
      delete balances.Focus;
    }

    results.push({
      name: meta.displayName,
      classification: meta.classification,
      balances,
      usdValue: 0,
      desoStaked: stakeData?.staked,
      desoUnstaked: stakeData?.unstaked,
    });
  }

  return results;
}

export { WALLET_CONFIG };
