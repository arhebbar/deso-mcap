/**
 * Fetches wallet balances from DeSo blockchain API.
 * Uses get-single-profile (username -> public key) and get-users-stateless (balance + DAO holdings).
 * For Openfund: get-users-stateless returns 0 when tokens are held on DEX. We try get-hodlings-for-public-key
 * which returns all tokens held (including DEX-held). Falls back to static when endpoint unavailable.
 */

const DESO_NODE = 'https://node.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const OPENFUND_PUBLIC_KEY = 'BC1YLj3zNA7hRAqBVkvsTeqw7oi4H6ogKiAFL1VXhZy6pYeZcZ6TDRY';

export interface WalletConfig {
  username: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER';
}

export interface WalletData {
  name: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER';
  balances: Record<string, number>;
  usdValue: number;
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

/** Fetch Openfund balance via get-hodlings-for-public-key (returns DEX-held tokens). Returns null if endpoint unavailable. */
async function fetchOpenfundFromHodlings(publicKey: string): Promise<number | null> {
  try {
    const res = await fetch(`${DESO_NODE}/get-hodlings-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ PublicKeyBase58Check: publicKey }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { Hodlings?: Array<{ CreatorPublicKeyBase58Check: string; BalanceNanos?: number; BalanceNanosUint256?: string }> };
    const hodlings = data?.Hodlings ?? data?.hodlings ?? [];
    const openfund = hodlings.find((h) => h.CreatorPublicKeyBase58Check === OPENFUND_PUBLIC_KEY);
    if (!openfund) return null;
    return parseDaoBalance(openfund);
  } catch {
    return null;
  }
}

function parseDaoBalance(entry: { BalanceNanos?: number; BalanceNanosUint256?: string }): number {
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DESO;
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    const nanos = parseInt(hex, 16);
    return nanos / NANOS_PER_DESO;
  }
  return 0;
}

/** Map creator public key to token display name (cache from API) */
const creatorTokenCache = new Map<string, string>();

const KNOWN_TOKEN_NAMES: Record<string, string> = {
  focus: 'Focus',
  openfund: 'Openfund',
  open_fund: 'Openfund',
  dusdc: 'dUSDC',
  dusdc_: 'dUSDC',
  dbtc: 'dBTC',
  deth: 'dETH',
  dsol: 'dSOL',
};

/** Major tokens to include; creator coins (unknown tokens) are excluded from balances */
const MAJOR_TOKENS = new Set(['DESO', 'Openfund', 'Focus', 'dUSDC', 'dBTC', 'dETH', 'dSOL']);

async function getCreatorTokenName(creatorKey: string): Promise<string> {
  const cached = creatorTokenCache.get(creatorKey);
  if (cached) return cached;
  try {
    const res = (await desoPost('/get-single-profile', {
      PublicKeyBase58Check: creatorKey,
    })) as { Profile?: { Username?: string } };
    const username = (res.Profile?.Username ?? '').toLowerCase().replace(/-/g, '_').trim();
    const tokenName =
      KNOWN_TOKEN_NAMES[username] ??
      username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    creatorTokenCache.set(creatorKey, tokenName);
    return tokenName;
  } catch {
    creatorTokenCache.set(creatorKey, creatorKey.slice(0, 8));
    return creatorKey.slice(0, 8);
  }
}

export async function fetchWalletBalances(): Promise<WalletData[]> {
  const results: WalletData[] = [];

  for (const config of WALLET_CONFIG) {
    try {
      const profileRes = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };

      const publicKey = profileRes.Profile?.PublicKeyBase58Check;
      if (!publicKey) {
        results.push({
          name: config.username,
          classification: config.classification,
          balances: {},
          usdValue: 0,
        });
        continue;
      }

      const usersRes = (await desoPost('/get-users-stateless', {
        PublicKeysBase58Check: [publicKey],
        SkipForLeaderboard: false,
      })) as {
        UserList?: Array<{
          BalanceNanos?: number;
          UsersYouHODL?: Array<{
            CreatorPublicKeyBase58Check: string;
            BalanceNanos?: number;
            BalanceNanosUint256?: string;
          }>;
        }>;
      };

      const user = usersRes.UserList?.[0];
      if (!user) {
        results.push({
          name: config.username,
          classification: config.classification,
          balances: {},
          usdValue: 0,
        });
        continue;
      }

      const balances: Record<string, number> = {};

      const desoBalance = (user.BalanceNanos ?? 0) / NANOS_PER_DESO;
      if (desoBalance > 0) balances['DESO'] = desoBalance;

      const hodlList = user.UsersYouHODL ?? [];
      for (const entry of hodlList) {
        const amount = parseDaoBalance(entry);
        if (amount > 0) {
          const tokenName = await getCreatorTokenName(entry.CreatorPublicKeyBase58Check);
          if (MAJOR_TOKENS.has(tokenName)) {
            balances[tokenName] = (balances[tokenName] ?? 0) + amount;
          }
        }
      }

      // Openfund held on DEX doesn't appear in UsersYouHODL. Try get-hodlings-for-public-key.
      if ((balances['Openfund'] ?? 0) === 0) {
        const openfundBal = await fetchOpenfundFromHodlings(publicKey);
        if (openfundBal != null && openfundBal > 0) {
          balances['Openfund'] = openfundBal;
        }
      }

      results.push({
        name: config.username,
        classification: config.classification,
        balances,
        usdValue: 0,
      });
    } catch (err) {
      console.warn(`Failed to fetch wallet ${config.username}:`, err);
      results.push({
        name: config.username,
        classification: config.classification,
        balances: {},
        usdValue: 0,
      });
    }
  }

  return results;
}

export { WALLET_CONFIG };
