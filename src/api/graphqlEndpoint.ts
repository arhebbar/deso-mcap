/**
 * GraphQL endpoint switcher: DeSo Foundation vs SafetyNet.
 * SafetyNet (https://graphql.safetynet.social) can provide faster response in some regions.
 * Preference is persisted in localStorage and used by analyticsStatsApi, walletApi, userProfileApi.
 */

const STORAGE_KEY = 'deso-graphql-provider';

export type GraphqlProvider = 'deso' | 'safetynet';

const DESO_URL = import.meta.env.DEV ? '/deso-graphql' : '/api/deso-graphql';
const SAFETYNET_URL = import.meta.env.DEV ? '/safetynet-graphql' : '/api/safetynet-graphql';

export function getGraphqlProvider(): GraphqlProvider {
  if (typeof window === 'undefined') return 'deso';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'safetynet' || v === 'deso') return v;
  } catch {
    // ignore
  }
  return 'deso';
}

export function setGraphqlProvider(provider: GraphqlProvider): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, provider);
      window.dispatchEvent(new Event('graphql-provider-changed'));
    }
  } catch {
    // ignore
  }
}

/** URL to use for GraphQL POST requests (dashboard stats, wallet, profile). */
export function getGraphqlUrl(): string {
  return getGraphqlProvider() === 'safetynet' ? SAFETYNET_URL : DESO_URL;
}
