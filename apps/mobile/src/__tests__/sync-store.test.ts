/**
 * The phone's record store (K-304) on real SQL: node:sqlite, the same SQLite engine expo-sqlite wraps.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { type SqlDatabase, openRecordStore } from '@/sync/store';

import { nodeSqlite } from './support/nodeSqlite';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const body = { clientId: A, measuredAt: '2026-09-30T07:00:00+03:00', kg: 81.5, source: 'MANUAL' };

test('opening twice on the same database keeps the records (the schema is created once)', async () => {
  const db = nodeSqlite();
  const first = await openRecordStore(db);
  await first.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  const second = await openRecordStore(db);
  expect(await second.all()).toHaveLength(1);
});

test('the body comes back exactly as it went in', async () => {
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  expect((await store.find(A))?.body).toEqual(body);
});

test('a clientId is stored once: the second insert is ignored and says so', async () => {
  const store = await openRecordStore(nodeSqlite());
  expect(await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body })).toBe(true);
  expect(await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body: { ...body, kg: 99 } })).toBe(false);
  expect((await store.find(A))?.body).toEqual(body);
});

test('the next pending record is the oldest one still pending', async () => {
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  await store.insert({ clientId: B, kind: 'weighIn', parentClientId: null, body: { ...body, clientId: B } });
  expect((await store.nextPending())?.clientId).toBe(A);
  await store.markSynced(A, 'srv-1', { id: 'srv-1' });
  expect((await store.nextPending())?.clientId).toBe(B);
  await store.markRejected(B, 'VALIDATION_FAILED');
  expect(await store.nextPending()).toBeNull();
});

test('synced keeps the server id and answer; rejected keeps the code', async () => {
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  await store.insert({ clientId: B, kind: 'weighIn', parentClientId: null, body });
  await store.markSynced(A, 'srv-1', { id: 'srv-1', kg: 81.5 });
  await store.markRejected(B, 'VALIDATION_FAILED');
  expect(await store.find(A)).toMatchObject({ state: 'SYNCED', serverId: 'srv-1', serverBody: { id: 'srv-1', kg: 81.5 } });
  expect(await store.find(B)).toMatchObject({ state: 'REJECTED', errorCode: 'VALIDATION_FAILED', serverId: null });
});

test('clear removes every record (sign-out, account deletion)', async () => {
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  await store.clear();
  expect(await store.all()).toEqual([]);
});

test('forget removes the records of the kinds given, in every state, and only those (K-231)', async () => {
  const store = await openRecordStore(nodeSqlite());
  const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  await store.insert({ clientId: A, kind: 'weighIn', parentClientId: null, body });
  await store.insert({ clientId: B, kind: 'meal', parentClientId: null, body: { clientId: B } });
  await store.insert({ clientId: C, kind: 'workout', parentClientId: null, body: { clientId: C } });
  await store.markSynced(A, 'srv-1', { id: 'srv-1' });
  await store.markRejected(B, 'CONSENT_REQUIRED');

  await store.forget(['weighIn', 'meal']);

  expect((await store.all()).map((record) => record.clientId)).toEqual([C]);
});

test('forgetClient removes that one record, whatever its state, and no other (K-407: a meal deleted on the server)', async () => {
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'meal', parentClientId: null, body: { clientId: A } });
  await store.insert({ clientId: B, kind: 'meal', parentClientId: null, body: { clientId: B } });
  await store.markSynced(A, 'srv-1', { id: 'srv-1' });

  await store.forgetClient(A);

  expect((await store.all()).map((record) => record.clientId)).toEqual([B]);
});

test('a record still waiting can be changed or taken back in its place; one the server has cannot (K-972)', async () => {
  const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const store = await openRecordStore(nodeSqlite());
  await store.insert({ clientId: A, kind: 'set', parentClientId: 'w', body: { clientId: A, reps: 8 } });
  await store.insert({ clientId: B, kind: 'set', parentClientId: 'w', body: { clientId: B, reps: 8 } });
  await store.insert({ clientId: C, kind: 'set', parentClientId: 'w', body: { clientId: C, reps: 8 } });
  await store.markSynced(B, 'srv-1', { id: 'srv-1' });

  expect(await store.replacePending(A, { clientId: A, reps: 9 })).toBe(true);
  expect(await store.replacePending(B, { clientId: B, reps: 9 })).toBe(false);
  expect(await store.forgetPending(C)).toBe(true);
  expect(await store.forgetPending(B)).toBe(false);

  const all = await store.all();
  expect(all.map((record) => [record.clientId, (record.body as { reps: number }).reps])).toEqual([
    [A, 9], // in its place: the order of the sets stays
    [B, 8],
  ]);
});

test('an unknown state cannot be written: the database refuses it', async () => {
  const db = nodeSqlite();
  await openRecordStore(db);
  await expect(
    db.runAsync("INSERT INTO records (client_id, kind, body, state, created_at) VALUES (?, 'weighIn', '{}', 'LOST', 'x')", [A]),
  ).rejects.toThrow();
});

test('the app database (expo-sqlite) fits the slice the store uses — checked by the compiler', () => {
  type Fits = SQLiteDatabase extends SqlDatabase ? true : false;
  const fits: Fits = true;
  expect(fits).toBe(true);
});

test('a database from a newer app version is refused, not misread', async () => {
  const db = nodeSqlite();
  await db.execAsync('PRAGMA user_version = 99');
  await expect(openRecordStore(db)).rejects.toThrow(/newer/);
});

test('a migration that fails leaves no open transaction: the next open succeeds', async () => {
  const db = nodeSqlite();
  let broken = true;
  const failing = {
    ...db,
    execAsync: (source: string) => {
      if (broken && source.includes('CREATE INDEX')) {
        broken = false;
        return db.execAsync(source.replace('CREATE INDEX', 'CREATE INDEXX'));
      }
      return db.execAsync(source);
    },
  };
  await expect(openRecordStore(failing)).rejects.toThrow();
  const store = await openRecordStore(db);
  expect(await store.all()).toEqual([]);
});
