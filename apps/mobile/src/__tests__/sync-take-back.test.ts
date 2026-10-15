/**
 * Taking back a record the user made (K-980, ADR-074 Ek 2): a weigh-in or a cardio session saved on the phone, maybe sent.
 * The queue is held meanwhile, so nothing is sent while it is decided; a record never sent just goes; one the server may
 * have is deleted there first (the server's id), and only then forgotten here, together with a copy still waiting to be
 * sent: the same clientId would write the row again after it was deleted (ADR-074 Ek 2, ADR-024).
 */
import { NoAnswer, type Outbound, type SendResult, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';
import { createTakeBack } from '@/sync/takeBack';

import { nodeSqlite } from './support/nodeSqlite';

const C = '11111111-1111-4111-8111-111111111111';
const cardio: Outbound = { kind: 'cardio', body: { clientId: C, day: '2026-10-15', minutes: 30, source: 'MANUAL' } };

async function setup() {
  const store = await openRecordStore(nodeSqlite());
  let offline = false;
  const send = jest.fn(async (): Promise<SendResult> => {
    if (offline) throw new NoAnswer();
    return { status: 201, id: 'srv-1', body: {} };
  });
  const queue = createSyncQueue({ store, send, report: jest.fn() });
  return {
    store,
    queue,
    send,
    takeBack: createTakeBack({ store, queue }),
    goOffline: () => (offline = true),
    goOnline: () => (offline = false),
  };
}

test('a record never sent is simply forgotten; the server is not asked', async () => {
  const { store, takeBack } = await setup();
  await store.insert({ clientId: C, kind: 'cardio', parentClientId: null, body: cardio.body });
  const remove = jest.fn(async () => 204);
  expect(await takeBack(C, remove)).toBe('taken');
  expect(remove).not.toHaveBeenCalled();
  expect(await store.find(C)).toBeNull();
});

test('a record the server stored is deleted there by its id, then forgotten here', async () => {
  const { store, queue, takeBack } = await setup();
  await queue.record(cardio);
  await queue.drain();
  const remove = jest.fn(async () => 204);
  expect(await takeBack(C, remove)).toBe('taken');
  expect(remove).toHaveBeenCalledWith('srv-1');
  expect(await store.find(C)).toBeNull();
});

test('a copy still waiting is dropped with the delete, so it cannot write the row again (ADR-074 Ek 2)', async () => {
  const { store, queue, takeBack, send, goOffline } = await setup();
  goOffline();
  await queue.record(cardio); // tried, nobody answered; the day's read says the server has it, under this id
  const remove = jest.fn(async () => 204);
  expect(await takeBack(C, remove, 'srv-9')).toBe('taken');
  expect(remove).toHaveBeenCalledWith('srv-9');
  expect(await store.find(C)).toBeNull();
  send.mockClear();
  await queue.drain();
  expect(send).not.toHaveBeenCalled();
});

test('already gone on the server (404) is taken back', async () => {
  const { store, queue, takeBack } = await setup();
  await queue.record(cardio);
  await queue.drain();
  expect(await takeBack(C, async () => 404)).toBe('taken');
  expect(await store.find(C)).toBeNull();
});

test('the server refuses (409): nothing is forgotten', async () => {
  const { store, queue, takeBack } = await setup();
  await queue.record(cardio);
  await queue.drain();
  expect(await takeBack(C, async () => 409)).toBe('conflict');
  expect(await store.find(C)).not.toBeNull();
});

test('no answer to the delete: nothing is forgotten, and it is said to be offline', async () => {
  const { store, queue, takeBack } = await setup();
  await queue.record(cardio);
  await queue.drain();
  expect(await takeBack(C, () => Promise.reject(new Error('network')))).toBe('offline');
  expect(await store.find(C)).not.toBeNull();
});

test('tried but unconfirmed, and still offline: it cannot be said whether the server has it', async () => {
  const { store, queue, takeBack, goOffline } = await setup();
  goOffline();
  await queue.record(cardio);
  const remove = jest.fn(async () => 204);
  expect(await takeBack(C, remove)).toBe('offline');
  expect(remove).not.toHaveBeenCalled();
  expect(await store.find(C)).not.toBeNull();
});

test('tried but unconfirmed, then online: it is sent first so its id is known, then deleted', async () => {
  const { store, queue, takeBack, goOffline, goOnline } = await setup();
  goOffline();
  await queue.record(cardio);
  goOnline();
  const remove = jest.fn(async () => 204);
  expect(await takeBack(C, remove)).toBe('taken');
  expect(remove).toHaveBeenCalledWith('srv-1');
  expect(await store.find(C)).toBeNull();
});
