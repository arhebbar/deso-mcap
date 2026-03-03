/**
 * Client-side cache for DESO locked in CCv1 table (top creator coins by DESO locked).
 * Filled incrementally by a background job up to 10K rows. UI reads from cache for near real-time display.
 */

import type { CCv1HoldingRow } from '@/api/walletApi';

const CACHE_KEY = 'deso-ccv1-holdings-table';
export const MAX_ROWS = 25_000;
export const CCV1_HOLDINGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface CCv1HoldingsPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export type CCv1HoldingsStoppedReason = 'no_more_pages' | 'max_rows_reached' | 'error';

export interface CachedCCv1Holdings {
  rows: CCv1HoldingRow[];
  nextCursor: string | null;
  timestamp: number;
  /** Set when background job finishes – why it stopped pulling. */
  stoppedReason?: CCv1HoldingsStoppedReason;
  /** Set when job finishes – last pageInfo from GraphQL (hasNextPage, endCursor). */
  lastPageInfo?: CCv1HoldingsPageInfo;
  /** Timestamp when job stopped. */
  stoppedAt?: number;
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

/** Get cached table data. Returns null if missing or invalid. */
export function getCCv1HoldingsTableCache(): CachedCCv1Holdings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCCv1Holdings;
    if (!Array.isArray(parsed?.rows)) return null;
    return {
      rows: parsed.rows,
      nextCursor: parsed.nextCursor ?? null,
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
      stoppedReason: parsed.stoppedReason,
      lastPageInfo: parsed.lastPageInfo,
      stoppedAt: parsed.stoppedAt,
    };
  } catch {
    return null;
  }
}

/** Get cached rows only (for UI). Returns [] if no cache. */
export function getCCv1HoldingsTableRows(): CCv1HoldingRow[] {
  const c = getCCv1HoldingsTableCache();
  return c?.rows ?? [];
}

/** Replace full cache (e.g. initial load). Preserves stoppedReason/lastPageInfo/stoppedAt only when nextCursor is null (job finished). */
export function setCCv1HoldingsTableCache(rows: CCv1HoldingRow[], nextCursor: string | null = null): void {
  try {
    const existing = getCCv1HoldingsTableCache();
    const payload: CachedCCv1Holdings = {
      rows,
      nextCursor,
      timestamp: Date.now(),
      ...(nextCursor === null && existing
        ? { stoppedReason: existing.stoppedReason, lastPageInfo: existing.lastPageInfo, stoppedAt: existing.stoppedAt }
        : {}),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    notifyListeners();
  } catch {
    // localStorage may be full
  }
}

/** Append a page of rows and update cursor. Used by background job. Notifies subscribers. */
export function appendCCv1HoldingsTableCache(
  newRows: CCv1HoldingRow[],
  nextCursor: string | null
): void {
  const c = getCCv1HoldingsTableCache();
  const rows = c ? [...c.rows, ...newRows] : newRows;
  const capped = rows.slice(0, MAX_ROWS);
  setCCv1HoldingsTableCache(capped, nextCursor);
}

/** Record why the background job stopped and final pageInfo. Notifies subscribers. */
export function recordCCv1HoldingsJobFinished(
  reason: CCv1HoldingsStoppedReason,
  lastPageInfo?: CCv1HoldingsPageInfo
): void {
  try {
    const c = getCCv1HoldingsTableCache();
    if (!c) return;
    const payload: CachedCCv1Holdings = {
      ...c,
      stoppedReason: reason,
      lastPageInfo,
      stoppedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    notifyListeners();
  } catch {
    // localStorage may be full
  }
}

/** Subscribe to cache updates (e.g. when background job appends). Returns unsubscribe. */
export function subscribeCCv1HoldingsTableCache(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
