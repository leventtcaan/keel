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
