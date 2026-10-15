/**
 * A session the server has open that this phone does not (K-999, ADR-075 #5, Ek 6: another phone, or the app installed
 * again; `WeekSession.workout.state = OPEN`). Nothing is decided here: the sets, the start and the program day are the
 * server's (`GET /v1/workouts/{id}`), and once the phone keeps them the session is any other the phone continues.
 *
 * Kept on the phone, the workout and its sets are the phone's own records under the clientIds the server has (the
 * workout's and every set's, which the server sends back), already SYNCED with the server's ids: the queue sends only
 * what is logged from now on, never a set the server has. The records go in with the queue held (SyncQueue.exclusive), so
 * no send starts between a record being written and being marked as the server's. Kept twice, or after a try that stopped
 * half way, it adds what is missing and never doubles. The pause is not the server's to know (it learns it at the finish,
 * WorkoutFinish.pausedSeconds), so the session opens running.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { SyncQueue } from '@/sync/queue';
import type { RecordStore } from '@/sync/store';
import { load } from '@/today/today';

type Schemas = components['schemas'];

/** `closed`: the server has ended it meanwhile; `gone`: it has it no more (discarded elsewhere). Neither is kept. */
export type Continued = { kind: 'opened' } | { kind: 'closed' } | { kind: 'gone' } | { kind: 'offline' } | { kind: 'failed' };
export type Discarded = { kind: 'done' } | { kind: 'offline' } | { kind: 'failed' };

type Deps = { api: Pick<ApiClient, 'GET'>; adopt: (workout: Schemas['Workout']) => Promise<void> };

/** Continue: the server's workout with its sets, kept on the phone; the session screen then opens it as any under way. */
export async function continueOpen({ api, adopt }: Deps, workoutId: string): Promise<Continued> {
  const read = await load(() => api.GET('/v1/workouts/{id}', { params: { path: { id: workoutId } } }));
  if (read.state === 'none') return { kind: 'gone' };
  if (read.state !== 'ready') return { kind: read.state === 'failed' && read.problem === 'NoConnection' ? 'offline' : 'failed' };
  // An end it has: the server closed it (K-961) or another phone finished it. Nothing is left to continue.
  if (read.value.endedAt !== undefined) return { kind: 'closed' };
  try {
    await adopt(read.value);
  } catch {
    // The phone's own store, not the network: said as a failure, tried again by Continue (the records kept so far stay).
    return { kind: 'failed' };
  }
  return { kind: 'opened' };
}

/** Discard (K-998): the server deletes the workout and its sets. Gone already is gone, as for a set. */
export async function discardOpen(api: Pick<ApiClient, 'DELETE'>, workoutId: string): Promise<Discarded> {
  let status: number;
  try {
    const { response } = await api.DELETE('/v1/workouts/{id}', { params: { path: { id: workoutId } } });
    status = response.status;
  } catch {
    return { kind: 'offline' };
  }
  return status === 204 || status === 404 ? { kind: 'done' } : { kind: 'failed' };
}

type AdoptDeps = { store: Pick<RecordStore, 'insert' | 'markSynced'>; queue: Pick<SyncQueue, 'exclusive'> };

export function createAdopt({ store, queue }: AdoptDeps) {
  return (workout: Schemas['Workout']): Promise<void> =>
    queue.exclusive(async () => {
      const body: Schemas['NewWorkout'] = {
        clientId: workout.clientId,
        startedAt: workout.startedAt,
        ...(workout.programDayId === undefined ? {} : { programDayId: workout.programDayId }),
      };
      await store.insert({ clientId: workout.clientId, kind: 'workout', parentClientId: null, body });
      await store.markSynced(workout.clientId, workout.id, workout);
      // In the order they were done: the records keep the order they are written in.
      for (const { id, ...set } of workout.sets) {
        await store.insert({ clientId: set.clientId, kind: 'set', parentClientId: workout.clientId, body: set });
        await store.markSynced(set.clientId, id, { ...set, id });
      }
    });
}
