import { useCallback, useEffect, useRef } from 'react';

import { useAppServices } from '@/services/ServicesProvider';

import { type TodayData, loadToday } from './today';
import { useReadOnFocus } from './useReadOnFocus';

/**
 * Today's parts (K-401), read on focus and when the app comes back to the front — after Apple Health's new scale
 * weigh-ins have gone into the queue and the queue has been sent (K-402), so a morning weighed — on a smart scale or
 * typed — shows as done. Health failing
 * never keeps Today from reading: it is reported by name and the server's parts follow. The read depends on the API
 * client only; the Health and report functions are read at call time, so a caller handing new ones each render does not
 * start a new read each render.
 */
export function useToday(): { day: string; data: TodayData | null; reload: () => void } {
  const { api, syncHealth, queue, report } = useAppServices();
  const latest = useRef({ syncHealth, queue, report });
  useEffect(() => {
    latest.current = { syncHealth, queue, report };
  });
  return useReadOnFocus(
    useCallback(
      async (day: string) => {
        const { syncHealth: sync, queue: waiting, report: tell } = latest.current;
        const named = (error: unknown) => tell({ name: error instanceof Error ? error.name : 'Unknown' });
        await sync().catch(named);
        // What waits on the phone goes first (a weigh-in just saved), so the server's list shows it (K-402 review).
        await waiting.drain().catch(named);
        return loadToday(api, day);
      },
      [api],
    ),
  );
}
