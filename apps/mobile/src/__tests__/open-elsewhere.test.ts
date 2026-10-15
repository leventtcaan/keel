/**
 * A session the server has open that this phone does not (K-999, ADR-075 #5, Ek 6; another phone, or the app installed
 * again). Continue reads it (GET /v1/workouts/{id}) and the phone keeps it as its own: the server's workout and sets under
 * the clientIds the server has, already SYNCED, so only what is logged from now on is sent. Discard is the server's
 * delete (K-998). The records run on real SQL (node:sqlite) with the real queue.
 */
import type { components } from '@/api/schema';
import { type Outbound, type SendResult, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';
import { continueOpen, createAdopt, discardOpen } from '@/train/openSession';
import { createSetEdits } from '@/train/setEdits';
import { activeWorkout } from '@/train/workout';

import { nodeSqlite } from './support/nodeSqlite';

type Schemas = components['schemas'];

const WORKOUT: Schemas['Workout'] = {
  id: 'srv-w',
  clientId: 'other-phone-w',
  startedAt: '2026-12-25T08:00:00Z',
  programDayId: 'c',
  pausedSeconds: 0,
  sets: [
    { id: 'srv-s1', clientId: 'other-phone-s1', exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8, rir: 2, side: 'BOTH' },
    { id: 'srv-s2', clientId: 'other-phone-s2', exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 7, rir: 1, side: 'BOTH', note: 'felt heavy' },
  ],
};

async function setup() {
  const store = await openRecordStore(nodeSqlite());
  const sent: { kind: string; clientId: string; parent: string | null }[] = [];
  const send = jest.fn(async (record: Outbound, parent: string | null): Promise<SendResult> => {
    const clientId = record.kind === 'finish' ? record.clientId : record.body.clientId;
    sent.push({ kind: record.kind, clientId, parent });
    return { status: 201, id: `new-${sent.length}`, body: record.body };
  });
  const queue = createSyncQueue({ store, send, report: () => {} });
  return { store, queue, sent, adopt: createAdopt({ store, queue }) };
}

describe('the server\'s open workout kept on the phone', () => {
  test("the workout and its sets are the phone's own, in the order they were done, under the server's clientIds", async () => {
    const { store, adopt } = await setup();
    await adopt(WORKOUT);
    const records = await store.all();
    const open = activeWorkout(records);
    expect(open).toEqual({
      clientId: 'other-phone-w',
      startedAt: '2026-12-25T08:00:00Z',
      programDayId: 'c',
      sets: [
        { clientId: 'other-phone-s1', exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8, rir: 2, side: 'BOTH' },
        { clientId: 'other-phone-s2', exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 7, rir: 1, side: 'BOTH', note: 'felt heavy' },
      ],
    });
    // The server has all of it: SYNCED with its ids, nothing waits to be sent.
    expect(records.map((r) => [r.kind, r.state, r.serverId])).toEqual([
      ['workout', 'SYNCED', 'srv-w'],
      ['set', 'SYNCED', 'srv-s1'],
      ['set', 'SYNCED', 'srv-s2'],
    ]);
    expect(await store.pendingCount()).toBe(0);
  });

  test('the next set is sent under the server\'s workout, and the sets the server has are never sent again', async () => {
    const { queue, sent, adopt } = await setup();
    await adopt(WORKOUT);
    await queue.record({ kind: 'set', workoutClientId: 'other-phone-w', body: { clientId: 'new-set', exerciseId: 'squat', setType: 'WORKING', loadKg: 82.5, reps: 6, rir: 1 } });
    await queue.drain();
    expect(sent).toEqual([{ kind: 'set', clientId: 'new-set', parent: 'srv-w' }]);
  });

  test('a finish after it goes to the server\'s workout too', async () => {
    const { queue, sent, adopt } = await setup();
    await adopt(WORKOUT);
    await queue.record({ kind: 'finish', clientId: 'fin', workoutClientId: 'other-phone-w', body: { endedAt: '2026-12-25T09:00:00Z', uncleanExerciseIds: [] } });
    await queue.drain();
    expect(sent).toEqual([{ kind: 'finish', clientId: 'fin', parent: 'srv-w' }]);
  });

  test('kept twice is kept once; a set the phone already has is not doubled, and one it lacks is added', async () => {
    const { store, adopt } = await setup();
    await adopt({ ...WORKOUT, sets: [WORKOUT.sets[0]] });
    await adopt(WORKOUT);
    await adopt(WORKOUT);
    const records = await store.all();
    expect(records.filter((r) => r.kind === 'workout')).toHaveLength(1);
    expect(records.filter((r) => r.kind === 'set').map((r) => r.clientId)).toEqual(['other-phone-s1', 'other-phone-s2']);
    expect(records.every((r) => r.state === 'SYNCED')).toBe(true);
  });

  test("a workout without a program day (a free one) is kept without one", async () => {
    const { store, adopt } = await setup();
    const { programDayId: _day, ...free } = WORKOUT;
    await adopt(free);
    expect(activeWorkout(await store.all())?.programDayId).toBeNull();
  });
});

describe('Continue', () => {
  const answer = (data: unknown, status = 200) => ({ data: status === 200 ? data : undefined, error: status === 200 ? undefined : { code: 'X' }, response: new Response(null, { status }) });
  const api = (get: () => Promise<unknown>) => ({ GET: jest.fn(get) }) as unknown as Parameters<typeof continueOpen>[0]['api'] & { GET: jest.Mock };

  test('reads the workout with its sets and keeps it on the phone', async () => {
    const adopt = jest.fn(async () => {});
    const server = api(async () => answer(WORKOUT));
    expect(await continueOpen({ api: server, adopt }, 'srv-w')).toEqual({ kind: 'opened' });
    expect(server.GET).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'srv-w' } } });
    expect(adopt).toHaveBeenCalledWith(WORKOUT);
  });

  test('a workout the server has closed meanwhile (an end) is not kept: nothing to continue', async () => {
    const adopt = jest.fn(async () => {});
    const server = api(async () => answer({ ...WORKOUT, endedAt: '2026-12-25T09:00:00Z' }));
    expect(await continueOpen({ api: server, adopt }, 'srv-w')).toEqual({ kind: 'closed' });
    expect(adopt).not.toHaveBeenCalled();
  });

  test('a workout the server no longer has (discarded elsewhere) is gone', async () => {
    const adopt = jest.fn(async () => {});
    expect(await continueOpen({ api: api(async () => answer(null, 404)), adopt }, 'srv-w')).toEqual({ kind: 'gone' });
    expect(adopt).not.toHaveBeenCalled();
  });

  test('no connection is offline; any other refusal is a failure; neither keeps anything', async () => {
    const adopt = jest.fn(async () => {});
    expect(await continueOpen({ api: api(async () => Promise.reject(new TypeError('Network request failed'))), adopt }, 'srv-w')).toEqual({ kind: 'offline' });
    expect(await continueOpen({ api: api(async () => answer(null, 500)), adopt }, 'srv-w')).toEqual({ kind: 'failed' });
    expect(adopt).not.toHaveBeenCalled();
  });

  test("the phone's own store failing is a failure, not a connection problem", async () => {
    const adopt = jest.fn(async () => Promise.reject(new Error('disk full')));
    expect(await continueOpen({ api: api(async () => answer(WORKOUT)), adopt }, 'srv-w')).toEqual({ kind: 'failed' });
  });

  test('the queue held by another holder does not lose the workout: it is kept when its turn comes', async () => {
    const { store, queue, adopt } = await setup();
    let release: () => void = () => {};
    const holding = queue.exclusive(() => new Promise<void>((resolve) => (release = resolve)));
    const kept = adopt(WORKOUT);
    await Promise.resolve();
    expect(await store.all()).toEqual([]);
    release();
    await holding;
    await kept;
    expect((await store.all()).map((r) => r.kind)).toEqual(['workout', 'set', 'set']);
  });
});

describe('Discard', () => {
  type Reply = () => Promise<unknown>;
  const answer = (data: unknown, status = 200) => ({ data: status === 200 ? data : undefined, error: status === 200 ? undefined : { code: 'X' }, response: new Response(null, { status }) });
  const server = (read: Reply, remove: Reply = async () => ({ response: { status: 204, ok: true } })) =>
    ({ GET: jest.fn(read), DELETE: jest.fn(remove) }) as unknown as Parameters<typeof discardOpen>[0] & { GET: jest.Mock; DELETE: jest.Mock };

  test("reads the workout first, then deletes the server's workout and its sets", async () => {
    const api = server(async () => answer(WORKOUT));
    expect(await discardOpen(api, 'srv-w')).toEqual({ kind: 'done' });
    expect(api.GET).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'srv-w' } } });
    expect(api.DELETE).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'srv-w' } } });
  });

  test('a card from before the end (the server has it ended: DONE, or closed by itself) deletes nothing: there is no Undo', async () => {
    const api = server(async () => answer({ ...WORKOUT, endedAt: '2026-12-25T09:00:00Z' }));
    expect(await discardOpen(api, 'srv-w')).toEqual({ kind: 'closed' });
    expect(api.DELETE).not.toHaveBeenCalled();
  });

  test('gone already is gone, read or deleted (a repeat, K-998)', async () => {
    const readGone = server(async () => answer(null, 404));
    expect(await discardOpen(readGone, 'srv-w')).toEqual({ kind: 'done' });
    expect(readGone.DELETE).not.toHaveBeenCalled();
    expect(await discardOpen(server(async () => answer(WORKOUT), async () => ({ response: { status: 404, ok: false } })), 'srv-w')).toEqual({ kind: 'done' });
  });

  test('no connection is offline, on the read or on the delete; another refusal is a failure; nothing is deleted unread', async () => {
    const offlineRead = server(async () => Promise.reject(new TypeError('Network request failed')));
    expect(await discardOpen(offlineRead, 'srv-w')).toEqual({ kind: 'offline' });
    expect(offlineRead.DELETE).not.toHaveBeenCalled();
    expect(await discardOpen(server(async () => answer(WORKOUT), async () => Promise.reject(new TypeError('Network request failed'))), 'srv-w')).toEqual({ kind: 'offline' });
    const refusedRead = server(async () => answer(null, 500));
    expect(await discardOpen(refusedRead, 'srv-w')).toEqual({ kind: 'failed' });
    expect(refusedRead.DELETE).not.toHaveBeenCalled();
    expect(await discardOpen(server(async () => answer(WORKOUT), async () => ({ response: { status: 500, ok: false } })), 'srv-w')).toEqual({ kind: 'failed' });
  });
});

describe('kept in one step', () => {
  test('a failure in the middle of the sets keeps nothing: no workout either, so the card still offers Continue', async () => {
    const db = nodeSqlite();
    const store = await openRecordStore(db);
    // A real SQL failure on the second set (a constraint of its own), as a full disk or a killed app would be.
    await db.execAsync(`CREATE TRIGGER refuse_second BEFORE INSERT ON records WHEN NEW.client_id = 'other-phone-s2' BEGIN SELECT RAISE(ABORT, 'disk'); END;`);
    const queue = createSyncQueue({ store, send: async () => ({ status: 500 }), report: () => {} });
    await expect(createAdopt({ store, queue })(WORKOUT)).rejects.toThrow();
    expect(await store.all()).toEqual([]);
    expect(activeWorkout(await store.all())).toBeNull();
    // Tried again once the cause is gone: kept whole.
    await db.execAsync('DROP TRIGGER refuse_second');
    await createAdopt({ store, queue })(WORKOUT);
    expect((await store.all()).map((r) => r.state)).toEqual(['SYNCED', 'SYNCED', 'SYNCED']);
  });
});

describe('a set the server had, corrected or deleted in the session (K-972)', () => {
  async function adopted() {
    const store = await openRecordStore(nodeSqlite());
    const queue = createSyncQueue({ store, send: async (record) => ({ status: 201, id: 'new', body: record.body }), report: () => {} });
    const deleted: [string, string][] = [];
    const edits = createSetEdits({
      store,
      queue,
      newClientId: () => 'fresh',
      deleteOnServer: async (workout, set) => void deleted.push([workout, set]),
      deleteWorkoutOnServer: async () => {},
    });
    await createAdopt({ store, queue })(WORKOUT);
    return { store, edits, deleted };
  }

  test("deleting it deletes the server's set, under the server's workout", async () => {
    const { store, edits, deleted } = await adopted();
    await edits.change('other-phone-s1', null);
    expect(deleted).toEqual([['srv-w', 'srv-s1']]);
    expect((await store.all()).map((r) => r.clientId)).toEqual(['other-phone-w', 'other-phone-s2']);
  });

  test('correcting it deletes the server\'s set and puts the corrected one, new, in its place', async () => {
    const { store, edits, deleted } = await adopted();
    await edits.change('other-phone-s1', { clientId: 'x', exerciseId: 'squat', setType: 'WORKING', loadKg: 85, reps: 8, rir: 2, side: 'BOTH' });
    expect(deleted).toEqual([['srv-w', 'srv-s1']]);
    const records = await store.all();
    expect(records.map((r) => [r.clientId, r.state])).toEqual([
      ['other-phone-w', 'SYNCED'],
      ['fresh', 'PENDING'],
      ['other-phone-s2', 'SYNCED'],
    ]);
    expect((records[1].body as { loadKg: number }).loadKg).toBe(85);
  });
});
