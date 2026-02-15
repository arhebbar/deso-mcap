/**
 * Fetches user profile data with full API response capture for debugging.
 * Used by /u/:username page.
 */

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';
const HODLERS_API = import.meta.env.DEV ? '/deso-hodlers' : '/api/deso-hodlers';
const DESO_GRAPHQL = import.meta.env.DEV ? 'https://graphql-prod.deso.com/graphql' : '/api/deso-graphql';
const NANOS_PER_DESO = 1e9;

const STAKED_DESO_QUERY = `
  query GetStakedDESO($pk: String!) {
    stakeEntries(filter: { staker: { publicKey: { equalTo: $pk } } }) {
      nodes { stakeAmountNanos }
    }
  }
`;
const NANOS_PER_DAO_COIN = 1e18;

const TOKEN_USERNAMES = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

export interface ApiCallRecord {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBody?: unknown;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
}

function parseDaoBalance(entry: { BalanceNanos?: number; BalanceNanosUint256?: string }): number {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return Number(BigInt('0x' + hex)) / NANOS_PER_DAO_COIN;
  }
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DAO_COIN;
  return 0;
}

async function fetchWithCapture(
  base: string,
  endpoint: string,
  body: object,
  records: ApiCallRecord[],
  name: string
): Promise<unknown> {
  const url = `${base}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let responseBody: unknown;
  const text = await res.text();
  try {
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = text;
  }
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    responseHeaders[k] = v;
  });
  records.push({
    name,
    url,
    method: 'POST',
    headers,
    requestBody: body,
    status: res.status,
    statusText: res.statusText,
    responseHeaders,
    responseBody,
  });
  return responseBody;
}

export interface UserProfileData {
  username: string;
  displayName: string;
  publicKey: string;
  balances: Record<string, number>;
  desoStaked: number;
  desoUnstaked: number;
  usdValue: number;
  apiCalls: ApiCallRecord[];
}

export async function fetchUserProfile(username: string): Promise<UserProfileData | null> {
  const apiCalls: ApiCallRecord[] = [];

  const profileData = (await fetchWithCapture(
    DESO_NODE,
    '/get-single-profile',
    { Username: username },
    apiCalls,
    'get-single-profile'
  )) as { Profile?: { PublicKeyBase58Check?: string; Username?: string } };
  const pk = profileData?.Profile?.PublicKeyBase58Check;
  if (!pk) return null;

  const displayName = profileData?.Profile?.Username ?? username;

  await fetchWithCapture(
    DESO_NODE,
    '/get-users-stateless',
    {
      PublicKeysBase58Check: [pk],
      SkipForLeaderboard: false,
      IncludeBalance: true,
    },
    apiCalls,
    'get-users-stateless'
  );

  const stakeGraphqlBody = { query: STAKED_DESO_QUERY, variables: { pk } };
  const stakeGraphqlRes = await fetch(DESO_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stakeGraphqlBody),
  });
  let stakeGraphqlBodyParsed: unknown;
  const stakeText = await stakeGraphqlRes.text();
  try {
    stakeGraphqlBodyParsed = stakeText ? JSON.parse(stakeText) : null;
  } catch {
    stakeGraphqlBodyParsed = stakeText;
  }
  const responseHeaders: Record<string, string> = {};
  stakeGraphqlRes.headers.forEach((v, k) => { responseHeaders[k] = v; });
  apiCalls.push({
    name: 'graphql-stake-entries',
    url: DESO_GRAPHQL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    requestBody: stakeGraphqlBody,
    status: stakeGraphqlRes.status,
    statusText: stakeGraphqlRes.statusText,
    responseHeaders,
    responseBody: stakeGraphqlBodyParsed,
  });
  const stakeResOk = stakeGraphqlRes.ok;

  for (const { username: tokenUsername, tokenName } of TOKEN_USERNAMES) {
    await fetchWithCapture(
      HODLERS_API,
      '/get-hodlers-for-public-key',
      {
        Username: tokenUsername,
        LastPublicKeyBase58Check: '',
        NumToFetch: 200,
        FetchAll: false,
        IsDAOCoin: true,
      },
      apiCalls,
      `get-hodlers-for-public-key (${tokenName})`
    );
  }

  const usersRes = apiCalls.find((c) => c.name === 'get-users-stateless');
  const usersBody = usersRes?.responseBody as { UserList?: Array<{ BalanceNanos?: number; DESOBalanceNanos?: number; LockedBalanceNanos?: number }> };
  const user = usersBody?.UserList?.[0];
  const balanceNanos = user?.BalanceNanos ?? 0;
  const desoBalanceNanos = user?.DESOBalanceNanos ?? balanceNanos;
  const lockedNanos = user?.LockedBalanceNanos;
  let desoUnstaked = desoBalanceNanos / NANOS_PER_DESO;
  let desoStaked = 0;
  if (stakeResOk) {
    const stakeCall = apiCalls.find((c) => c.name === 'graphql-stake-entries');
    const stakeData = stakeCall?.responseBody as { data?: { stakeEntries?: { nodes?: Array<{ stakeAmountNanos?: string }> } } };
    const nodes = stakeData?.data?.stakeEntries?.nodes ?? [];
    desoStaked = nodes.reduce((s, n) => s + (n.stakeAmountNanos ? Number(n.stakeAmountNanos) : 0), 0) / NANOS_PER_DESO;
  } else if (lockedNanos != null) {
    desoStaked = lockedNanos / NANOS_PER_DESO;
  } else if (balanceNanos > 0 && desoBalanceNanos < balanceNanos) {
    desoStaked = (balanceNanos - desoBalanceNanos) / NANOS_PER_DESO;
  }

  const balances: Record<string, number> = {};
  const desoTotal = desoUnstaked + desoStaked;
  if (desoTotal > 0) balances['DESO'] = desoTotal;

  for (let i = 0; i < TOKEN_USERNAMES.length; i++) {
    const call = apiCalls.find((c) => c.name === `get-hodlers-for-public-key (${TOKEN_USERNAMES[i].tokenName})`);
    const body = call?.responseBody as { Hodlers?: Array<{ HODLerPublicKeyBase58Check?: string; BalanceNanos?: number; BalanceNanosUint256?: string }> };
    const hodlers = body?.Hodlers ?? [];
    for (const h of hodlers) {
      if (h.HODLerPublicKeyBase58Check === pk) {
        const amt = parseDaoBalance(h);
        if (amt > 0) {
          balances[TOKEN_USERNAMES[i].tokenName] = (balances[TOKEN_USERNAMES[i].tokenName] ?? 0) + amt;
        }
        break;
      }
    }
  }

  const TOKEN_PRICES: Record<string, number> = {
    DESO: 5.78,
    Openfund: 0.087,
    Focus: 0.00034,
    dUSDC: 1,
    dBTC: 97_400,
    dETH: 2_640,
    dSOL: 196,
  };
  const usdValue = Object.entries(balances).reduce((s, [token, amt]) => s + amt * (TOKEN_PRICES[token] ?? 0), 0);

  return {
    username,
    displayName,
    publicKey: pk,
    balances,
    desoStaked,
    desoUnstaked,
    usdValue,
    apiCalls,
  };
}
