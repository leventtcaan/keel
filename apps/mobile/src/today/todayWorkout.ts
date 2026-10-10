/**
 * Today's workout on This week (K-969, ADR-077 #1): which card shows. Not decided here: the card reads what the Train card
 * reads, by the same function (src/train/week.ts › sessionState and todayKind, K-970, K-995), so the two never differ:
 * today is the server's (Program.today); a workout under way on this phone (its own records, K-405, K-961) is continued;
 * a workout finished today, on this phone (its finish may still wait to be sent) or by the server's word (DONE), is done;
 * OPEN on another phone is open there; then this week's session as the server laid it out (Program.week, K-964: today's,
 * skipped, or moved off today, each undoable when the server says so); a week off; rest. Without the program (not read,
 * none kept) only the phone's own records speak. Nothing here decides a session or a date.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { type Move, ownMove } from '@/train/trainData';
import { type Done, finishedDay, finishedOnPhone, movedOffToday, sessionState, todayKind } from '@/train/week';
import { activeWorkout } from '@/train/workout';

import { type Loaded, load, localDay } from './today';
import { weekdayOf } from './week';

type Schemas = components['schemas'];
type Day = Schemas['ProgramDay'];

export type TodayCard =
  /** `onPhone`: the workout is on this phone and can be continued here; `sets` its sets so far (unknown when it is not). */
  | { kind: 'open'; day: Day | null; sets: number | null; onPhone: boolean }
  /** `day`: the program day of the workout done (none: a free workout, or the program is not known). */
  | { kind: 'done'; day: Day | null; workoutId: string | null }
  | { kind: 'session'; day: Day; session: Schemas['WeekSession'] }
  /** `undoable`: the server says today's move or skip can be undone (WeekSession.undoable, K-995). */
  | { kind: 'moved'; day: Day; to: string; undoable: boolean }
  | { kind: 'skipped'; day: Day; undoable: boolean }
  | { kind: 'restWeek' }
  | { kind: 'rest' }
  | { kind: 'none' };

type Input = {
  /** The program as the Train tab reads it: the server's, or the copy kept on the phone (`kept`); none when neither. */
  program: Schemas['Program'] | null;
  kept: boolean;
  /** The phone's own workout records (K-304): a workout under way here, a finish still waiting to be sent. */
  records: LocalRecord[];
  now: Date;
};

export function todayCardOf({ program, kept, records, now }: Input): TodayCard {
  if (program === null) {
    const active = activeWorkout(records);
    if (active !== null) return { kind: 'open', day: null, sets: active.sets.length, onPhone: true };
    const done = finishedOnPhone(records, localDay(now));
    return done === null ? { kind: 'none' } : { kind: 'done', day: null, workoutId: done.workoutId };
  }
  const state = sessionState({ program, kept, records, now });
  const dayOf = (id: string | null | undefined) => program.days.find((d) => d.id === id) ?? null;
  if (state.onPhone !== null) return { kind: 'open', day: dayOf(state.onPhone.programDayId), sets: state.onPhone.sets.length, onPhone: true };
  const { found, finished } = state;
  const kind = todayKind(program, state);
  if (kind === 'restWeek') return { kind };
  if (kind === 'done') return { kind, day: finishedDay(program, state), workoutId: finished?.workoutId ?? null };
  if (kind === 'openElsewhere') return { kind: 'open', day: found?.day ?? null, sets: null, onPhone: false };
  if (found !== null) {
    const { session, day } = found;
    return session.skipped === true ? { kind: 'skipped', day, undoable: !state.stale && session.undoable === true } : { kind: 'session', day, session };
  }
  const away = kind === 'moved' ? movedOffToday(program) : null;
  return away === null ? { kind: 'rest' } : { kind: 'moved', day: away.day, to: away.session.date, undoable: true };
}

export type TodayParts = {
  /** The finished workout's facts, the server's (K-965): its sets and the load lifted. */
  summary: Loaded<Schemas['WorkoutSummary']> | null;
  /** The moves by id, the catalog's and the user's own, for the session's first moves. */
  moves: Map<string, Move>;
  /** The user's check-in day, for a skipped session's line ("Sunday reads what happened"); read only then. */
  checkInDay: Schemas['Weekday'] | null;
};

type Needs = { done: Done | null; withMoves: boolean; skipped: boolean };

/** What today's card needs beyond the week, each read only when it shows. */
export async function loadTodayParts(api: ApiClient, { done, withMoves, skipped }: Needs): Promise<TodayParts> {
  const id = done?.workoutId ?? null;
  const [summary, exercises, own, profile] = await Promise.all([
    id === null ? null : load(() => api.GET('/v1/workouts/{id}/summary', { params: { path: { id } } })),
    withMoves ? load(() => api.GET('/v1/exercises')) : null,
    withMoves ? load(() => api.GET('/v1/custom-exercises')) : null,
    skipped ? load(() => api.GET('/v1/profile')) : null,
  ]);
  const catalog: Move[] = exercises?.state === 'ready' ? exercises.value : [];
  const mine: Move[] = own?.state === 'ready' ? own.value.map(ownMove) : [];
  const checkInDay = profile?.state === 'ready' ? profile.value.schedule.checkInDay : null;
  return { summary, moves: new Map([...catalog, ...mine].map((m) => [m.id, m])), checkInDay };
}

/** Today's cardio minutes, when the program plans a session today (ADR-074); none when turned off or not today. */
export function cardioToday(program: Schemas['Program'], day: string): number | null {
  const cardio = program.cardio;
  if (cardio === undefined || cardio.sessionsPerWeek === 0) return null;
  const weekday = weekdayOf(day);
  return cardio.sessions.some((s) => s.weekday === weekday) ? cardio.minutes : null;
}
