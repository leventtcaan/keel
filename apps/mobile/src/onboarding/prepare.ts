/**
 * Preparing the plan (#ob-preparing; ADR-072 #2, #5, #6; K-967). After the last question: the profile is stored with
 * onboarding still open (profileStatus.store; the health records go to the queue as before, finish.ts), the program the
 * server holds is read and only when there is none is one built for the days (the server's templates) — a program and its
 * starting weights are never replaced, resumed after a restart or tried again —, the starting weights become its first
 * targets — sent only once the program exists, because a program built again drops them —, and the catalog says what each
 * move is (its equipment, for the plan's move images). With the health data consent, where the calories start is asked
 * for too (GET /v1/targets/starting, K-989), after the starting weigh-in queued with the profile is sent, and the first call's
 * day (GET /v1/first-weeks, K-990: the server's, never worked out here). Each line the screen ticks is one of these answers, never a timer (no made-up progress). A step
 * that fails throws by name and is tried again from where it stopped; what went through is not sent again.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { SyncQueue } from '@/sync/queue';
import type { UnitSystem } from '@/units/units';

import type { Draft } from './draft';
import { finishOnboarding } from './finish';
import { type Move, ownMove } from '@/train/trainData';

import { walk } from './flow';
import { weightsToSend } from './weights';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

/** The answers so far. `built`: the program the server holds, before the starting weights go onto it. */
export type Progress = {
  profile?: Schemas['Profile'];
  /** Whether there will be weekly calls: the health data consent (without it, no first call is named). */
  consented?: boolean;
  built?: Schemas['Program'];
  program?: Schemas['Program'];
  /** Where the calories start (GET /v1/targets/starting, K-989); null when the server has none to give: no food row. */
  starting?: Schemas['StartingTarget'] | null;
  /** The first call's day (YYYY-MM-DD, the user's calendar; K-990); null without the consent or when the server names none. */
  firstCall?: string | null;
  /** The plan was shown and the server told so (PUT /v1/profile/plan-seen, K-993): said once while the onboarding stack lives. */
  planSeen?: boolean;
  /** The catalog's moves, and the user's own the program names (by the names they gave them). */
  exercises?: Move[];
};
export type Prepared = Required<Omit<Progress, 'planSeen'>>;

type Options = {
  draft: Draft;
  /** What an earlier try already has — or, resumed after a restart, the profile the server holds. */
  from: Progress;
  /** Each answer, as it comes. */
  onProgress: (progress: Progress) => void;
  api: ApiClient;
  profile: { store: (profile: Schemas['Profile']) => Promise<Schemas['Profile']> };
  queue: Pick<SyncQueue, 'record' | 'drain'>;
  /** The health data consent: the walk's answer, or, resumed, what the phone knows of it. */
  consented: () => Promise<boolean>;
  /** The user's own moves as this phone kept them at the import (trainData); none kept: null. */
  keptOwn: () => Promise<Move[] | null>;
  /** A problem, by name only (V3). */
  report: (problem: { name: string }) => void;
  units: UnitSystem;
  now: Date;
  timeZone: string;
};

type Answer<T> = { data?: T; response: Response };

/** By name, so the screen tells no connection from a server that answered with an error (V3: never the server's words). */
const failure = (name: 'NoConnection' | 'ServerError' | 'ProgramMissing') =>
  Object.assign(new Error(`preparing the plan: ${name}`), { name });

/** The answer's data; none for the statuses that mean "none" (`none`); anything else throws by name. */
async function answer<T>(request: () => Promise<Answer<T>>): Promise<T>;
async function answer<T>(request: () => Promise<Answer<T>>, none: readonly number[]): Promise<T | null>;
async function answer<T>(request: () => Promise<Answer<T>>, none: readonly number[] = []): Promise<T | null> {
  let got: Answer<T>;
  try {
    got = await request();
  } catch {
    throw failure('NoConnection');
  }
  if (got.data !== undefined) return got.data;
  if (none.includes(got.response.status)) return null;
  throw failure('ServerError');
}

/** No program yet. */
const NO_PROGRAM = [404] as const;
/** No starting target to show (ADR-072 Ek 1): no consent on the server, no weigh-in in the window, no profile or a plan begun. */
const NO_STARTING_TARGET = [403, 404, 409] as const;
/** No first call to name (ADR-077 Ek 2): no consent on the server, the first weeks over, no profile. */
const NO_FIRST_CALL = [403, 404, 409] as const;

/** The first call's day, the server's (K-990); null when it names none (no consent on the server, the flow over, no profile). Fails by name. */
export async function readFirstCall(api: ApiClient): Promise<string | null> {
  const weeks = await answer(() => api.GET('/v1/first-weeks'), NO_FIRST_CALL);
  return weeks?.firstCallOn ?? null;
}

export async function preparePlan(options: Options): Promise<Prepared> {
  const { draft, from, onProgress, api, profile, queue, consented, keptOwn, report, units, now, timeZone } = options;
  let progress: Progress = { ...from };
  const advance = (next: Progress) => {
    progress = { ...progress, ...next };
    onProgress(progress);
  };

  if (progress.profile === undefined) {
    let stored: Schemas['Profile'] | undefined;
    const keep = { save: async (finished: Schemas['Profile']) => void (stored = await profile.store(finished)) };
    await finishOnboarding({ draft, units, queue, profile: keep, now, timeZone });
    advance({ profile: stored });
  }
  const held = progress.profile!;
  if (progress.consented === undefined) advance({ consented: await consented() });

  if (progress.program === undefined) {
    // The branch is the saved profile's (resumed, the walk's answers are gone). A program brought in was kept at its
    // import (K-968): read, never built over — none is its own failure. Otherwise the program the server holds is kept
    // if one was built (resumed, its starting weights with it); one is built when there is none, or when the program on
    // the server is one brought in and then not chosen ("Build it for me" after an import) — once: a retry after the
    // weights failed sends them onto the same one.
    let program = progress.built;
    if (program === undefined) {
      const own = held.programChoice === 'BRING_MY_OWN';
      const found = await answer(() => api.GET('/v1/program'), NO_PROGRAM);
      if (own && found === null) throw failure('ProgramMissing');
      program =
        own || found?.source === 'GENERATED'
          ? found!
          : await answer(() => api.POST('/v1/program/generate', { body: { trainingDays: held.schedule.trainingDays } }));
      advance({ built: program });
    }
    // Only a walk that asked for them sends them: an answer changed to "just starting" leaves no weights behind.
    const weights = walk(draft).includes('weights') ? weightsToSend(draft.startingWeights, program) : [];
    if (weights.length > 0) program = await answer(() => api.PUT('/v1/program/starting-weights', { body: { weights } }));
    advance({ program });
  }

  if (progress.starting === undefined) {
    // Without the consent the server refuses it, and there are no calls: no food row. With it, the starting weight queued
    // with the profile goes first (the target needs a weigh-in); a queue that cannot send now only means no row.
    let starting: Schemas['StartingTarget'] | null = null;
    if (progress.consented === true) {
      // Not sent now (offline): said by name, as the queue's own background drain does; the target is asked all the same.
      await queue.drain().catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
      starting = await answer(() => api.GET('/v1/targets/starting'), NO_STARTING_TARGET);
    }
    advance({ starting });
  }

  if (progress.firstCall === undefined) {
    // Without the consent there are no calls. The day is the server's, from the day onboarding finished (the profile's save).
    advance({ firstCall: progress.consented === true ? await readFirstCall(api) : null });
  }

  if (progress.exercises === undefined) {
    const catalog: Move[] = await answer(() => api.GET('/v1/exercises'));
    // The user's own moves only when the program names a move the catalog has not: by their names, never their ids.
    const known = new Set(catalog.map((move) => move.id));
    const named = progress.program!.days.some((day) => day.exercises.some((move) => !known.has(move.exerciseId)));
    const own = named ? await ownMoves() : [];
    advance({ exercises: [...catalog, ...own] });
  }
  return progress as Prepared;

  /** The user's own moves from the server; not read, the copy kept at the import; neither, the read's failure. */
  async function ownMoves(): Promise<Move[]> {
    try {
      return (await answer(() => api.GET('/v1/custom-exercises'))).map(ownMove);
    } catch (error) {
      const kept = await keptOwn();
      if (kept === null) throw error;
      return kept;
    }
  }
}
/**
 * The lines of #ob-preparing done, in their order: the program; its cardio and the food (the starting target's answer,
 * or none to show); then the first call — its day the server's (firstCallDay) — or the first workout, once the catalog has
 * named its moves.
 */
export function linesDone({ profile, program, starting, exercises }: Progress): number {
  if (profile === undefined || program === undefined) return 0;
  if (starting === undefined) return 1;
  return exercises === undefined ? 2 : 3;
}

const WEEK: readonly Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Today on the user's calendar: its date (YYYY-MM-DD) and its weekday. */
function today(now: Date, timeZone: string): { day: string; weekday: number } {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
  return { day, weekday: new Date(`${day}T00:00:00Z`).getUTCDay() };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The days from today on the user's calendar to `day` (the server's first call): 0 today, 1 tomorrow. Counted, not decided. */
export function daysTo(day: string, now: Date, timeZone: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today(now, timeZone).day}T00:00:00Z`)) / DAY_MS);
}

/**
 * #ob-preparing's first call (K-990): the server's day once it came — today when it is today or went by (a resumed
 * onboarding: the check-in is open), else its weekday; before the answer, the profile's check-in day, the day the server
 * names for a walk ended now; null when the server names none (the first workout is said instead).
 */
export function firstCallDay(firstCall: string | null | undefined, checkInDay: Weekday, now: Date, timeZone: string): Weekday | 'TODAY' | null {
  if (firstCall === undefined) return checkInDay;
  if (firstCall === null) return null;
  return daysTo(firstCall, now, timeZone) <= 0 ? 'TODAY' : WEEK[new Date(`${firstCall}T00:00:00Z`).getUTCDay()];
}

/** The first workout: the program's soonest day from today on, today included; a program without weekdays, its first day. */
export function firstWorkout(program: Schemas['Program'], now: Date, timeZone: string): { day: Schemas['ProgramDay']; inDays: number | null } {
  const { weekday } = today(now, timeZone);
  const placed = program.days
    .filter((d) => d.weekday !== undefined)
    .map((d) => ({ day: d, inDays: (WEEK.indexOf(d.weekday!) - weekday + 7) % 7 }))
    .sort((a, b) => a.inDays - b.inDays);
  return placed[0] ?? { day: program.days[0], inDays: null };
}
