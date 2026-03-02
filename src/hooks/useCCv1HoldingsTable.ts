/**
 * DESO locked in CCv1 table: reads from cache, fills in background up to 10K rows.
 * Total reflects all cached data. Notifies on cache updates for near real-time UI.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { fetchCCv1HoldingsPage } from '@/api/walletApi';
import {
  getCCv1HoldingsTableCache,
  getCCv1HoldingsTableRows,
  setCCv1HoldingsTableCache,
  appendCCv1HoldingsTableCache,
  subscribeCCv1HoldingsTableCache,
  MAX_ROWS,
} from '@/lib/ccv1HoldingsTableCache';
import type { CCv1HoldingRow } from '@/api/walletApi';

const PAGE_SIZE = 200;
const BACKGROUND_DELAY_MS = 300;

export function useCCv1HoldingsTable(): {
  rows: CCv1HoldingRow[];
  isLoading: boolean;
  isBackgroundLoading: boolean;
  totalDesoLocked: number;
  totalUsd: number;
  error: Error | null;
} {
  const { marketData } = useLiveData();
  const [rows, setRows] = useState<CCv1HoldingRow[]>(() => getCCv1HoldingsTableRows());
  const [isLoading, setIsLoading] = useState<boolean>(() => rows.length === 0);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const jobRunning = useRef(false);
  const jobStarted = useRef(false);

  // Subscribe to cache updates (e.g. background job appending)
  useEffect(() => {
    const unsub = subscribeCCv1HoldingsTableCache(() => {
      setRows(getCCv1HoldingsTableRows());
    });
    return unsub;
  }, []);

  // Initial load: if cache empty, fetch first page and seed cache
  useEffect(() => {
    const cached = getCCv1HoldingsTableCache();
    if (cached && cached.rows.length > 0) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { rows: pageRows, hasNextPage, endCursor } = await fetchCCv1HoldingsPage(PAGE_SIZE, null);
        if (cancelled) return;
        setCCv1HoldingsTableCache(pageRows, hasNextPage ? endCursor : null);
        setRows(getCCv1HoldingsTableRows());
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Background job: once we have cache with a cursor, fetch pages until 10K or no more
  useEffect(() => {
    if (jobStarted.current || jobRunning.current) return;
    const c = getCCv1HoldingsTableCache();
    if (!c || c.rows.length === 0 || !c.nextCursor) return;
    jobStarted.current = true;

    const run = async () => {
      while (true) {
        const cache = getCCv1HoldingsTableCache();
        if (!cache || cache.rows.length >= MAX_ROWS || !cache.nextCursor) break;
        jobRunning.current = true;
        setIsBackgroundLoading(true);
        try {
          await new Promise((r) => setTimeout(r, BACKGROUND_DELAY_MS));
          const { rows: pageRows, hasNextPage, endCursor } = await fetchCCv1HoldingsPage(
            PAGE_SIZE,
            cache.nextCursor
          );
          appendCCv1HoldingsTableCache(pageRows, hasNextPage ? endCursor : null);
          if (pageRows.length === 0 || !hasNextPage) break;
        } catch {
          break;
        } finally {
          jobRunning.current = false;
          setIsBackgroundLoading(false);
        }
      }
      jobRunning.current = false;
      setIsBackgroundLoading(false);
    };
    const t = setTimeout(run, 800);
    return () => clearTimeout(t);
  }, [rows.length]);

  const totals = useMemo(() => {
    const desoLocked = rows.reduce((s, r) => s + r.desoLocked, 0);
    return { totalDesoLocked: desoLocked, totalUsd: desoLocked * marketData.desoPrice };
  }, [rows, marketData.desoPrice]);

  return {
    rows,
    isLoading,
    isBackgroundLoading,
    totalDesoLocked: totals.totalDesoLocked,
    totalUsd: totals.totalUsd,
    error,
  };
}
