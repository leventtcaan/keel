/**
 * What the workout's end reads (K-974, ADR-075 #7, K-965). The numbers are the server's summary of the workout
 * (`GET /v1/workouts/{id}/summary`: working sets only, a skipped set never counted, the active minutes, the records),
 * so the workout and its finish must be on the server: the queue is drained first, and while either is still on the
 * phone the end is pending (nothing is counted here, offline or not). Beside it: the program, for the record's next
 * target (not from a copy kept offline); this week's sessions done of planned (`/v1/consistency` training; none without
 * it); and the energy an Apple Watch measured over the session's window, read only with both health consents (ADR-074
 * #5, K-959): no watch, no number, never a guess. A workout refused by the server, or not on this phone, is failed:
 * it will never be sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { bothHealthConsents } from '@/health/consent';
import type { LocalRecord } from '@/sync/store';
import { load } from '@/today/today';

import { type Move, type TrainData, movesOf } from './trainData';

type Schemas = components['schemas'];

export type WorkoutEnd =
  | { kind: 'pending' }
  | { kind: 'failed'; problem: 'NoConnection' | 'ServerError' }
  | {
      kind: 'ready';
      summary: Schemas['WorkoutSummary'];
      program: Schemas['Program'] | null;
      programDayId: string | null;
      week: { done: number; planned: number } | null;
      kcal: number | undefined;
      /** The catalog's moves and the user's own, by id: what the summary's exerciseId names. */
      moves: ReadonlyMap<string, Move>;
    };

export type EndDeps = {
  api: Pick<ApiClient, 'GET'>;
  queue: { drain(): Promise<void> };
  workoutRecords(): Promise<LocalRecord[]>;
  training: { read(api: ApiClient): Promise<TrainData>; own(api: ApiClient): Promise<Move[]> };
  health: { readWatchActiveEnergy(from: Date, to: Date): Promise<number | undefined> };
  consents: { granted(kind: 'HEALTH_DATA' | 'APPLE_HEALTH'): Promise<boolean> };
};

export async function loadWorkoutEnd(deps: EndDeps, clientId: string): Promise<WorkoutEnd> {
  // A drain that cannot reach the server leaves the records on the phone: then the end is pending.
  await deps.queue.drain().catch(() => undefined);
  const records = await deps.workoutRecords();
  const workout = records.find((r) => r.kind === 'workout' && r.clientId === clientId);
  const finish = records.find((r) => r.kind === 'finish' && r.parentClientId === clientId);
  // Not on this phone, or refused by the server: it will never be sent, so it is not waited for.
  if (workout === undefined || workout.state === 'REJECTED' || finish?.state === 'REJECTED') return { kind: 'failed', problem: 'ServerError' };
  if (workout.serverId === null || finish === undefined || finish.state !== 'SYNCED') return { kind: 'pending' };
  const id = workout.serverId;
  const body = workout.body as Schemas['NewWorkout'];
  const ended = (finish.body as Schemas['WorkoutFinish']).endedAt;

  const [summary, read, own, consistency, kcal] = await Promise.all([
    load(() => deps.api.GET('/v1/workouts/{id}/summary', { params: { path: { id } } })),
    deps.training.read(deps.api as ApiClient).catch(() => null),
    // The user's own moves are named by them; unread, the end is still shown (a catalog name, else the id as before).
    deps.training.own(deps.api as ApiClient).catch((): Move[] => []),
    load(() => deps.api.GET('/v1/consistency')),
    energy(deps, body.startedAt, ended),
  ]);
  if (summary.state !== 'ready') return { kind: 'failed', problem: summary.state === 'failed' ? summary.problem : 'ServerError' };
  return {
    kind: 'ready',
    summary: summary.value,
    // A copy kept offline may be from before this workout: its next target could be the set just done.
    program: read?.program.state === 'ready' && !read.kept ? read.program.value : null,
    programDayId: body.programDayId ?? null,
    // The week's sessions (training), not every action's; without the consistency (no consent: 403), no week.
    week: consistency.state === 'ready' ? { done: consistency.value.training.done, planned: consistency.value.training.planned } : null,
    kcal,
    moves: movesOf(read, own),
  };
}

async function energy(deps: EndDeps, startedAt: string, endedAt: string): Promise<number | undefined> {
  if (!(await bothHealthConsents(deps.consents).catch(() => false))) return undefined;
  return deps.health.readWatchActiveEnergy(new Date(startedAt), new Date(endedAt)).catch(() => undefined);
}
