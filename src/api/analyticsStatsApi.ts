/**
 * Analytics stats from DeSo GraphQL (and REST where available).
 * Used to fill Network & activity section: total users, etc.
 * Many aggregates (30d stats, content counts) require an indexer; we expose what the public API provides.
 */

const DESO_GRAPHQL = import.meta.env.DEV ? '/deso-graphql' : '/api/deso-graphql';

export interface AnalyticsStats {
  /** Total accounts (profiles) if GraphQL exposes totalCount; else null. */
  totalUsers: number | null;
}

/** GraphQL: try totalCount on accounts connection (Relay-style). */
const ACCOUNTS_TOTAL_QUERY = `
  query AccountsTotal {
    accounts(first: 1) {
      totalCount
      pageInfo { hasNextPage }
    }
  }
`;

/**
 * Fetch analytics stats. Returns null for fields the public API does not expose.
 */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  let totalUsers: number | null = null;

  try {
    const res = await fetch(DESO_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ACCOUNTS_TOTAL_QUERY }),
    });
    if (!res.ok) return { totalUsers: null };

    const data = (await res.json()) as {
      data?: { accounts?: { totalCount?: number } };
      errors?: Array<{ message?: string }>;
    };
    if (data?.errors?.length) return { totalUsers: null };

    const count = data?.data?.accounts?.totalCount;
    if (typeof count === 'number' && Number.isFinite(count)) totalUsers = count;
  } catch {
    // ignore
  }

  return { totalUsers };
}
