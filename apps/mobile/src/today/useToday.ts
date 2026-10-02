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
  const { api, syncHealth, queue, report, reminders, state } = useAppServices();
  const latest = useRef({ syncHealth, queue, report, reminders, state });
  useEffect(() => {
    latest.current = { syncHealth, queue, report, reminders, state };
  });
  return useReadOnFocus(
    useCallback(
      async (day: string) => {
        const { syncHealth: sync, queue: waiting, report: tell, reminders: remind, state: declared } = latest.current;
        const era = remind.era(); // a sign-out during this read must not hand its week off to the next account
        const named = (error: unknown) => tell({ name: error instanceof Error ? error.name : 'Unknown' });
        const health = await sync().catch(named);
        // What waits on the phone goes first (a weigh-in just saved), so the server's list shows it (K-402 review).
        await waiting.drain().catch(named);
        const today = await loadToday(api, day);
        // The program's week off, for the reminders (ADR-037 › 51b); an unread program says nothing new.
        const { program } = today;
        if (program.state === 'ready' || program.state === 'none') void remind.keepRestUntil(program.state === 'ready' ? (program.value.restUntil ?? null) : null, era);
        // A state declared, kept on the phone for the reminders (K-518) — not for an account that left during the read.
        if (today.state !== undefined && remind.era() === era) await declared.keep(today.state).catch(named);
        return { ...today, stepsToday: health?.stepsToday ?? null };
      },
      [api],
    ),
  );
}
