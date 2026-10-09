/**
 * What the workout's end reads (K-974, ADR-075 #7, K-965). The numbers are the server's summary of the workout
 * (`GET /v1/workouts/{id}/summary`: working sets only, a skipped set never counted, the active minutes, the records),
 * so the workout and its finish must be on the server: the queue is drained first, and while either is still on the
 * phone the end is pending (nothing is counted here, offline or not). Beside it: the program, for the record's next
 * target; this week's sessions done of planned (`/v1/consistency`); and the energy an Apple Watch measured over the
 * session's window, read only with both health consents (ADR-074 #5, K-959): no watch, no number, never a guess.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { bothHealthConsents } from '@/health/consent';
import type { LocalRecord } from '@/sync/store';
import { load } from '@/today/today';

import type { TrainData } from './trainData';

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
    };

export type EndDeps = {
  api: Pick<ApiClient, 'GET'>;
  queue: { drain(): Promise<void> };
  workoutRecords(): Promise<LocalRecord[]>;
  training: { read(api: ApiClient): Promise<TrainData> };
  health: { readWatchActiveEnergy(from: Date, to: Date): Promise<number | undefined> };
  consents: { granted(kind: 'HEALTH_DATA' | 'APPLE_HEALTH'): Promise<boolean> };
};

export async function loadWorkoutEnd(deps: EndDeps, clientId: string): Promise<WorkoutEnd> {
  // A drain that cannot reach the server leaves the records on the phone: then the end is pending.
  await deps.queue.drain().catch(() => undefined);
  const records = await deps.workoutRecords();
  const workout = records.find((r) => r.kind === 'workout' && r.clientId === clientId);
  const finish = records.find((r) => r.kind === 'finish' && r.parentClientId === clientId && r.state !== 'REJECTED');
  if (workout?.serverId == null || finish === undefined || finish.state !== 'SYNCED') return { kind: 'pending' };
  const id = workout.serverId;
  const body = workout.body as Schemas['NewWorkout'];
  const ended = (finish.body as Schemas['WorkoutFinish']).endedAt;

  const [summary, read, consistency, kcal] = await Promise.all([
    load(() => deps.api.GET('/v1/workouts/{id}/summary', { params: { path: { id } } })),
    deps.training.read(deps.api as ApiClient).catch(() => null),
    load(() => deps.api.GET('/v1/consistency')),
    energy(deps, body.startedAt, ended),
  ]);
  if (summary.state !== 'ready') return { kind: 'failed', problem: summary.state === 'failed' ? summary.problem : 'ServerError' };
  return {
    kind: 'ready',
    summary: summary.value,
    program: read?.program.state === 'ready' ? read.program.value : null,
    programDayId: body.programDayId ?? null,
    week: consistency.state === 'ready' ? { done: consistency.value.done, planned: consistency.value.planned } : null,
    kcal,
  };
}

async function energy(deps: EndDeps, startedAt: string, endedAt: string): Promise<number | undefined> {
  if (!(await bothHealthConsents(deps.consents).catch(() => false))) return undefined;
  return deps.health.readWatchActiveEnergy(new Date(startedAt), new Date(endedAt)).catch(() => undefined);
}
