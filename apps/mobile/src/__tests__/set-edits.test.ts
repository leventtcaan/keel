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
  const edits = createSetEdits({ store, queue, deleteOnServer: api.deleteSet, newClientId: () => `new-${++n}` });
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
