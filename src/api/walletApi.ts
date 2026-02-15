/**
 * Fetches wallet balances from DeSo blockchain API.
 * Uses get-hodlers-for-public-key with token Username (openfund, focus, dusdc, etc.) to fetch holders
 * of each token, then filters for our tracked users (Foundation, Team, DeSo Bulls).
 * LastPublicKeyBase58Check in requests is a pagination cursor (last hodler from previous page), not a tracked account.
 * Uses blockproducer.deso.org for get-hodlers (same as Openfund: https://openfund.com/d/openfund)
 */

import { CORE_VALIDATOR_USERNAMES, COMMUNITY_VALIDATOR_USERNAMES } from '@/data/desoData';

/** Use Vite proxy in dev, Vercel rewrites in prod to avoid CORS */
const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';
const HODLERS_API = import.meta.env.DEV ? '/deso-hodlers' : '/api/deso-hodlers';
const DESO_GRAPHQL = import.meta.env.DEV ? '/deso-graphql' : '/api/deso-graphql';
const NANOS_PER_DESO = 1e9;
/** DAO coins (Openfund, Focus, dUSDC, etc.) use 1e18 decimals like ERC-20 */
const NANOS_PER_DAO_COIN = 1e18;

export interface WalletConfig {
  username: string;
  displayName?: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL';
  /** When set, multiple configs with same mergeKey are combined into one entry */
  mergeKey?: string;
  /** When set, use this public key directly instead of looking up by username (for accounts with no username) */
  publicKeyBase58Check?: string;
}

export interface StakedByValidator {
  validatorPk: string;
  validatorName?: string;
  amount: number;
}

export interface WalletData {
  name: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL';
  balances: Record<string, number>;
  usdValue: number;
  desoStaked?: number;
  desoUnstaked?: number;
  /** Per-validator stake breakdown (for StakedDesoTable grouping) */
  stakedByValidator?: StakedByValidator[];
  /** Net value of CCv1 (Creator Coin v1) holdings in DESO, from GraphQL creatorCoinBalances */
  ccv1ValueDeso?: number;
}

const WALLET_CONFIG: WalletConfig[] = [
  // Foundation
  { username: 'Gringotts_Wizarding_Bank', classification: 'FOUNDATION' },
  { username: 'FOCUS_COLD_000', classification: 'FOUNDATION' },
  { username: 'focus', classification: 'FOUNDATION' },
  { username: 'openfund', classification: 'FOUNDATION' },
  { username: 'Deso', classification: 'FOUNDATION' },
  { username: 'deso10Mdaubet', classification: 'FOUNDATION' },
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
  { username: 'Randhir', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'RandhirStakingWallet', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'Twinstars', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'desoscams', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'Bhagyasri', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'HighKey', displayName: 'HighKey / JordanLintz / LukeLintz', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'JordanLintz', displayName: 'HighKey / JordanLintz / LukeLintz', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'LukeLintz', displayName: 'HighKey / JordanLintz / LukeLintz', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'StarGeezer', displayName: 'StarGeezer (incl. SG_Vault)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'SG_Vault', displayName: 'StarGeezer (incl. SG_Vault)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'DesocialWorld', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'DesocialWorldValidator', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'Edokoevoet', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'Gabrielist', classification: 'DESO_BULL' },
  { username: 'RobertGraham', classification: 'DESO_BULL' },
  { username: '0xAustin', displayName: '0xAustin', classification: 'DESO_BULL', mergeKey: '0xAustin' },
  { username: '0xVault', displayName: '0xAustin', classification: 'DESO_BULL', mergeKey: '0xAustin' },
  { username: 'BenErsing', classification: 'DESO_BULL' },
  { username: 'Darian_Parrish', classification: 'DESO_BULL' },
  { username: 'VishalGulia', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: 'VishalWallet', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: 'NIX0057', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: '', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia', publicKeyBase58Check: 'BC1YLgJHczW24n5kQYJYiw6MoFbg2CmDRf4bWxWRE7znVaRfT27V5kE' },
  { username: 'ZeroToOne', classification: 'DESO_BULL' },
  { username: 'anku', classification: 'DESO_BULL' },
  { username: 'fllwthrvr', classification: 'DESO_BULL' },
  { username: 'PremierNS', classification: 'DESO_BULL' },
  { username: 'WhaleDShark', displayName: 'WhaleDShark (incl. WhaleDVault)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: 'WhaleDVault', displayName: 'WhaleDShark (incl. WhaleDVault)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: 'Crowd33', displayName: 'Crowd33 / CrowdWallet', classification: 'DESO_BULL', mergeKey: 'Crowd33' },
  { username: 'CrowdWallet', displayName: 'Crowd33 / CrowdWallet', classification: 'DESO_BULL', mergeKey: 'Crowd33' },
  // Long-term community members
  { username: 'Krassenstein', classification: 'DESO_BULL' },
  { username: 'Kra_Wallet', classification: 'DESO_BULL', mergeKey: 'Krassenstein' },
  { username: 'HKrassenstein', classification: 'DESO_BULL', mergeKey: 'Krassenstein' },
  { username: 'Chadix', classification: 'DESO_BULL' },
  { username: 'Dirham', classification: 'DESO_BULL' },
  { username: 'EileenCoyle', displayName: 'EileenCoyle', classification: 'DESO_BULL', mergeKey: 'EileenCoyle' },
  { username: 'EileenVault', displayName: 'EileenCoyle', classification: 'DESO_BULL', mergeKey: 'EileenCoyle' },
  { username: 'LuisEddie', classification: 'DESO_BULL' },
  { username: 'Homey', classification: 'DESO_BULL' },
  { username: 'tobiasschmid', classification: 'DESO_BULL' },
  { username: 'CreativeG', classification: 'DESO_BULL' },
  { username: 'BKPower8', classification: 'DESO_BULL' },
  { username: 'rajmal', classification: 'DESO_BULL' },
  { username: 'DrMoz', classification: 'DESO_BULL' },
  { username: 'Gatucu', classification: 'DESO_BULL' },
  { username: 'mcMarsh', displayName: 'mcMarsh', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'mcMarshstaking', displayName: 'mcMarsh', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'ImJigarShah', displayName: 'ImJigarShah', classification: 'DESO_BULL', mergeKey: 'ImJigarShah' },
  { username: 'thesarcasm', displayName: 'ImJigarShah', classification: 'DESO_BULL', mergeKey: 'ImJigarShah' },
  { username: 'MrTriplet', classification: 'DESO_BULL' },
  { username: 'FedeDM', displayName: 'FedeDM', classification: 'DESO_BULL', mergeKey: 'FedeDM' },
  { username: 'FedeDM_Guardian', displayName: 'FedeDM', classification: 'DESO_BULL', mergeKey: 'FedeDM' },
  { username: 'SeWiJuga', classification: 'DESO_BULL' },
  { username: 'PeeBoy17', classification: 'DESO_BULL' },
  { username: 'Pixelangelo', classification: 'DESO_BULL' },
  { username: 'NFTLegacy', classification: 'DESO_BULL' },
  { username: 'ElizabethTubbs', classification: 'DESO_BULL' },
  { username: 'ThisDayInMusicHistory', displayName: 'ThisDayInMusicHistory', classification: 'DESO_BULL', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'MusicHeals', displayName: 'ThisDayInMusicHistory', classification: 'DESO_BULL', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'DonBarnhart', classification: 'DESO_BULL' },
  { username: 'TangledBrush918', classification: 'DESO_BULL' },
  { username: 'Moggel', classification: 'DESO_BULL' },
  { username: 'ReihanRei', classification: 'DESO_BULL' },
  { username: 'przemyslawdygdon', classification: 'DESO_BULL' },
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

const STAKE_ENTRIES_QUERY = `
  query GetStakeEntries($pks: [String!]!, $after: Cursor) {
    stakeEntries(first: 100, filter: { staker: { publicKey: { in: $pks } } }, after: $after) {
      nodes {
        stakerPkid
        stakeAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const LOCKED_STAKE_ENTRIES_QUERY = `
  query GetLockedStakeEntries($pks: [String!]!, $after: Cursor) {
    lockedStakeEntries(first: 100, filter: { staker: { publicKey: { in: $pks } } }, after: $after) {
      nodes {
        stakerPkid
        lockedAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ALL_STAKE_ENTRIES_QUERY = `
  query GetAllStakeEntries($after: Cursor) {
    stakeEntries(first: 100, after: $after) {
      nodes {
        stakerPkid
        stakeAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ALL_LOCKED_STAKE_ENTRIES_QUERY = `
  query GetAllLockedStakeEntries($after: Cursor) {
    lockedStakeEntries(first: 100, after: $after) {
      nodes {
        stakerPkid
        lockedAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const CREATOR_COIN_BALANCES_QUERY = `
  query CreatorCoinBalances($pks: [String!]!, $after: Cursor) {
    creatorCoinBalances(first: 500, filter: { holder: { publicKey: { in: $pks } } }, after: $after) {
      nodes {
        totalValueNanos
        holder { publicKey }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type StakeEntry = { validatorPk: string; amount: number };

/** Fetch CCv1 (Creator Coin v1) net value in DESO per public key via GraphQL. */
async function fetchCcV1ValueByPublicKey(
  publicKeys: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (publicKeys.length === 0) return out;

  let after: string | null = null;
  do {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CREATOR_COIN_BALANCES_QUERY,
        variables: { pks: publicKeys, after },
      }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: {
        creatorCoinBalances?: {
          nodes?: Array<{ totalValueNanos?: string; holder?: { publicKey?: string } }>;
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
        };
      };
      errors?: Array<{ message?: string }>;
    };
    if (data?.errors?.length) break;
    const conn = data?.data?.creatorCoinBalances;
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const pk = n.holder?.publicKey;
      if (pk) {
        const nanos = parseFloat(n.totalValueNanos ?? '0');
        out.set(pk, (out.get(pk) ?? 0) + nanos / NANOS_PER_DESO);
      }
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
  } while (after);

  return out;
}

async function fetchAllStakeNodes(
  query: string,
  variables: { pks: string[]; after?: string | null }
): Promise<Array<{ stakerPk: string; validatorPk: string; amountNanos: number }>> {
  const all: Array<{ stakerPk: string; validatorPk: string; amountNanos: number }> = [];
  let after: string | null = variables.after ?? null;
  const pks = variables.pks;
  if (pks.length === 0) return all;

  const amountKey = query.includes('lockedAmountNanos') ? 'lockedAmountNanos' : 'stakeAmountNanos';
  const connKey = query.includes('lockedStakeEntries') ? 'lockedStakeEntries' : 'stakeEntries';

  do {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { ...variables, after } }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: Record<string, {
        nodes?: Array<{
          stakerPkid?: string;
          stakeAmountNanos?: string;
          lockedAmountNanos?: string;
          validatorEntry?: { account?: { publicKey?: string } };
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      }>;
    };
    const conn = data?.data?.[connKey];
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const stakerPk = n.stakerPkid ?? '';
      const vPk = n.validatorEntry?.account?.publicKey ?? '';
      const nanos = Number((n as Record<string, string>)[amountKey] ?? 0);
      if (stakerPk && vPk && nanos > 0) {
        all.push({ stakerPk, validatorPk: vPk, amountNanos: nanos });
      }
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
  } while (after);

  return all;
}

async function fetchAllStakeNodesUnfiltered(
  query: string,
  variables: { after?: string | null }
): Promise<Array<{ stakerPk: string; validatorPk: string; amountNanos: number }>> {
  const all: Array<{ stakerPk: string; validatorPk: string; amountNanos: number }> = [];
  let after: string | null = variables.after ?? null;
  const amountKey = query.includes('lockedAmountNanos') ? 'lockedAmountNanos' : 'stakeAmountNanos';
  const connKey = query.includes('lockedStakeEntries') ? 'lockedStakeEntries' : 'stakeEntries';

  do {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { after } }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: Record<string, {
        nodes?: Array<{
          stakerPkid?: string;
          stakeAmountNanos?: string;
          lockedAmountNanos?: string;
          validatorEntry?: { account?: { publicKey?: string } };
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      }>;
    };
    const conn = data?.data?.[connKey];
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const stakerPk = n.stakerPkid ?? '';
      const vPk = n.validatorEntry?.account?.publicKey ?? '';
      const nanos = Number((n as Record<string, string>)[amountKey] ?? 0);
      if (stakerPk && vPk && nanos > 0) {
        all.push({ stakerPk, validatorPk: vPk, amountNanos: nanos });
      }
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
  } while (after);

  return all;
}

/**
 * Fetch staked DESO per user per validator via DeSo GraphQL API.
 * Uses stakeEntries (active) + lockedStakeEntries (cooldown) with in filter for entire list.
 */
async function fetchStakedByPublicKey(
  publicKeys: string[]
): Promise<Map<string, StakeEntry[]>> {
  const stakedByPk = new Map<string, Map<string, number>>();

  const [activeNodes, lockedNodes] = await Promise.all([
    fetchAllStakeNodes(STAKE_ENTRIES_QUERY, { pks: publicKeys }),
    fetchAllStakeNodes(LOCKED_STAKE_ENTRIES_QUERY, { pks: publicKeys }),
  ]);

  for (const { stakerPk, validatorPk, amountNanos } of [...activeNodes, ...lockedNodes]) {
    let byValidator = stakedByPk.get(stakerPk);
    if (!byValidator) {
      byValidator = new Map();
      stakedByPk.set(stakerPk, byValidator);
    }
    byValidator.set(validatorPk, (byValidator.get(validatorPk) ?? 0) + amountNanos);
  }

  const result = new Map<string, StakeEntry[]>();
  for (const [pk, byValidator] of stakedByPk) {
    const entries: StakeEntry[] = [];
    for (const [vPk, nanos] of byValidator) {
      entries.push({ validatorPk: vPk, amount: nanos / NANOS_PER_DESO });
    }
    if (entries.length > 0) result.set(pk, entries);
  }
  return result;
}

/** Resolve public keys to usernames via get-users-stateless (ProfileEntryResponse.Username) */
async function fetchUsernamesForPks(pks: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pks.length === 0) return map;
  try {
    const res = (await desoPost('/get-users-stateless', {
      PublicKeysBase58Check: pks,
      SkipForLeaderboard: true,
      IncludeBalance: false,
    })) as { UserList?: Array<{ PublicKeyBase58Check?: string; ProfileEntryResponse?: { Username?: string }; Profile?: { Username?: string } }> };
    for (const u of res.UserList ?? []) {
      const pk = u.PublicKeyBase58Check;
      const username = u.ProfileEntryResponse?.Username ?? u.Profile?.Username;
      if (pk && username) map.set(pk, username);
    }
  } catch {
    // ignore
  }
  return map;
}

export interface AllStakedDesoRow {
  stakerPk: string;
  stakerName: string;
  /** True if staker has a username (tracked or from chain); false if public key only */
  hasUsername: boolean;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'COMMUNITY';
  amount: number;
  validatorPk: string;
  validatorName?: string;
}

export type ValidatorType = 'core' | 'community';

export interface AllStakedDesoBucket {
  validatorKey: string;
  validatorName: string;
  validatorType: ValidatorType;
  foundation: AllStakedDesoRow[];
  community: AllStakedDesoRow[];
  total: number;
}

function getValidatorType(validatorName: string): ValidatorType {
  const core = new Set(CORE_VALIDATOR_USERNAMES.map((u) => u.toLowerCase()));
  const community = new Set(COMMUNITY_VALIDATOR_USERNAMES.map((u) => u.toLowerCase()));
  const name = validatorName.toLowerCase();
  if (core.has(name)) return 'core';
  if (community.has(name)) return 'community';
  return 'community'; // default unknown to community
}

/**
 * Fetch ALL stake entries (no filter) for the Staked DESO table.
 * Untracked stakers are classified as Community.
 */
export async function fetchAllStakedDeso(): Promise<AllStakedDesoBucket[]> {
  const trackedByPk = new Map<string, { displayName: string; classification: WalletConfig['classification']; mergeKey?: string }>();

  // Add public-key-only accounts first
  for (const config of WALLET_CONFIG) {
    if (config.publicKeyBase58Check) {
      trackedByPk.set(config.publicKeyBase58Check, {
        displayName: config.displayName ?? (config.username || 'Unknown'),
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  // Fetch profiles for username-based accounts
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const profileResults = await runBatched(usernameConfigs, 5, async (config) => {
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
        mergeKey: config.mergeKey,
      });
    }
  }

  const [activeNodes, lockedNodes] = await Promise.all([
    fetchAllStakeNodesUnfiltered(ALL_STAKE_ENTRIES_QUERY, {}),
    fetchAllStakeNodesUnfiltered(ALL_LOCKED_STAKE_ENTRIES_QUERY, {}),
  ]);

  const byValidatorStaker = new Map<string, Map<string, number>>();
  for (const { stakerPk, validatorPk, amountNanos } of [...activeNodes, ...lockedNodes]) {
    let byStaker = byValidatorStaker.get(validatorPk);
    if (!byStaker) {
      byStaker = new Map();
      byValidatorStaker.set(validatorPk, byStaker);
    }
    byStaker.set(stakerPk, (byStaker.get(stakerPk) ?? 0) + amountNanos);
  }

  const allValidatorPks = Array.from(byValidatorStaker.keys());
  const allStakerPks = new Set<string>();
  for (const byStaker of byValidatorStaker.values()) {
    for (const pk of byStaker.keys()) allStakerPks.add(pk);
  }
  const untrackedPks = Array.from(allStakerPks).filter((pk) => !trackedByPk.has(pk));

  const [validatorNames, stakerNames] = await Promise.all([
    fetchUsernamesForPks(allValidatorPks),
    fetchUsernamesForPks(untrackedPks),
  ]);

  const buckets: AllStakedDesoBucket[] = [];
  for (const [validatorPk, byStaker] of byValidatorStaker) {
    const validatorName = validatorNames.get(validatorPk) ?? `Validator ${validatorPk.slice(0, 8)}…`;
    const foundation: AllStakedDesoRow[] = [];
    const community: AllStakedDesoRow[] = [];
    let total = 0;

    // Build rows, merging by mergeKey when present
    const byMergeKey = new Map<string, { stakerPk: string; stakerName: string; hasUsername: boolean; classification: AllStakedDesoRow['classification']; amount: number }>();
    for (const [stakerPk, amountNanos] of byStaker) {
      const amount = amountNanos / NANOS_PER_DESO;
      total += amount;
      const tracked = trackedByPk.get(stakerPk);
      const stakerName = tracked?.displayName ?? stakerNames.get(stakerPk) ?? `${stakerPk.slice(0, 8)}…`;
      const hasUsername = !!tracked || stakerNames.has(stakerPk);
      const classification = tracked
        ? tracked.classification
        : ('COMMUNITY' as const);
      const key = tracked?.mergeKey ?? stakerPk;
      const existing = byMergeKey.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        byMergeKey.set(key, { stakerPk, stakerName, hasUsername, classification, amount });
      }
    }
    const rows: AllStakedDesoRow[] = Array.from(byMergeKey.values()).map((r) => ({
      stakerPk: r.stakerPk,
      stakerName: r.stakerName,
      hasUsername: r.hasUsername,
      classification: r.classification,
      amount: r.amount,
      validatorPk,
      validatorName,
    }));
    rows.sort((a, b) => b.amount - a.amount);
    for (const r of rows) {
      if (r.classification === 'FOUNDATION' || r.classification === 'AMM' || r.classification === 'FOUNDER') {
        foundation.push(r);
      } else {
        community.push(r);
      }
    }

    const validatorType = getValidatorType(validatorName);
    buckets.push({
      validatorKey: validatorPk,
      validatorName,
      validatorType,
      foundation,
      community,
      total,
    });
  }

  // Sort: Core first (by total desc), then Community (by total desc)
  buckets.sort((a, b) => {
    if (a.validatorType !== b.validatorType) return a.validatorType === 'core' ? -1 : 1;
    return b.total - a.total;
  });
  return buckets;
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
  // 1. Build tracked users: publicKey -> { displayName, classification, mergeKey? }
  const trackedByPk = new Map<string, { displayName: string; classification: WalletConfig['classification']; mergeKey?: string }>();

  // Add public-key-only accounts first (no username lookup)
  for (const config of WALLET_CONFIG) {
    if (config.publicKeyBase58Check) {
      trackedByPk.set(config.publicKeyBase58Check, {
        displayName: config.displayName ?? (config.username || 'Unknown'),
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  // Fetch profiles for username-based accounts (5 at a time)
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const profileResults = await runBatched(usernameConfigs, 5, async (config) => {
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
        mergeKey: config.mergeKey,
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

  const [stakedByPk, ccv1ByPk] = await Promise.all([
    fetchStakedByPublicKey(publicKeys),
    fetchCcV1ValueByPublicKey(publicKeys),
  ]);
  const allValidatorPks = new Set<string>();
  for (const entries of stakedByPk.values()) {
    for (const e of entries) allValidatorPks.add(e.validatorPk);
  }
  const validatorNames = await fetchUsernamesForPks(Array.from(allValidatorPks));
  const stakeByPk = new Map<string, { unstaked: number; staked: number; stakedByValidator: StakedByValidator[] }>();
  for (const pk of publicKeys) {
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    const balanceNanos = user?.BalanceNanos ?? 0;
    const desoBalanceNanos = user?.DESOBalanceNanos ?? balanceNanos;
    const lockedNanos = user?.LockedBalanceNanos;
    const spendable = desoBalanceNanos / NANOS_PER_DESO;
    const entries = stakedByPk.get(pk) ?? [];
    let staked = entries.reduce((s, e) => s + e.amount, 0);
    if (staked === 0 && lockedNanos != null) {
      staked = lockedNanos / NANOS_PER_DESO;
    } else if (staked === 0 && balanceNanos > 0 && desoBalanceNanos < balanceNanos) {
      staked = (balanceNanos - desoBalanceNanos) / NANOS_PER_DESO;
    }
    const stakedByValidator: StakedByValidator[] = entries.map((e) => ({
      ...e,
      validatorName: validatorNames.get(e.validatorPk),
    }));
    stakeByPk.set(pk, { unstaked: spendable, staked, stakedByValidator });
  }

  // 4. Build results (group by mergeKey when present)
  const groupKeyToPks = new Map<string, string[]>();
  for (const pk of publicKeys) {
    const meta = trackedByPk.get(pk)!;
    const key = meta.mergeKey ?? pk;
    const arr = groupKeyToPks.get(key) ?? [];
    arr.push(pk);
    groupKeyToPks.set(key, arr);
  }

  const results: WalletData[] = [];
  for (const [groupKey, pksInGroup] of groupKeyToPks) {
    const meta = trackedByPk.get(pksInGroup[0])!;
    const balances: Record<string, number> = {};

    for (const pk of pksInGroup) {
      const tokenMap = tokenHoldingsByPk.get(pk);
      if (tokenMap) {
        for (const [token, amt] of tokenMap) {
          if (amt > 0) balances[token] = (balances[token] ?? 0) + amt;
        }
      }
    }

    let totalUnstaked = 0;
    let totalStaked = 0;
    const stakedByValidatorMap = new Map<string, number>();
    for (const pk of pksInGroup) {
      const stakeData = stakeByPk.get(pk);
      const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
      if (stakeData) {
        totalUnstaked += stakeData.unstaked;
        totalStaked += stakeData.staked;
        for (const e of stakeData.stakedByValidator) {
          stakedByValidatorMap.set(e.validatorPk, (stakedByValidatorMap.get(e.validatorPk) ?? 0) + e.amount);
        }
      } else {
        const desoNanos = user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0;
        totalUnstaked += desoNanos / NANOS_PER_DESO;
      }
    }
    const desoBalance = totalUnstaked + totalStaked;
    if (desoBalance > 0) balances['DESO'] = desoBalance;

    if (meta.displayName === 'focus' && balances.Focus) {
      delete balances.Focus;
    }

    const stakedByValidator: StakedByValidator[] = Array.from(stakedByValidatorMap.entries()).map(
      ([validatorPk, amount]) => ({ validatorPk, validatorName: validatorNames.get(validatorPk), amount })
    );

    const ccv1ValueDeso = pksInGroup.reduce((s, pk) => s + (ccv1ByPk.get(pk) ?? 0), 0);

    results.push({
      name: meta.displayName,
      classification: meta.classification,
      balances,
      usdValue: 0,
      desoStaked: totalStaked > 0 ? totalStaked : undefined,
      desoUnstaked: totalUnstaked > 0 ? totalUnstaked : undefined,
      stakedByValidator: stakedByValidator.length > 0 ? stakedByValidator : undefined,
      ccv1ValueDeso: ccv1ValueDeso > 0 ? ccv1ValueDeso : undefined,
    });
  }

  return results;
}

export { WALLET_CONFIG };

/** Map display name to username for /u/:username links */
export function getUsernameForLink(displayName: string): string {
  const config = WALLET_CONFIG.find(
    (c) => (c.displayName ?? c.username) === displayName
  );
  return config?.username ?? displayName;
}
