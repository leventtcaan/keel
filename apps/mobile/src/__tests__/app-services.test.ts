/**
 * The app's services, put together once (K-305): the session, the API client that refreshes through it, the record
 * store and the queue that sends with it. Real SQL (node:sqlite), a fake server.
 */
import { createAppServices } from '@/services/appServices';
import type { StoredSession } from '@/session/session';

import { nodeSqlite } from './support/nodeSqlite';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const BASE = 'https://api.example.test';
const SESSION: StoredSession = { accessToken: 'a1', refreshToken: 'r1', accessTokenExpiresAt: '2026-09-30T12:15:00Z' };
const WEIGH = {
  kind: 'weighIn' as const,
  body: { clientId: '44444444-4444-4444-8444-444444444444', measuredAt: '2026-09-30T07:00:00+03:00', kg: 81.5, source: 'MANUAL' as const },
};

function memoryStorage() {
  let value: StoredSession | null = null;
  return { load: async () => value, save: async (s: StoredSession) => void (value = s), clear: async () => void (value = null) };
}

/** Answers every request with `status`; records method, path and bearer. */
function server(status = 201) {
  const seen: { method: string; path: string; auth: string | null; body: string }[] = [];
  let offline = false;
  const fetch = jest.fn(async (request: Request) => {
    if (offline) throw new TypeError('Network request failed');
    seen.push({ method: request.method, path: request.url.slice(BASE.length), auth: request.headers.get('Authorization'), body: await request.text() });
    return new Response(JSON.stringify({ ...WEIGH.body, id: 'srv-1' }), { status, headers: { 'Content-Type': 'application/json' } });
  });
  return { fetch, seen, goOffline: () => (offline = true), goOnline: () => (offline = false) };
}

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}

const PHONE = { kv: memoryKv(), locale: 'en-US' };

async function setup(fake = server(), storage: ReturnType<typeof memoryStorage> = memoryStorage(), kv = memoryKv()) {
  const services = await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch: fake.fetch, report: () => {}, kv, locale: 'en-US' });
  return { services, fake };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

test('signed in, a saved record goes to the server with the session token', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  await services.queue.record(WEIGH);
  await services.queue.drain();
  expect(fake.seen).toContainEqual(expect.objectContaining({ method: 'POST', path: '/v1/weigh-ins', auth: 'Bearer a1' }));
});

test('sign-in and sign-out are announced to whoever listens (the navigation)', async () => {
  const { services } = await setup();
  const heard: boolean[] = [];
  services.session.subscribe((signedIn) => heard.push(signedIn));
  expect(await services.session.isSignedIn()).toBe(false);
  await services.session.signIn(SESSION);
  await services.signOut();
  expect(heard).toEqual([true, false]);
});

test('a refresh the server refuses signs out, and that is announced too', async () => {
  const { services } = await setup(server(401));
  await services.session.signIn(SESSION);
  const heard: boolean[] = [];
  services.session.subscribe((signedIn) => heard.push(signedIn));
  await services.api.GET('/v1/profile');
  expect(heard).toEqual([false]);
});

test('sign-out forgets the session and the records on the phone, and ends the session on the server', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await services.queue.drain();
  fake.goOnline();
  await services.signOut();
  expect(fake.seen).toEqual([
    expect.objectContaining({ method: 'POST', path: '/v1/auth/sign-out', body: JSON.stringify({ refreshToken: 'r1' }) }),
  ]);
  expect(await services.session.accessToken()).toBeNull();
  expect(await services.pendingCount()).toBe(0);
});

test('signing out offline still signs out and clears the phone', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await services.signOut();
  expect(await services.session.accessToken()).toBeNull();
  expect(await services.queue.rejected()).toEqual([]);
  expect(await services.pendingCount()).toBe(0);
});

test('pending records are counted, so a sign-out can warn before they are dropped', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  expect(await services.pendingCount()).toBe(1);
});

test('the phone forgets before the server answers: signed out at once, even on a slow network', async () => {
  // Every call waits for its own answer, by address; signing in also reads the profile (the unit choice, K-310).
  const waiting = new Map<string, (response: Response) => void>();
  const fetch = jest.fn((request: Request) => new Promise<Response>((resolve) => waiting.set(request.url, resolve)));
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch, report: () => {}, ...PHONE });
  await services.session.signIn(SESSION);
  const heard: boolean[] = [];
  services.session.subscribe((signedIn) => heard.push(signedIn));
  const signingOut = services.signOut();
  await settle();
  expect(heard).toEqual([false]);
  expect(await services.session.isSignedIn()).toBe(false);
  expect(fetch.mock.calls.filter(([request]) => request.url === `${BASE}/v1/auth/sign-out`)).toHaveLength(1);
  waiting.get(`${BASE}/v1/auth/sign-out`)!(new Response(null, { status: 204 }));
  await signingOut;
});

test('a refused refresh ends the session and drops the records: the next account does not inherit them', async () => {
  const fake = server(401);
  const { services } = await setup(fake);
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await services.queue.drain();
  fake.goOnline();
  await services.api.GET('/v1/profile'); // 401 → refresh → 401: the family is gone
  await settle();
  expect(await services.session.isSignedIn()).toBe(false);
  expect(await services.pendingCount()).toBe(0);
});

test('a keychain that fails to clear still leaves the phone without the records', async () => {
  const storage = memoryStorage();
  storage.clear = async () => {
    throw new Error('keychain locked');
  };
  const { services, fake } = await setup(server(), storage);
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await expect(services.signOut()).rejects.toThrow('keychain locked');
  expect(await services.pendingCount()).toBe(0);
});

test('only records still waiting are counted', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  await services.queue.record(WEIGH);
  await services.queue.drain();
  fake.goOffline();
  await services.queue.record({ ...WEIGH, body: { ...WEIGH.body, clientId: '55555555-5555-4555-8555-555555555555' } });
  expect(await services.pendingCount()).toBe(1);
});

test('a listener that unsubscribed hears nothing more', async () => {
  const { services } = await setup();
  const heard: boolean[] = [];
  const stop = services.session.subscribe((signedIn) => heard.push(signedIn));
  await services.session.signIn(SESSION);
  stop();
  await services.signOut();
  expect(heard).toEqual([true]);
});

test('the unit choice goes with the session: forgotten at sign-out', async () => {
  const kv = memoryKv();
  const { services } = await setup(server(404), memoryStorage(), kv);
  await services.units.set('METRIC'); // no profile yet: kept on the phone
  expect(kv.items.get('units')).toBe('METRIC');
  await services.session.signIn(SESSION);
  await services.signOut();
  await settle();
  expect(kv.items.has('units')).toBe(false);
  expect(services.units.current()).toBe('IMPERIAL');
});

test("signing in brings the account's own unit choice to the phone", async () => {
  const kv = memoryKv();
  const fetch = jest.fn(async (request: Request) =>
    request.url.endsWith('/v1/profile')
      ? new Response(JSON.stringify({ goal: 'LOSE_FAT', sex: 'MALE', heightCm: 178, birthYear: 1994, programChoice: 'BUILD_ONE_FOR_ME', schedule: { trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'America/New_York' }, units: 'METRIC' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response(null, { status: 204 }),
  );
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch, report: () => {}, kv, locale: 'en-US' });
  expect(services.units.current()).toBe('IMPERIAL'); // the region's guess
  await services.session.signIn(SESSION);
  await settle();
  expect(services.units.current()).toBe('METRIC');
  expect(kv.items.get('units')).toBe('METRIC');
});
