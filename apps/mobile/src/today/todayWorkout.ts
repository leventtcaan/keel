/**
 * Today's workout on This week (K-969, ADR-077 #1): which card shows, read from what is already known. A workout under way
 * on this phone (its own records, K-405, K-961) comes first; then a workout finished today (the server's list of the
 * day, or the phone's own record whose finish waits to be sent: offline, the session is still done); then this week's
 * session as the server laid it out (Program.week, K-964: today's, its short version, skipped, or moved to another day);
 * a week off; rest. Nothing here decides a session or a date.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { type Move, ownMove } from '@/train/trainData';
import type { ActiveWorkout } from '@/train/workout';

import { type Loaded, load, localDay } from './today';
import { weekdayOf } from './week';

type Schemas = components['schemas'];
type Day = Schemas['ProgramDay'];

export type TodayCard =
  | { kind: 'open'; day: Day | null; sets: number }
  | { kind: 'done'; day: Day | null; workoutId: string | null }
  | { kind: 'session'; day: Day; session: Schemas['WeekSession'] }
  | { kind: 'moved'; day: Day; to: string }
  | { kind: 'skipped'; day: Day }
  | { kind: 'restWeek' }
  | { kind: 'rest' }
  | { kind: 'none' };

/** A workout finished today: the server's (its id), or the phone's own not sent yet (no id until the server has it). */
export type Done = { workoutId: string | null; programDayId: string | null };

type Input = {
  program: Schemas['Program'] | null;
  /** Today on the phone's calendar (the day the server's lists were asked for). */
  day: string;
  active: ActiveWorkout | null;
  doneToday: Done | null;
};

export function todayCardOf({ program, day, active, doneToday }: Input): TodayCard {
  const dayOf = (id: string | null | undefined) => program?.days.find((d) => d.id === id) ?? null;
  if (active !== null) return { kind: 'open', day: dayOf(active.programDayId), sets: active.sets.length };
  if (doneToday !== null) return { kind: 'done', day: dayOf(doneToday.programDayId), workoutId: doneToday.workoutId };
  if (program === null) return { kind: 'none' };
  if (program.restUntil !== undefined && day <= program.restUntil) return { kind: 'restWeek' };
  const week = program.week ?? [];
  const here = week.find((s) => s.date === day);
  const named = here === undefined ? null : dayOf(here.programDayId);
  if (here !== undefined && named !== null) return here.skipped === true ? { kind: 'skipped', day: named } : { kind: 'session', day: named, session: here };
  // Today's own session, moved by the user to another day of the week (the server's date).
  const weekday = weekdayOf(day);
  const away = week.find((s) => s.moved === true && s.date !== day && dayOf(s.programDayId)?.weekday === weekday);
  const awayDay = away === undefined ? null : dayOf(away.programDayId);
  if (away !== undefined && awayDay !== null) return { kind: 'moved', day: awayDay, to: away.date };
  return { kind: 'rest' };
}

/** The last workout of today's list that is finished; one still open is not done (K-961). */
export function finishedToday(workouts: Loaded<Schemas['Workout'][]> | undefined, day: string): Done | null {
  if (workouts?.state !== 'ready') return null;
  const done = workouts.value.filter((w) => w.endedAt !== undefined && localDay(new Date(w.startedAt)) === day).at(-1);
  return done === undefined ? null : { workoutId: done.id, programDayId: done.programDayId ?? null };
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
  /**
   * The first week's food line (prototype foodLine): no day budget yet, the calorie target the plan starts with (K-989),
   * as it is; none when there is a budget, or no starting target either. K-997 brings the first week's budget.
   */
  starting: Loaded<Schemas['StartingTarget']> | null;
  /** The user's check-in day, for a skipped session's line ("Sunday reads what happened"); read only then. */
  checkInDay: Schemas['Weekday'] | null;
};

type Needs = { done: Done | null; withMoves: boolean; budget: Loaded<Schemas['DayBudget']>; skipped: boolean };

/** What today's card and the food line need beyond the week, each read only when it shows. */
export async function loadTodayParts(api: ApiClient, { done, withMoves, budget, skipped }: Needs): Promise<TodayParts> {
  const id = done?.workoutId ?? null;
  const [summary, exercises, own, starting, profile] = await Promise.all([
    id === null ? null : load(() => api.GET('/v1/workouts/{id}/summary', { params: { path: { id } } })),
    withMoves ? load(() => api.GET('/v1/exercises')) : null,
    withMoves ? load(() => api.GET('/v1/custom-exercises')) : null,
    budget.state === 'none' ? load(() => api.GET('/v1/targets/starting')) : null,
    skipped ? load(() => api.GET('/v1/profile')) : null,
  ]);
  const catalog: Move[] = exercises?.state === 'ready' ? exercises.value : [];
  const mine: Move[] = own?.state === 'ready' ? own.value.map(ownMove) : [];
  const checkInDay = profile?.state === 'ready' ? profile.value.schedule.checkInDay : null;
  return { summary, moves: new Map([...catalog, ...mine].map((m) => [m.id, m])), starting, checkInDay };
}

/** Today's cardio minutes, when the program plans a session today (ADR-074); none when turned off or not today. */
export function cardioToday(program: Schemas['Program'], day: string): number | null {
  const cardio = program.cardio;
  if (cardio === undefined || cardio.sessionsPerWeek === 0) return null;
  const weekday = weekdayOf(day);
  return cardio.sessions.some((s) => s.weekday === weekday) ? cardio.minutes : null;
}
