/**
 * Today's workout on This week (K-969, ADR-077 #1): which card shows, read from what is already known. A workout under way
 * on this phone (its own records, K-405, K-961) comes first; then one finished on this phone whose finish may still wait
 * to be sent (offline, the session is still done); then the server's word on today's session (WeekSession.workout,
 * K-995: DONE, or OPEN on another phone); then this week's session as the server laid it out (Program.week, K-964:
 * today's, skipped, or moved to another day, each undoable when the server says so); a week off; rest. Nothing here
 * decides a session or a date. "Today" is still the phone's calendar day the lists were asked for; K-995 Program.today
 * replaces it once K-970's shared helper (src/train/week.ts) reads it.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { type Move, ownMove } from '@/train/trainData';
import { movedOffToday, sessionState } from '@/train/week';
import { activeWorkout } from '@/train/workout';

import { type Loaded, load, localDay } from './today';
import { weekdayOf } from './week';

type Schemas = components['schemas'];
type Day = Schemas['ProgramDay'];

export type TodayCard =
  /** `onPhone`: the workout is on this phone and can be continued here; `sets` its sets so far (unknown when it is not). */
  | { kind: 'open'; day: Day | null; sets: number | null; onPhone: boolean }
  | { kind: 'done'; day: Day | null; workoutId: string | null }
  | { kind: 'session'; day: Day; session: Schemas['WeekSession'] }
  /** `undoable`: the server says today's move or skip can be undone (WeekSession.undoable, K-995). */
  | { kind: 'moved'; day: Day; to: string; undoable: boolean }
  | { kind: 'skipped'; day: Day; undoable: boolean }
  | { kind: 'restWeek' }
  | { kind: 'rest' }
  | { kind: 'none' };

/** A workout finished today: the server's (its id), or the phone's own not sent yet (no id until the server has it). */
export type Done = { workoutId: string | null; programDayId: string | null };

type Input = {
  program: Schemas['Program'] | null;
  /** The phone's own workout records (K-304): a workout under way here, a finish still waiting to be sent. */
  records: LocalRecord[];
  now: Date;
};

/**
 * The card, by the rule the Train card reads (src/train/week.ts › sessionState, K-970, K-995): today is the server's
 * (Program.today); the phone's records come first, the server's word after them. A workout under way on this phone is
 * continued wherever it belongs. Moved off today is the session the server says can still be undone (movedOffToday).
 */
export function todayCardOf({ program, records, now }: Input): TodayCard {
  if (program === null) {
    const active = activeWorkout(records);
    return active === null ? { kind: 'none' } : { kind: 'open', day: null, sets: active.sets.length, onPhone: true };
  }
  const state = sessionState({ program, kept: false, records, now });
  const dayOf = (id: string | null | undefined) => program.days.find((d) => d.id === id) ?? null;
  if (state.onPhone !== null) return { kind: 'open', day: dayOf(state.onPhone.programDayId), sets: state.onPhone.sets.length, onPhone: true };
  const found = state.found;
  if (found !== null && state.status === 'done') {
    // The server's workout once it says DONE; else the phone's own, its server id once it has one (for the summary).
    const server = found.session.workout?.state === 'DONE' ? found.session.workout.id : null;
    return { kind: 'done', day: found.day, workoutId: server ?? finishedOnPhone(records, localDay(now))?.workoutId ?? null };
  }
  if (found !== null && state.status === 'openElsewhere') return { kind: 'open', day: found.day, sets: null, onPhone: false };
  if (program.restUntil !== undefined && state.today <= program.restUntil) return { kind: 'restWeek' };
  if (found !== null) {
    const { session, day } = found;
    return session.skipped === true ? { kind: 'skipped', day, undoable: !state.stale && session.undoable === true } : { kind: 'session', day, session };
  }
  const away = movedOffToday(program);
  if (away !== null) return { kind: 'moved', day: away.day, to: away.session.date, undoable: !state.stale };
  return { kind: 'rest' };
}

/** Records the server took or will take: a refused one is not part of what was done (as train/workout.ts reads them). */
const kept = (record: LocalRecord) => record.state !== 'REJECTED';

/**
 * The newest workout on this phone started today whose finish is kept (sent, or waiting to be): done, even before the
 * server has it. Its server id once it has one, for the summary.
 */
export function finishedOnPhone(records: LocalRecord[], day: string): Done | null {
  const finished = new Set(records.filter((r) => r.kind === 'finish' && kept(r)).map((r) => r.parentClientId));
  const done = records
    .filter((r) => r.kind === 'workout' && kept(r) && finished.has(r.clientId))
    .filter((r) => localDay(new Date((r.body as Schemas['NewWorkout']).startedAt)) === day)
    .sort((a, b) => b.seq - a.seq)[0];
  if (done === undefined) return null;
  return { workoutId: done.serverId, programDayId: (done.body as Schemas['NewWorkout']).programDayId ?? null };
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
