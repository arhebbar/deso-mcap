/**
 * Fetches early Block Reward recipients (block height < 10000).
 * Used to categorize them as Early Block Rewardees.
 */

import { getGraphqlUrl } from '@/api/graphqlEndpoint';
import { fetchUsernamesForPks } from '@/api/walletApi';

const EARLY_BLOCK_HEIGHT_MAX = '10000';

export interface EarlyBlockRewardRecipient {
  publicKey: string;
  /** Username from chain when available */
  username?: string;
  blockCount: number;
  firstBlock: number;
  lastBlock: number;
  firstBlockDate: string | null;
  lastBlockDate: string | null;
}

const EARLY_BLOCK_REWARDS_QUERY = `
  query EarlyBlockRewards($filter: TransactionFilter, $orderBy: [TransactionsOrderBy!], $first: Int!) {
    transactions(filter: $filter, orderBy: $orderBy, first: $first) {
      totalCount
      nodes {
        blockHeight
        timestamp
        outputs
      }
    }
  }
`;

/** Single fetch, no pagination - avoids cursor uniqueness requirement. */
const FETCH_ALL_LIMIT = 15000;

export async function fetchEarlyBlockRewardRecipients(): Promise<EarlyBlockRewardRecipient[]> {
  const variables = {
    filter: {
      txnType: { equalTo: 1 },
      blockHeight: { lessThan: EARLY_BLOCK_HEIGHT_MAX },
    },
    orderBy: ['BLOCK_HEIGHT_ASC'],
    first: FETCH_ALL_LIMIT,
  };

  const res = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: EARLY_BLOCK_REWARDS_QUERY, variables }),
  });
  const data = await res.json();
  if (data?.errors?.length) {
    throw new Error(data.errors.map((e: { message?: string }) => e.message).join('; '));
  }
  const nodes = data?.data?.transactions?.nodes ?? [];

  const recipients = new Map<string, { blocks: Array<{ height: number; timestamp: string | null }> }>();
  for (const n of nodes) {
    const blockHeight = parseInt(n.blockHeight ?? '0', 10);
    const timestamp = n.timestamp ?? null;
    const outputs = n.outputs ?? [];
    for (const o of outputs) {
      const pk = o?.public_key ?? o?.PublicKey;
      if (pk) {
        const entry = recipients.get(pk) ?? { blocks: [] };
        entry.blocks.push({ height: blockHeight, timestamp });
        recipients.set(pk, entry);
      }
    }
  }

  const list = Array.from(recipients.entries())
    .map(([publicKey, { blocks }]) => {
      const sorted = [...blocks].sort((a, b) => a.height - b.height);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return {
        publicKey,
        blockCount: blocks.length,
        firstBlock: first?.height ?? 0,
        lastBlock: last?.height ?? 0,
        firstBlockDate: first?.timestamp ?? null,
        lastBlockDate: last?.timestamp ?? null,
      };
    })
    .sort((a, b) => a.firstBlock - b.firstBlock);

  const pks = list.map((r) => r.publicKey);
  const usernameMap = await fetchUsernamesForPks(pks);

  return list.map((r) => ({
    ...r,
    username: usernameMap.get(r.publicKey),
  }));
}
