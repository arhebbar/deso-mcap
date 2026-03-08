/**
 * User-defined classification overrides (e.g. tag Others as DeSo Bull).
 * Persisted in localStorage. Used by walletApi to upgrade OTHERS -> DESO_BULL.
 */

const STORAGE_KEY = 'deso-marketcap-classification-overrides';

export type OverrideClassification = 'DESO_BULL';

export function getClassificationOverrides(): Map<string, OverrideClassification> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, OverrideClassification>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

export function setClassificationOverride(publicKey: string, classification: OverrideClassification): void {
  if (typeof window === 'undefined') return;
  const map = getClassificationOverrides();
  map.set(publicKey, classification);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // ignore
  }
}

export function removeClassificationOverride(publicKey: string): void {
  if (typeof window === 'undefined') return;
  const map = getClassificationOverrides();
  map.delete(publicKey);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // ignore
  }
}
