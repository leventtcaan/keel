/**
 * This week (K-969, ADR-077 #1): which face the screen shows, read from what the server said. The week is the server's:
 * its Monday from the consistency (Consistency.weekOf), before the first call from the dates the program's sessions are
 * on this week (Program.week), its number from the first eight weeks (FirstWeeks.week) and the record from the
 * consistency. The phone lays that week's days out and counts the days to a date the server gave (ADR-077 Ek 2); it
 * works out no week, no call day and no state.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

import { type Loaded, type TodayData, load, localDay } from './today';

type Schemas = components['schemas'];
export type Weekday = Schemas['Weekday'];

/** The week as the strip shows it, Monday first (the server's week, Consistency.WEEK_STARTS_ON). */
export const WEEK: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const DAY_MS = 24 * 60 * 60 * 1000;
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** The weekday of a calendar day (YYYY-MM-DD), read as a date only: no time zone moves it. */
export function weekdayOf(day: string): Weekday {
  return WEEK[(new Date(time(day)).getUTCDay() + 6) % 7];
}

/** The calendar day `days` on from `day` (back when negative). */
export function addDays(day: string, days: number): string {
  return new Date(time(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The days from `from` to `to`: 0 the same day, 1 the next, negative once past. Counted, not decided. */
export function daysBetween(from: string, to: string): number {
  return Math.round((time(to) - time(from)) / DAY_MS);
}

const mondayOf = (day: string) => addDays(day, -WEEK.indexOf(weekdayOf(day)));

/**
 * The Monday this week began: the consistency's; before it is there (no call yet, or no consent) the week the program's
 * sessions are on; neither, the week of today on the phone's calendar. The two fallbacks go once the server names the
 * program's week (K-995 Program.weekOf): read it here then, and add no more date arithmetic.
 */
export function weekMonday(consistency: Loaded<Schemas['Consistency']>, program: Loaded<Schemas['Program']>, today: string): string {
  if (consistency.state === 'ready') return consistency.value.weekOf;
  const session = program.state === 'ready' ? program.value.week?.[0] : undefined;
  return mondayOf(session?.date ?? today);
}

export type StripDay = { weekday: Weekday; date: string; trained: boolean; logged: boolean; planned: boolean; today: boolean };

/**
 * The week's seven days: a session done (✓), a log (a weigh-in), a session still to come, today or later (the server's
 * week: a moved one on its new day, a skipped one no more). A day with none of them is only empty: nothing says missed (U7).
 */
export function stripDays(monday: string, today: string, week: Schemas['WeekSession'][], trainedOn: string[], loggedOn: string[]): StripDay[] {
  return WEEK.map((weekday, i) => {
    const date = addDays(monday, i);
    const trained = trainedOn.includes(date);
    // Only today and the days to come: a session of a day gone by, not done, is no ring (nothing reads as missed, U7).
    const planned = !trained && date >= today && week.some((s) => s.date === date && s.skipped !== true);
    return { weekday, date, trained, logged: loggedOn.includes(date), planned, today: date === today };
  });
}

export type WeekHead = {
  /** The week's number, while the server names it (the first eight weeks and the ninth); none after. */
  week: number | null;
  record: { onTrack: number; counted: number } | null;
  /** No week over yet: the record counts by week ("Counted by week"). */
  countedByWeek: boolean;
};

export function weekHead(consistency: Loaded<Schemas['Consistency']>, firstWeeks?: Loaded<Schemas['FirstWeeks']>): WeekHead {
  const week = firstWeeks?.state === 'ready' ? firstWeeks.value.week : null;
  const counted = consistency.state === 'ready' ? consistency.value.record : null;
  const record = counted !== null && counted.countedWeeks > 0 ? { onTrack: counted.onTrackWeeks, counted: counted.countedWeeks } : null;
  // Without the consent the record is not there to explain (ADR-072 Ek 1: no consent, no line).
  const countedByWeek = record === null && (consistency.state === 'ready' || consistency.state === 'none');
  return { week, record, countedByWeek };
}

export type Hero =
  | { kind: 'paused' }
  | { kind: 'monday'; week: number | null; questions: number; weekday: Weekday }
  | { kind: 'call'; decision: Schemas['Decision']; declined: boolean }
  | { kind: 'firstWeek'; firstCallOn: string | null }
  | { kind: 'callsOff' }
  | { kind: 'none' };

/**
 * The one block at the top (ADR-077 #1), most pressing first: the check-in open ("Open your call", ADR-077 #2), in a
 * paused week too (the state's card stays above it); a week paused (the state's card, with "I'm back"); this week's call (declined: "Not applied", K-963); no call yet, the first
 * week and the first call's day (ADR-077 Ek 2); without the health data consent, the calls are off (ADR-072 Ek 1).
 */
export function heroOf(data: TodayData): Hero {
  // The check-in first, a paused week too: in a paused week it asks whether the state still holds (STATE_STILL).
  const checkIn = data.checkIn;
  if (checkIn?.state === 'ready' && !checkIn.value.answered) {
    const week = data.firstWeeks?.state === 'ready' ? data.firstWeeks.value.week : null;
    return { kind: 'monday', week, questions: checkIn.value.questions.length, weekday: weekdayOf(checkIn.value.weekOf) };
  }
  if (data.state?.state === 'ready') return { kind: 'paused' };
  const { decision } = data;
  if (decision.state === 'ready') return { kind: 'call', decision: decision.value, declined: decision.value.application.state === 'DECLINED' };
  if (decision.state === 'consent') return { kind: 'callsOff' };
  if (decision.state === 'none') {
    const firstCallOn = data.firstWeeks?.state === 'ready' ? (data.firstWeeks.value.firstCallOn ?? null) : null;
    return { kind: 'firstWeek', firstCallOn };
  }
  return { kind: 'none' };
}

export type WeekLogs = { workouts: Loaded<Schemas['Workout'][]>; weighIns: Loaded<Schemas['WeighIn'][]> };

/** The week's workouts and weigh-ins, Monday to today; the weigh-ins are health data (CONSENT_REQUIRED without it). */
export async function loadWeekLogs(api: ApiClient, monday: string, today: string): Promise<WeekLogs> {
  const query = { from: monday, to: today };
  const [workouts, weighIns] = await Promise.all([
    load(() => api.GET('/v1/workouts', { params: { query } })),
    load(() => api.GET('/v1/weigh-ins', { params: { query } })),
  ]);
  return { workouts, weighIns };
}

const daysOf = (times: string[]) => [...new Set(times.map((at) => localDay(new Date(at))))];

/** The days a workout was finished, on the phone's calendar; one still open is no session done yet. */
export function trainedDays(workouts: Loaded<Schemas['Workout'][]> | undefined): string[] {
  return workouts?.state === 'ready' ? daysOf(workouts.value.filter((w) => w.endedAt !== undefined).map((w) => w.startedAt)) : [];
}

/** The days with a weigh-in. */
export function loggedDays(weighIns: Loaded<Schemas['WeighIn'][]> | undefined): string[] {
  return weighIns?.state === 'ready' ? daysOf(weighIns.value.map((w) => w.measuredAt)) : [];
}
