/**
 * A chart's range (K-1260, ADR-096 Ek 1): the first is what Progress already read; another is read when chosen. One that comes with a
 * subscription asks first (services.paidAccess, only on that tap: no paywall by itself): without one the chart stays as it was and the
 * lock is said; unread is never a lock. The latest choice wins: an answer for an earlier one is dropped.
 */
import { useCallback, useRef, useState } from 'react';

import { useAppServices } from '@/services/ServicesProvider';
import type { Loaded } from '@/today/today';

import type { ChartRange } from './params';

export type RangeNote = 'locked' | 'unread' | 'failed' | null;

export function useChartRange<T>(ranges: ChartRange[], read: (range: ChartRange) => Promise<Loaded<T>>) {
  const { paidAccess } = useAppServices();
  const [chosen, setChosen] = useState<{ key: string; data: T | null }>({ key: ranges[0].key, data: null });
  const [note, setNote] = useState<RangeNote>(null);
  const latest = useRef(0);

  const choose = useCallback(
    async (key: string) => {
      const mine = ++latest.current;
      const range = ranges.find((r) => r.key === key);
      if (range === undefined) return;
      if (range === ranges[0]) {
        setChosen({ key, data: null });
        setNote(null);
        return;
      }
      if (!range.free) {
        const access = await paidAccess();
        if (mine !== latest.current) return;
        if (access !== 'open') {
          setNote(access);
          return;
        }
      }
      const answer = await read(range);
      if (mine !== latest.current) return;
      if (answer.state !== 'ready') {
        setNote('failed');
        return;
      }
      setChosen({ key, data: answer.value });
      setNote(null);
    },
    [ranges, read, paidAccess],
  );
  const reset = useCallback(() => {
    latest.current += 1;
    setChosen({ key: ranges[0].key, data: null });
    setNote(null);
  }, [ranges]);
  return { key: chosen.key, data: chosen.data, note, choose, reset };
}

/** A paid part asked for on a tap (K-1267): opened with a subscription; otherwise the lock, or the unread line, is said. */
export function usePaidPart() {
  const { paidAccess } = useAppServices();
  const [note, setNote] = useState<RangeNote>(null);
  const ask = useCallback(
    async (open: () => Promise<boolean> | boolean) => {
      const access = await paidAccess();
      if (access !== 'open') {
        setNote(access);
        return;
      }
      setNote((await open()) ? null : 'failed');
    },
    [paidAccess],
  );
  return { note, ask, clear: useCallback(() => setNote(null), []) };
}
