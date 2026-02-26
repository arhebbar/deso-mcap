/**
 * Network stats for Analytics (block height, node health, mempool).
 * - Node health: GET /api/v0/health-check
 * - Block height: get-app-state (public node does not expose /api/v1/node-info)
 * - Mempool: get-block-template next-block txn count when available
 */

const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';

export interface NetworkStats {
  blockHeight: number | null;
  nodeSynced: boolean | null;
  nodeReachable: boolean;
  /** Txns in next block template (approximate mempool activity). null if unavailable. */
  mempoolOrNextBlockTxnCount: number | null;
}

/**
 * Check if the DeSo node is reachable and synced.
 * GET /api/v0/health-check returns 200 when node is synced.
 */
export async function fetchNodeHealth(): Promise<{ synced: boolean; reachable: boolean }> {
  try {
    const res = await fetch(`${DESO_NODE}/health-check`, { method: 'GET' });
    return { synced: res.ok, reachable: true };
  } catch {
    return { synced: false, reachable: false };
  }
}

/** get-app-state (some nodes may include BlockHeight in response). */
async function fetchBlockHeightFromAppState(): Promise<number | null> {
  try {
    const res = await fetch(`${DESO_NODE}/get-app-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { BlockHeight?: number };
    return data.BlockHeight ?? null;
  } catch {
    return null;
  }
}

/** Next-block txn count from get-block-template (approximate mempool activity). Requires valid PublicKeyBase58Check. */
async function fetchNextBlockTxnCount(): Promise<number | null> {
  const placeholderPubKey = 'BC1YLgAJ2kZ7Q4fZp7KzK2Mzr9zyuYPaQ1evEWG4s968sChRBPKbSV1';
  try {
    const res = await fetch(`${DESO_NODE}/get-block-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        PublicKeyBase58Check: placeholderPubKey,
        NumHeaders: 1,
        HeaderVersion: 1,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { LatestBlockTemplateStats?: { TxnCount?: number } };
    const count = data.LatestBlockTemplateStats?.TxnCount;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

/**
 * Fetch network stats (block height, node health, next-block txn count).
 */
export async function fetchNetworkStats(): Promise<NetworkStats> {
  const [blockHeight, health, nextBlockCount] = await Promise.all([
    fetchBlockHeightFromAppState(),
    fetchNodeHealth(),
    fetchNextBlockTxnCount(),
  ]);
  return {
    blockHeight: blockHeight ?? null,
    nodeSynced: health.reachable ? health.synced : null,
    nodeReachable: health.reachable,
    mempoolOrNextBlockTxnCount: nextBlockCount,
  };
}
