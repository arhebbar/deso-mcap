/**
 * Fetches early Block Reward recipients (block height < 1000).
 * Used to categorize them as Early Block Rewardees.
 */

import { getGraphqlUrl } from '@/api/graphqlEndpoint';

const EARLY_BLOCK_HEIGHT_MAX = '1000';

export interface EarlyBlockRewardRecipient {
  publicKey: string;
  blockCount: number;
  firstBlock: number;
  lastBlock: number;
}

const EARLY_BLOCK_REWARDS_QUERY = `
  query EarlyBlockRewards($filter: TransactionFilter, $orderBy: [TransactionsOrderBy!], $first: Int!, $after: Cursor) {
    transactions(filter: $filter, orderBy: $orderBy, first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        blockHeight
        outputs
      }
    }
  }
`;

export async function fetchEarlyBlockRewardRecipients(): Promise<EarlyBlockRewardRecipient[]> {
  const recipients = new Map<string, { blocks: number[] }>();
  let after: string | null = null;
  const PAGE_SIZE = 500;

  do {
    const variables = {
      filter: {
        txnType: { equalTo: 1 },
        blockHeight: { lessThan: EARLY_BLOCK_HEIGHT_MAX },
      },
      orderBy: ['BLOCK_HEIGHT_ASC', 'TRANSACTION_ID_ASC'],
      first: PAGE_SIZE,
      after,
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
    const pageInfo = data?.data?.transactions?.pageInfo;

    for (const n of nodes) {
      const blockHeight = parseInt(n.blockHeight ?? '0', 10);
      const outputs = n.outputs ?? [];
      for (const o of outputs) {
        const pk = o?.public_key ?? o?.PublicKey;
        if (pk) {
          const entry = recipients.get(pk) ?? { blocks: [] };
          entry.blocks.push(blockHeight);
          recipients.set(pk, entry);
        }
      }
    }

    after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
    if (after) await new Promise((r) => setTimeout(r, 50));
  } while (after);

  return Array.from(recipients.entries())
    .map(([publicKey, { blocks }]) => {
      const sorted = [...blocks].sort((a, b) => a - b);
      return {
        publicKey,
        blockCount: blocks.length,
        firstBlock: sorted[0] ?? 0,
        lastBlock: sorted[sorted.length - 1] ?? 0,
      };
    })
    .sort((a, b) => a.firstBlock - b.firstBlock);
}
