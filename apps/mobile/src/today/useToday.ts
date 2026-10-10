import { useCallback, useEffect, useRef } from 'react';

import { useAppServices } from '@/services/ServicesProvider';

import { type TodayData, loadToday } from './today';
import { loadTodayParts, todayCardOf } from './todayWorkout';
import { useReadOnFocus } from './useReadOnFocus';
import { loadWeekLogs, weekMonday } from './week';

/**
 * Today's parts (K-401), read on focus and when the app comes back to the front — after Apple Health's new scale
 * weigh-ins have gone into the queue and the queue has been sent (K-402), so a morning weighed — on a smart scale or
 * typed — shows as done. Health failing
 * never keeps Today from reading: it is reported by name and the server's parts follow. The read depends on the API
 * client only; the Health and report functions are read at call time, so a caller handing new ones each render does not
 * start a new read each render.
 */
export function useToday(): { day: string; data: TodayData | null; reload: () => void } {
  const { api, syncHealth, queue, report, reminders, state, opens, workoutRecords, training } = useAppServices();
  const latest = useRef({ syncHealth, queue, report, reminders, state, opens, workoutRecords, training });
  useEffect(() => {
    latest.current = { syncHealth, queue, report, reminders, state, opens, workoutRecords, training };
  });
  return useReadOnFocus(
    useCallback(
      async (day: string) => {
        const { syncHealth: sync, queue: waiting, report: tell, reminders: remind, state: declared, opens: opened } = latest.current;
        const era = remind.era(); // a sign-out during this read must not hand its week off to the next account
        const named = (error: unknown) => tell({ name: error instanceof Error ? error.name : 'Unknown' });
        const health = await sync().catch(named);
        // What waits on the phone goes first (a weigh-in just saved), so the server's list shows it (K-402 review).
        await waiting.drain().catch(named);
        const today = await loadToday(api, day);
        // The week's days as the server counts its week (K-969): its Monday, and its today, from what was just read (the
        // phone's day only without the server's word: offline, or an older server).
        const served = today.program.state === 'ready' ? today.program.value : null;
        const monday = weekMonday(today.consistency, today.program, day);
        const week = await loadWeekLogs(api, monday, served?.today ?? day);
        // Today's workout (K-969): one under way on this phone first (its own records), else one finished today. A store
        // that cannot be read (or is not there) never keeps the week from showing: reported, and none under way.
        const records = await Promise.resolve()
          .then(() => latest.current.workoutRecords())
          .catch((error: unknown) => {
            named(error);
            return [];
          });
        // The moment of this read: the card's rule reads the phone's day from it, never a later clock (K-969, K-995).
        const readAt = new Date();
        // The program the card reads is the one the Train tab reads: the server's, else its copy kept for offline.
        let cardProgram: TodayData['cardProgram'] = served === null ? null : { program: served, kept: false };
        if (served === null && today.program.state === 'failed') {
          const copy = await Promise.resolve()
            .then(() => latest.current.training.keptProgram())
            .catch((error: unknown) => {
              named(error);
              return null;
            });
          cardProgram = copy === null ? null : { program: copy, kept: true };
        }
        // What the card will show decides what it needs: a done workout's summary (the server's id), a skipped day's line.
        const card = todayCardOf({ program: cardProgram?.program ?? null, kept: cardProgram?.kept === true, records, now: readAt });
        const done = card.kind === 'done' ? { workoutId: card.workoutId, programDayId: card.day?.id ?? null } : null;
        const todayParts = await loadTodayParts(api, { done, withMoves: cardProgram !== null, skipped: card.kind === 'skipped' });
        // The program's week off, for the reminders (ADR-037 › 51b); an unread program says nothing new.
        const { program } = today;
        if (program.state === 'ready' || program.state === 'none') void remind.keepRestUntil(program.state === 'ready' ? (program.value.restUntil ?? null) : null, era);
        // Where the first call stands, for the reminders (K-992): no check-in morning before its day, none without calls.
        const { firstWeeks } = today;
        if (firstWeeks?.state === 'consent') void remind.keepFirstCall('off', era);
        else if (firstWeeks?.state === 'ready' || firstWeeks?.state === 'none') {
          const on = firstWeeks.state === 'ready' ? firstWeeks.value.firstCallOn : undefined;
          void remind.keepFirstCall(on === undefined ? 'weekly' : { on }, era);
        }
        // A state declared, kept on the phone for the reminders (K-518) — not for an account that left during the read.
        if (today.state !== undefined && remind.era() === era) await declared.keep(today.state).catch(named);
        // Today's open counted, the one before read (K-521): the week-5 risk's "the app not opened", on the phone only.
        const previousOpen = await opened.previous().catch((error: unknown) => {
          named(error);
          return null;
        });
        return { ...today, stepsToday: health?.stepsToday ?? null, previousOpen, monday, week, cardProgram, records, readAt, todayParts };
      },
      [api],
    ),
  );
}
