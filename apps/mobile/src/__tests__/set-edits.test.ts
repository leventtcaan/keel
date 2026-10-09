/**
 * A set corrected or deleted in the session (K-972, #520 review), on the real record store and the real queue: a set
 * whose send was tried never changes in place (the server may have it); it is deleted there and sent again as a new set
 * in its old place. Never two versions of one set, never a set lost.
 */
import type { components } from '@/api/schema';
import { NoAnswer, type Outbound, type SendResult, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';
import { createSetEdits } from '@/train/setEdits';

import { nodeSqlite } from './support/nodeSqlite';

type NewSet = components['schemas']['NewSet'];

const set = (clientId: string, reps: number): NewSet => ({ clientId, exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps, rir: 1, side: 'BOTH' });

/** A server whose answers wait until let through, and that can be offline. */
function server() {
  const stored = new Map<string, Outbound>();
  const deleted: string[] = [];
  let gate: Promise<void> = Promise.resolve();
  let release: () => void = () => undefined;
  let online = true;
  let loseNextAnswer = false;
  return {
    stored,
    deleted,
    hold: () => {
      gate = new Promise((resolve) => (release = resolve));
    },
    letThrough: () => release(),
    offline: (off: boolean) => {
      online = !off;
    },
    loseNextAnswer: () => {
      loseNextAnswer = true;
    },
    send: async (record: Outbound): Promise<SendResult> => {
      await gate;
      if (!online) throw new NoAnswer('offline');
      const id = `srv-${record.kind === 'finish' ? record.clientId : record.body.clientId}`;
      stored.set(id, record);
      if (loseNextAnswer) {
        loseNextAnswer = false;
        throw new NoAnswer('answer lost');
      }
      return { status: 201, id, body: { id } };
    },
    deleteSet: async (_workout: string, setId: string) => {
      if (!online) throw new TypeError('Network request failed');
      stored.delete(setId);
      deleted.push(setId);
    },
  };
}

async function setup() {
  const store = await openRecordStore(nodeSqlite());
  const api = server();
  const queue = createSyncQueue({ store, send: api.send, report: () => undefined });
  let n = 0;
  const edits = createSetEdits({ store, queue, deleteWorkoutOnServer: async () => undefined, deleteOnServer: api.deleteSet, newClientId: () => `new-${++n}` });
  await queue.record({ kind: 'workout', body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
  await queue.drain();
  return { store, api, queue, edits };
}

const sets = async (store: Awaited<ReturnType<typeof openRecordStore>>) =>
  (await store.all()).filter((r) => r.kind === 'set').map((r) => ({ clientId: r.clientId, reps: (r.body as NewSet).reps, state: r.state }));

test('never tried: changed in its place, its order kept, nothing on the server', async () => {
  const { store, api, queue, edits } = await setup();
  await store.insert({ clientId: 'b', kind: 'set', parentClientId: 'w', body: set('b', 8) });
  await store.insert({ clientId: 'c', kind: 'set', parentClientId: 'w', body: set('c', 8) });
  await edits.change('b', set('b', 9));
  await queue.drain();
  expect(await sets(store)).toEqual([
    { clientId: 'b', reps: 9, state: 'SYNCED' },
    { clientId: 'c', reps: 8, state: 'SYNCED' },
  ]);
  expect(api.deleted).toEqual([]);
});

test('its send under way: corrected after it lands, on the server and in its place; never two versions', async () => {
  const { store, api, queue, edits } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await store.insert({ clientId: 'b', kind: 'set', parentClientId: 'w', body: set('b', 8) });
  api.hold();
  const sending = queue.drain(); // 'a' is on its way
  await new Promise((resolve) => setTimeout(resolve, 0));
  const correcting = edits.change('a', set('a', 9));
  api.letThrough();
  await sending;
  await correcting;
  await queue.drain();
  expect(api.deleted).toEqual(['srv-a']);
  expect(await sets(store)).toEqual([
    { clientId: 'new-1', reps: 9, state: 'SYNCED' }, // in the old set's place, before b
    { clientId: 'b', reps: 8, state: 'SYNCED' },
  ]);
  expect([...api.stored.keys()].filter((id) => id !== 'srv-w').sort()).toEqual(['srv-b', 'srv-new-1']);
});

test('its send under way: deleted after it lands; no ghost left on the server', async () => {
  const { store, api, queue, edits } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  api.hold();
  const sending = queue.drain();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const deleting = edits.change('a', null);
  api.letThrough();
  await sending;
  await deleting;
  expect(api.deleted).toEqual(['srv-a']);
  expect(await sets(store)).toEqual([]);
  expect(api.stored.has('srv-a')).toBe(false);
});

test('its answer lost: sent again first (the same clientId, the stored copy), then corrected on the server', async () => {
  const { store, api, queue, edits } = await setup();
  api.loseNextAnswer();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await queue.drain();
  expect((await store.find('a'))?.state).toBe('PENDING'); // tried, the server has it, the phone does not know
  await edits.change('a', set('a', 10));
  expect(api.deleted).toEqual(['srv-a']);
  await queue.drain();
  expect(await sets(store)).toEqual([{ clientId: 'new-1', reps: 10, state: 'SYNCED' }]);
});

test('offline, a set tried: nothing changes here, and it says so (NoAnswer)', async () => {
  const { store, api, queue, edits } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await queue.drain();
  api.offline(true);
  await expect(edits.change('a', set('a', 9))).rejects.toThrow(TypeError);
  expect(await sets(store)).toEqual([{ clientId: 'a', reps: 8, state: 'SYNCED' }]);
  api.loseNextAnswer();
  await store.insert({ clientId: 'b', kind: 'set', parentClientId: 'w', body: set('b', 8) });
  api.offline(false);
  await queue.drain();
  api.offline(true);
  await expect(edits.change('b', null)).rejects.toBeInstanceOf(NoAnswer);
  expect((await sets(store)).map((s) => s.clientId)).toEqual(['a', 'b']);
});

test('a delete on the server that fails: the corrected record goes, the old one stays as it was', async () => {
  const { store, api, queue, edits } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await queue.drain();
  const failing = createSetEdits({
    store,
    queue,
    deleteWorkoutOnServer: async () => undefined,
    deleteOnServer: async () => {
      throw new Error('500');
    },
    newClientId: () => 'new-x',
  });
  await expect(failing.change('a', set('a', 9))).rejects.toThrow('500');
  expect(await sets(store)).toEqual([{ clientId: 'a', reps: 8, state: 'SYNCED' }]);
  expect(api.deleted).toEqual([]);
  void edits;
});

test('a set deleted and brought back is in its place again, under a new clientId', async () => {
  const { store, queue, edits } = await setup();
  for (const id of ['a', 'b', 'c']) await store.insert({ clientId: id, kind: 'set', parentClientId: 'w', body: set(id, 8) });
  await queue.drain();
  const gone = await edits.change('b', null);
  expect(gone).not.toBeNull();
  if (gone !== null) await edits.restore(gone);
  await queue.drain();
  expect((await sets(store)).map((s) => s.clientId)).toEqual(['a', 'new-1', 'c']);
});

/** A delete on the server that waits until let through, then succeeds or fails. */
function heldDelete() {
  let settle: (failed: boolean) => void = () => undefined;
  const calls: string[] = [];
  return {
    calls,
    deleteOnServer: (_workout: string, setId: string) => {
      calls.push(setId);
      return new Promise<void>((resolve, reject) => {
        settle = (failed) => (failed ? reject(new Error('500')) : resolve());
      });
    },
    finish: (failed: boolean) => settle(failed),
  };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('held: a drain asked for during the delete (the app back in front) sends nothing; the delete failing leaves the old set alone', async () => {
  const { store, api, queue } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await queue.drain();
  const sentBefore = api.stored.size;
  const held = heldDelete();
  const edits = createSetEdits({ store, queue, deleteWorkoutOnServer: async () => undefined, deleteOnServer: held.deleteOnServer, newClientId: () => 'new-1' });
  const correcting = edits.change('a', set('a', 9));
  await tick();
  expect(held.calls).toEqual(['srv-a']);
  await queue.drain();
  expect(api.stored.size).toBe(sentBefore);
  held.finish(true);
  await expect(correcting).rejects.toThrow('500');
  await queue.drain();
  expect(await sets(store)).toEqual([{ clientId: 'a', reps: 8, state: 'SYNCED' }]);
  expect([...api.stored.keys()].filter((id) => id !== 'srv-w')).toEqual(['srv-a']);
});

test('two holders take turns: the second starts only once the first is done', async () => {
  const { store, queue } = await setup();
  for (const id of ['a', 'b']) await store.insert({ clientId: id, kind: 'set', parentClientId: 'w', body: set(id, 8) });
  await queue.drain();
  const held = heldDelete();
  let n = 0;
  const edits = createSetEdits({ store, queue, deleteWorkoutOnServer: async () => undefined, deleteOnServer: held.deleteOnServer, newClientId: () => `new-${++n}` });
  const first = edits.change('a', set('a', 9));
  const second = edits.change('b', null);
  await tick();
  expect(held.calls).toEqual(['srv-a']); // b waits for a
  held.finish(false);
  await first;
  await tick();
  expect(held.calls).toEqual(['srv-a', 'srv-b']);
  held.finish(false);
  await second;
  expect((await sets(store)).map((x) => x.reps)).toEqual([9]);
});

test('a holder that fails does not hold up the next', async () => {
  const { store, queue } = await setup();
  await expect(queue.exclusive(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  await expect(queue.exclusive(async () => 'next')).resolves.toBe('next');
  void store;
});

test('the old set gone and the corrected one in its place in one step: never two copies of it at any moment', async () => {
  const { store, queue } = await setup();
  for (const id of ['a', 'b']) await store.insert({ clientId: id, kind: 'set', parentClientId: 'w', body: set(id, 8) });
  await queue.drain();
  const seen: string[][] = [];
  const edits = createSetEdits({
    store,
    queue,
    deleteWorkoutOnServer: async () => undefined,
    // While the server deletes it, the phone still has the old set only: no new copy is written before.
    deleteOnServer: async () => {
      seen.push((await sets(store)).map((x) => x.clientId));
    },
    newClientId: () => 'new-1',
  });
  await edits.change('a', set('a', 9));
  expect(seen).toEqual([['a', 'b']]);
  expect(await sets(store)).toEqual([
    { clientId: 'new-1', reps: 9, state: 'PENDING' },
    { clientId: 'b', reps: 8, state: 'SYNCED' },
  ]);
});

test('a set the server refused is not "offline": it fails as it is', async () => {
  const { store, queue, edits } = await setup();
  await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
  await store.markAttempted('a');
  await store.markRejected('a', 'VALIDATION_FAILED');
  await expect(edits.change('a', set('a', 9))).rejects.toMatchObject({ name: 'Refused' });
  void queue;
});

describe('a workout discarded (K-972, K-998): on the server once it may be there, then the phone in one step', () => {
  async function withDiscard() {
    const store = await openRecordStore(nodeSqlite());
    const api = server();
    const queue = createSyncQueue({ store, send: api.send, report: () => undefined });
    const deletedWorkouts: string[] = [];
    let offlineDelete = false;
    const edits = createSetEdits({
      store,
      queue,
      deleteOnServer: api.deleteSet,
      deleteWorkoutOnServer: async (id) => {
        if (offlineDelete) throw new TypeError('Network request failed');
        deletedWorkouts.push(id);
      },
      newClientId: () => 'new-1',
    });
    return { store, api, queue, edits, deletedWorkouts, goOffline: () => (offlineDelete = true) };
  }

  test('never sent: gone from the phone, nothing asked of the server', async () => {
    const { store, queue, edits, deletedWorkouts } = await withDiscard();
    await store.insert({ clientId: 'w', kind: 'workout', parentClientId: null, body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
    await edits.discard('w');
    await queue.drain();
    expect(await store.all()).toEqual([]);
    expect(deletedWorkouts).toEqual([]);
  });

  test('its send under way: deleted on the server after it lands; nothing left on either side', async () => {
    const { store, api, queue, edits, deletedWorkouts } = await withDiscard();
    await store.insert({ clientId: 'w', kind: 'workout', parentClientId: null, body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
    api.hold();
    const sending = queue.drain();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const discarding = edits.discard('w');
    api.letThrough();
    await sending;
    await discarding;
    expect(deletedWorkouts).toEqual(['srv-w']);
    expect(await store.all()).toEqual([]);
  });

  // Through the queue's own record(): it tries a send at once, so a workout the phone kept is "tried" from that moment,
  // reachable or not. Never tried is only a record stored and not yet sent (the app closed in between), not a state a
  // session reaches by being offline (#527 review).
  test('recorded offline through the queue: the send was tried, so Discard needs the connection and changes nothing', async () => {
    const { store, api, queue, edits } = await withDiscard();
    api.offline(true);
    await queue.record({ kind: 'workout', body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await queue.record({ kind: 'set', workoutClientId: 'w', body: set('a', 8) });
    await queue.drain();
    expect((await store.all()).map((r) => [r.clientId, r.state, r.attempted])).toEqual([
      ['w', 'PENDING', true],
      ['a', 'PENDING', false],
    ]);
    await expect(edits.discard('w')).rejects.toBeInstanceOf(NoAnswer);
    expect((await store.all()).map((r) => r.clientId)).toEqual(['w', 'a']);
  });

  test('recorded offline, back online: sent first, then deleted on the server, then gone here', async () => {
    const { store, api, queue, edits, deletedWorkouts } = await withDiscard();
    api.offline(true);
    await queue.record({ kind: 'workout', body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await queue.record({ kind: 'set', workoutClientId: 'w', body: set('a', 8) });
    await queue.drain();
    api.offline(false);
    await edits.discard('w');
    expect(deletedWorkouts).toEqual(['srv-w']);
    expect(await store.all()).toEqual([]);
  });

  test('recorded online through the queue: deleted on the server, gone here, its sets with it', async () => {
    const { store, queue, edits, deletedWorkouts } = await withDiscard();
    await queue.record({ kind: 'workout', body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await queue.record({ kind: 'set', workoutClientId: 'w', body: set('a', 8) });
    await queue.drain();
    await edits.discard('w');
    expect(deletedWorkouts).toEqual(['srv-w']);
    expect(await store.all()).toEqual([]);
  });

  test('a workout the server refused: gone from the phone only, nothing to delete there', async () => {
    const { store, queue, edits, deletedWorkouts } = await withDiscard();
    await store.insert({ clientId: 'w', kind: 'workout', parentClientId: null, body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await store.insert({ clientId: 'a', kind: 'set', parentClientId: 'w', body: set('a', 8) });
    await store.markAttempted('w');
    await store.markRejected('w', 'VALIDATION_FAILED');
    await edits.discard('w');
    await queue.drain();
    expect(deletedWorkouts).toEqual([]);
    expect(await store.all()).toEqual([]);
  });

  test('offline once it may be on the server: nothing changes here (a connection is needed)', async () => {
    const { store, queue, edits, goOffline } = await withDiscard();
    await store.insert({ clientId: 'w', kind: 'workout', parentClientId: null, body: { clientId: 'w', startedAt: '2026-10-09T18:00:00Z' } });
    await queue.drain();
    goOffline();
    await expect(edits.discard('w')).rejects.toThrow(TypeError);
    expect((await store.all()).map((r) => r.clientId)).toEqual(['w']);
  });
});
