/**
 * User classification overrides (e.g. tag Others accounts as DeSo Bull).
 * Persisted in localStorage. Used by Token Holdings table.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'deso-marketcap:classification-overrides';

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

function setClassificationOverrideStorage(
  pk: string,
  classification: OverrideClassification | null
): void {
  const map = getClassificationOverrides();
  if (classification) {
    map.set(pk, classification);
  } else {
    map.delete(pk);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // ignore
  }
}

export function useClassificationOverrides() {
  const [overrides, setOverrides] = useState(() => getClassificationOverrides());
  const setOverride = useCallback((pk: string, classification: OverrideClassification | null) => {
    setClassificationOverrideStorage(pk, classification);
    setOverrides(getClassificationOverrides());
  }, []);
  return { overrides, setOverride };
}
