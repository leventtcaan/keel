/**
 * Offline-first (K-304, ADR-006, ADR-024). A record is written to the phone's SQLite first, with the clientId it will
 * carry to the server; the queue sends it when there is a connection. Sending the same clientId again is safe: the server
 * stores once and answers the stored record (200). The server's answer replaces the local copy (server wins).
 * The store runs on real SQL here (node:sqlite, the same engine expo-sqlite wraps), not a mock.
 */
import { NoAnswer, type Outbound, type SendResult, type SyncProblem, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';

import { nodeSqlite } from './support/nodeSqlite';

const W = '11111111-1111-4111-8111-111111111111';
const S1 = '22222222-2222-4222-8222-222222222222';
const S2 = '33333333-3333-4333-8333-333333333333';
const WEIGH = '44444444-4444-4444-8444-444444444444';

const weighIn = (clientId = WEIGH): Outbound => ({
  kind: 'weighIn',
  body: { clientId, measuredAt: '2026-09-30T07:00:00+03:00', kg: 81.5, source: 'MANUAL' },
});
const workout: Outbound = { kind: 'workout', body: { clientId: W, startedAt: '2026-09-30T18:00:00+03:00' } };
const set = (clientId: string): Outbound => ({
  kind: 'set',
  workoutClientId: W,
  body: { clientId, exerciseId: 'back-squat', setType: 'WORKING', reps: 5, loadKg: 100 },
});

/** A server that keeps records by clientId like the real one (ADR-024): first 201, then 200 with the stored copy. */
function fakeServer() {
  const stored = new Map<string, { id: string; body: unknown }>();
  let offline = false;
  let nextStatus: number[] = [];
  const calls: { kind: string; clientId: string; parentId?: string }[] = [];
  const send = jest.fn(async (record: Outbound, parentId: string | null): Promise<SendResult> => {
    if (offline) throw new NoAnswer();
    const clientId = record.body.clientId;
    calls.push({ kind: record.kind, clientId, ...(parentId === null ? {} : { parentId }) });
    const forced = nextStatus.shift();
    if (forced !== undefined) return { status: forced, errorCode: 'X' };
    const seen = stored.get(clientId);
    if (seen !== undefined) return { status: 200, id: seen.id, body: seen.body };
    const id = `srv-${stored.size + 1}`;
    const body = { ...record.body, id, serverNote: 'kept' };
    stored.set(clientId, { id, body });
    return { status: 201, id, body };
  });
  return {
    send,
    calls,
    stored,
    goOffline: () => (offline = true),
    goOnline: () => (offline = false),
    answerNext: (...statuses: number[]) => (nextStatus = statuses),
  };
}

async function setup() {
  const store = await openRecordStore(nodeSqlite());
  const server = fakeServer();
  const problems: SyncProblem[] = [];
  const queue = createSyncQueue({ store, send: server.send, report: (p) => problems.push(p) });
  /** Records while offline and lets the drains they start settle, so the test begins with a quiet queue, online. */
  const recordOffline = async (...records: Outbound[]) => {
    server.goOffline();
    for (const record of records) await queue.record(record);
    await queue.drain();
    server.goOnline();
  };
  return { store, server, queue, recordOffline, problems };
}

test('a record is in SQLite, pending, before anything is sent', async () => {
  const { store, server, queue } = await setup();
  server.goOffline();
  await queue.record(weighIn());
  const [row] = await store.all();
  expect(row).toMatchObject({ clientId: WEIGH, kind: 'weighIn', state: 'PENDING' });
  expect(server.calls).toHaveLength(0);
});

test('offline, the record waits; when the connection comes back it is sent once', async () => {
  const { store, server, queue } = await setup();
  server.goOffline();
  await queue.record(weighIn());
  await queue.drain();
  expect((await store.all())[0].state).toBe('PENDING');

  server.goOnline();
  await queue.drain();
  await queue.drain();
  expect(server.calls).toEqual([{ kind: 'weighIn', clientId: WEIGH }]);
  expect((await store.all())[0]).toMatchObject({ state: 'SYNCED', serverId: 'srv-1' });
});

test('a reply lost on the way back: the retry carries the same clientId and gets the stored record, no duplicate', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn());
  // The server stored it, but the answer never arrived:
  server.send.mockImplementationOnce(async (record) => {
    server.stored.set(record.body.clientId, { id: 'srv-1', body: { ...record.body, id: 'srv-1' } });
    throw new NoAnswer();
  });
  await queue.drain();
  expect((await store.all())[0].state).toBe('PENDING');

  await queue.drain();
  expect(server.stored.size).toBe(1);
  expect((await store.all())[0]).toMatchObject({ state: 'SYNCED', serverId: 'srv-1' });
});

test('records go in the order they were made', async () => {
  const { server, queue, recordOffline } = await setup();
  await recordOffline(weighIn('55555555-5555-4555-8555-555555555555'), weighIn('66666666-6666-4666-8666-666666666666'), weighIn('77777777-7777-4777-8777-777777777777'));
  await queue.drain();
  expect(server.calls.map((c) => c.clientId.slice(0, 1))).toEqual(['5', '6', '7']);
});

test('two drains at once send each record once', async () => {
  const { server, queue, recordOffline } = await setup();
  await recordOffline(weighIn(), workout);
  await Promise.all([queue.drain(), queue.drain(), queue.drain()]);
  expect(server.calls).toHaveLength(2);
});

test('a record made just as a drain finds the queue empty is still sent by that drain', async () => {
  const { store, server } = await setup();
  // Hold the drain at the moment it has found nothing left, before it ends:
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const held = {
    ...store,
    nextPending: async () => {
      const next = await store.nextPending();
      if (next === null) await gate;
      return next;
    },
  };
  const queue = createSyncQueue({ store: held, send: server.send, report: () => {} });
  const running = queue.drain();
  await new Promise((r) => setTimeout(r, 0));
  await queue.record(weighIn());
  release();
  await running;
  expect(server.calls).toEqual([{ kind: 'weighIn', clientId: WEIGH }]);
});

test('server wins: its answer replaces the local copy', async () => {
  const { store, queue } = await setup();
  await queue.record(weighIn());
  await queue.drain();
  expect((await store.all())[0].serverBody).toMatchObject({ id: 'srv-1', serverNote: 'kept' });
});

test('a record the server refuses (4xx) is kept, marked, and does not block the ones after it', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn('55555555-5555-4555-8555-555555555555'), weighIn('66666666-6666-4666-8666-666666666666'));
  server.answerNext(400);
  await queue.drain();
  const rows = await store.all();
  expect(rows.map((r) => r.state)).toEqual(['REJECTED', 'SYNCED']);
  expect(rows[0].errorCode).toBe('X');
});

test.each([401, 408, 429, 500, 503])('a passing failure (%i) stops the drain and keeps the record queued', async (status) => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn('55555555-5555-4555-8555-555555555555'), weighIn('66666666-6666-4666-8666-666666666666'));
  server.answerNext(status);
  await queue.drain();
  expect((await store.all()).map((r) => r.state)).toEqual(['PENDING', 'PENDING']);
  expect(server.calls).toHaveLength(1);
});

test('sets of a workout started offline go after the workout, to its server id', async () => {
  const { server, queue, recordOffline } = await setup();
  await recordOffline(workout, set(S1), set(S2));
  await queue.drain();
  expect(server.calls).toEqual([
    { kind: 'workout', clientId: W },
    { kind: 'set', clientId: S1, parentId: 'srv-1' },
    { kind: 'set', clientId: S2, parentId: 'srv-1' },
  ]);
});

test('a set whose workout was refused is refused too, without asking the server', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(workout, set(S1));
  server.answerNext(400);
  await queue.drain();
  expect((await store.all()).map((r) => [r.kind, r.state, r.errorCode])).toEqual([
    ['workout', 'REJECTED', 'X'],
    ['set', 'REJECTED', 'PARENT_REJECTED'],
  ]);
  expect(server.calls).toHaveLength(1);
});

test('a set cannot be recorded before its workout', async () => {
  const { queue } = await setup();
  await expect(queue.record(set(S1))).rejects.toThrow(/before the record it belongs to/);
});

test('recording the same clientId twice keeps one record', async () => {
  const { store, server, queue } = await setup();
  server.goOffline();
  await queue.record(weighIn());
  await queue.record(weighIn());
  expect(await store.all()).toHaveLength(1);
});

test('a record saved in the last moments of a drain is still sent (every microtask of the ending)', async () => {
  for (let k = 0; k <= 40; k++) {
    const { server, queue } = await setup();
    const running = queue.drain();
    for (let i = 0; i < k; i++) await Promise.resolve();
    await queue.record(weighIn());
    await running;
    await new Promise((r) => setTimeout(r, 0));
    expect([k, server.calls.length]).toEqual([k, 1]);
  }
});

test('a drain that fails (the store threw) does not stick: the next drain runs', async () => {
  const { store, server, recordOffline } = await setup();
  await recordOffline(weighIn());
  let fail = true;
  const flaky = {
    ...store,
    nextPending: async () => {
      if (fail) {
        fail = false;
        throw new Error('database is locked');
      }
      return store.nextPending();
    },
  };
  const queue = createSyncQueue({ store: flaky, send: server.send, report: () => {} });
  await expect(queue.drain()).rejects.toThrow('database is locked');
  await queue.drain();
  expect((await store.all())[0].state).toBe('SYNCED');
});

test('only "no answer" means try later: any other error from sending surfaces, the record stays', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn());
  server.send.mockImplementationOnce(async () => {
    throw new TypeError('a bug');
  });
  await expect(queue.drain()).rejects.toThrow('a bug');
  expect((await store.all())[0].state).toBe('PENDING');
});

test('a drain started by saving a record reports its failure by name only, never unhandled', async () => {
  const { server, queue, problems } = await setup();
  server.send.mockImplementationOnce(async () => {
    throw new TypeError('kg 81.5 is not valid');
  });
  await queue.record(weighIn());
  await new Promise((r) => setTimeout(r, 0));
  expect(problems).toEqual([{ name: 'TypeError' }]);
});

test('a 2xx without the stored record is not taken as stored: the drain stops and says so', async () => {
  const { store, server, queue, recordOffline, problems } = await setup();
  await recordOffline(workout, set(S1));
  server.send.mockImplementationOnce(async () => ({ status: 201 }));
  await queue.drain();
  expect((await store.all()).map((r) => r.state)).toEqual(['PENDING', 'PENDING']);
  expect(problems).toEqual([{ name: 'NO_STORED_RECORD' }]);
});

test.each([403, 404, 409, 422])('a refusal (%i) is kept and marked, and the queue moves on', async (status) => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn('55555555-5555-4555-8555-555555555555'), weighIn('66666666-6666-4666-8666-666666666666'));
  server.answerNext(status);
  await queue.drain();
  expect((await store.all()).map((r) => r.state)).toEqual(['REJECTED', 'SYNCED']);
});

test('without the consent the server asks for, a health record stays on the phone, refused, not sent again', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn());
  const before = server.send.mock.calls.length;
  server.send.mockImplementationOnce(async () => ({ status: 403, errorCode: 'CONSENT_REQUIRED' }));
  await queue.drain();
  await queue.drain();
  expect(await store.find(WEIGH)).toMatchObject({ state: 'REJECTED', errorCode: 'CONSENT_REQUIRED' });
  expect(server.send.mock.calls.length - before).toBe(1);
});

test('a refusal without a contract code keeps the HTTP status', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn());
  server.send.mockImplementationOnce(async () => ({ status: 413 }));
  await queue.drain();
  expect((await store.find(WEIGH))?.errorCode).toBe('HTTP_413');
});

test('server wins on a replay too: the stored copy the 200 brings replaces the local one', async () => {
  const { store, server, queue, recordOffline } = await setup();
  await recordOffline(weighIn());
  server.stored.set(WEIGH, { id: 'srv-7', body: { clientId: WEIGH, kg: 81.4, id: 'srv-7' } });
  await queue.drain();
  expect(await store.find(WEIGH)).toMatchObject({ state: 'SYNCED', serverId: 'srv-7', serverBody: { kg: 81.4 } });
});

test('a set whose workout is gone from the phone is refused, and the queue moves on', async () => {
  const { store, server, queue } = await setup();
  server.goOffline();
  await store.insert({ clientId: S1, kind: 'set', parentClientId: W, body: set(S1).body });
  await queue.record(weighIn());
  await queue.drain();
  server.goOnline();
  await queue.drain();
  expect((await store.all()).map((r) => [r.kind, r.state])).toEqual([
    ['set', 'REJECTED'],
    ['weighIn', 'SYNCED'],
  ]);
  expect(server.calls.map((c) => c.kind)).toEqual(['weighIn']);
});

test('recording says whether it stored something new', async () => {
  const { queue, recordOffline } = await setup();
  await recordOffline();
  expect(await queue.record(weighIn())).toBe(true);
  expect(await queue.record(weighIn())).toBe(false);
});

test('the refused records can be listed — without their bodies', async () => {
  const { server, queue, recordOffline } = await setup();
  await recordOffline(weighIn(), workout);
  server.answerNext(400);
  await queue.drain();
  expect(await queue.rejected()).toEqual([{ clientId: WEIGH, kind: 'weighIn', errorCode: 'X' }]);
});
