/**
 * The app's services, put together once (K-305): the session, the API client that refreshes through it, the record
 * store and the queue that sends with it. Real SQL (node:sqlite), a fake server.
 */
import { createAppServices } from '@/services/appServices';
import { storeUnavailable } from '@/subscription/store';
import type { StoredSession } from '@/session/session';
import { localDay } from '@/today/today';

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
    seen.push({
      method: request.method,
      path: request.url.slice(BASE.length),
      auth: request.headers.get('Authorization'),
      body: await request.text(),
    });
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
  expect(fake.seen).toEqual([expect.objectContaining({ method: 'POST', path: '/v1/auth/sign-out', body: JSON.stringify({ refreshToken: 'r1' }) })]);
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

test("the workout's records are read from the phone, sent or not, and only those (K-405)", async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await services.queue.record({ kind: 'workout', body: { clientId: '66666666-6666-4666-8666-666666666666', startedAt: '2026-09-30T18:00:00+03:00' } });
  expect((await services.workoutRecords()).map((r) => [r.kind, r.state])).toEqual([['workout', 'PENDING']]);
});

test("the phone's meals, and only those, for the Food tab's list (K-407)", async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  fake.goOffline();
  await services.queue.record(WEIGH);
  await services.queue.record({ kind: 'meal', body: { clientId: '77777777-7777-4777-8777-777777777777', eatenAt: '2026-09-30T13:00:00+03:00', slot: 'LUNCH', repeatOf: '88888888-8888-4888-8888-888888888888' } });
  expect((await services.mealRecords()).map((r) => [r.kind, r.state])).toEqual([['meal', 'PENDING']]);
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

test('the days the app was opened go with the session: forgotten at sign-out (K-521)', async () => {
  const kv = memoryKv();
  const { services } = await setup(server(404), memoryStorage(), kv);
  await services.session.signIn(SESSION);
  await services.opens.previous();
  expect(kv.items.has('keel.opens')).toBe(true);
  await services.signOut();
  await settle();
  expect(kv.items.has('keel.opens')).toBe(false);
});

test("the App Store's account goes with the session (K-702): the next person's purchases are not this account's", async () => {
  const forgets: string[] = [];
  const store = { ...storeUnavailable, available: true, forget: async () => void forgets.push('forget') };
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server().fetch, report: () => {}, kv: memoryKv(), locale: 'en-US', purchases: store });
  expect(services.purchases).toBe(store);
  await services.session.signIn(SESSION);
  expect(forgets).toEqual([]);
  await services.signOut();
  await settle();
  expect(forgets).toEqual(['forget']);
});

test('the subscription gate (K-706): asked at sign-in, forgotten at sign-out', async () => {
  const links = [
    { key: 'subscription.terms', url: 'https://example.test/terms' },
    { key: 'subscription.privacy', url: 'https://example.test/privacy' },
  ];
  const fake = server(200); // every answer is a body without a subscription status: never subscribed
  const store = { ...storeUnavailable, available: true };
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: fake.fetch, report: () => {}, kv: memoryKv(), locale: 'en-US', purchases: store, links });
  expect(services.gate.current()).toBe('unknown');
  await services.session.signIn(SESSION);
  await settle();
  expect(fake.seen.some((seen) => seen.path === '/v1/subscription')).toBe(true);
  expect(services.gate.current()).toBe('required');
  await services.signOut();
  await settle();
  expect(services.gate.current()).toBe('unknown');
});

test('signed in already when the app starts: the gate is asked at once — and with no answer and nothing kept, it opens', async () => {
  const links = [
    { key: 'subscription.terms', url: 'https://example.test/terms' },
    { key: 'subscription.privacy', url: 'https://example.test/privacy' },
  ];
  const storage = memoryStorage();
  await storage.save(SESSION);
  const fake = server(200);
  const store = { ...storeUnavailable, available: true };
  const services = await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch: fake.fetch, report: () => {}, kv: memoryKv(), locale: 'en-US', purchases: store, links });
  await settle();
  expect(fake.seen.some((seen) => seen.path === '/v1/subscription')).toBe(true);
  expect(services.gate.current()).toBe('required');

  const offline = server(200);
  offline.goOffline();
  const cold = await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch: offline.fetch, report: () => {}, kv: memoryKv(), locale: 'en-US', purchases: store, links });
  await settle();
  expect(cold.gate.current()).toBe('open');
});

test('without the store or the legal links in the build, the gate is open (a development build is not locked)', async () => {
  const { services } = await setup();
  expect(services.gate.current()).toBe('open');
});

test("a store that cannot forget (RevenueCat refusing a log-out) is reported by name; the sign-out is still done", async () => {
  const reported: string[] = [];
  const store = {
    ...storeUnavailable,
    available: true,
    forget: async () => {
      throw Object.assign(new Error('x'), { name: 'StoreLogOut' });
    },
  };
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server().fetch, report: (problem) => void reported.push(problem.name), kv: memoryKv(), locale: 'en-US', purchases: store });
  await services.session.signIn(SESSION);
  await services.signOut();
  await settle();
  expect(reported).toContain('StoreLogOut');
  expect(await services.session.isSignedIn()).toBe(false);
});

test('the SCOFF result: "off" stays on the phone at sign-out, "clear" goes (K-607, ADR-050)', async () => {
  const kept = memoryKv();
  const first = await setup(server(404), memoryStorage(), kept);
  await first.services.session.signIn(SESSION);
  await first.services.projection.record('unavailable');
  await first.services.signOut();
  await settle();
  expect(kept.items.get('projection.access')).toBe('unavailable');
  // A start with no session does not clear it either.
  const again = await setup(server(404), memoryStorage(), kept);
  expect(again.services.projection.current()).toBe('unavailable');

  const cleared = memoryKv();
  const second = await setup(server(404), memoryStorage(), cleared);
  await second.services.session.signIn(SESSION);
  await second.services.projection.record('clear');
  await second.services.signOut();
  await settle();
  expect(cleared.items.has('projection.access')).toBe(false);
});

test('the projection switch and what it showed go with the session (K-606)', async () => {
  const kv = memoryKv();
  kv.items.set('projection.access', 'clear');
  const { services } = await setup(server(404), memoryStorage(), kv);
  await services.session.signIn(SESSION);
  expect(await services.projectionSwitch.turnOn()).toBe(true);
  await services.projectionSwitch.remember({ adherence: 0.8, kg: 81, low: 78, high: 84 });
  await services.signOut();
  await settle();
  expect(kv.items.has('projection.on')).toBe(false);
  expect(kv.items.has('projection.last')).toBe(false);
  expect(services.projectionSwitch.on()).toBe(false);
});

test('a start with no session forgets the projection switch too (K-606)', async () => {
  const kv = memoryKv();
  kv.items.set('projection.on', 'true');
  kv.items.set('projection.last', '{"adherence":0.8,"kg":81,"low":78,"high":84}');
  await setup(server(404), memoryStorage(), kv);
  expect(kv.items.has('projection.on')).toBe(false);
  expect(kv.items.has('projection.last')).toBe(false);
});

/** A photos folder as a list of names (the phone's is expo-file-system, photoFiles.ts). */
function photoFolder(initial: string[] = []) {
  const names = new Set(initial);
  return {
    names,
    files: {
      names: async () => [...names],
      uriOf: (name: string) => `file:///docs/progress-photos/${name}`,
      keep: async (_from: string, name: string) => void names.add(name),
      clear: async () => names.clear(),
    },
  };
}

test('progress photos go with the session: deleted from the phone at sign-out (K-614)', async () => {
  const folder = photoFolder();
  const fake = server(404);
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: fake.fetch, report: () => {},
    kv: memoryKv(), locale: 'en-US', photoFiles: folder.files });
  await services.session.signIn(SESSION);
  await services.photos.add('file:///cache/a.jpg', '2026-10-07', 'front');
  expect(await services.photos.photos()).toHaveLength(1);
  await services.signOut();
  await settle();
  expect([...folder.names]).toEqual([]);
  // Nothing about a photo went to the server: the profile read at sign-in and the sign-out, no more.
  expect(fake.seen.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /v1/profile', 'POST /v1/auth/sign-out']);
  expect(fake.seen.filter((r) => /jpg|photo/.test(r.body))).toEqual([]);
});

test('a start with no session keeps the photos: whose they are is known at the next sign-in (ADR-055 #101)', async () => {
  const folder = photoFolder(['2026-10-07-front.jpg']);
  await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(404).fetch, report: () => {},
    kv: memoryKv(), locale: 'en-US', photoFiles: folder.files });
  expect([...folder.names]).toEqual(['2026-10-07-front.jpg']);
});

test('a start with a session keeps the photos: only a start with none deletes them (K-614)', async () => {
  const folder = photoFolder(['2026-10-07-front.jpg']);
  const storage = memoryStorage();
  await storage.save(SESSION);
  await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch: server(404).fetch, report: () => {}, kv: memoryKv(),
    locale: 'en-US', photoFiles: folder.files });
  expect([...folder.names]).toEqual(['2026-10-07-front.jpg']);
});

test('a refused refresh ends the session but keeps the photos: the only copy, and maybe the same person back (ADR-055 #101)', async () => {
  const folder = photoFolder(['2026-10-07-front.jpg']);
  const fake = server(401);
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: fake.fetch, report: () => {},
    kv: memoryKv(), locale: 'en-US', photoFiles: folder.files });
  await services.session.signIn(SESSION);
  await services.photos.add('file:///cache/a.jpg', '2026-10-08', 'front');
  await services.api.GET('/v1/profile'); // 401 → refresh → 401
  await settle();
  expect(await services.session.isSignedIn()).toBe(false);
  expect([...folder.names].sort()).toEqual(['2026-10-07-front.jpg', '2026-10-08-front.jpg']);
});

describe('whose photos they are (ADR-055 #101)', () => {
  async function build(folder = photoFolder(['2026-10-07-front.jpg']), kv = memoryKv()) {
    const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(404).fetch,
      report: () => {}, kv, locale: 'en-US', photoFiles: folder.files });
    return { services, folder, kv };
  }

  test('the same account signing in again keeps them', async () => {
    const { services, folder } = await build();
    await services.claimPhotos('owner-a');
    await services.claimPhotos('owner-a');
    expect([...folder.names]).toEqual(['2026-10-07-front.jpg']);
  });

  test('another account signing in on this phone: they are deleted before it sees them', async () => {
    const { services, folder } = await build();
    await services.claimPhotos('owner-a');
    await services.claimPhotos('owner-b');
    expect([...folder.names]).toEqual([]);
  });

  test('photos from before an owner was kept (an earlier version) go to the first account that signs in', async () => {
    const { services, folder, kv } = await build();
    await services.claimPhotos('owner-a');
    expect([...folder.names]).toEqual(['2026-10-07-front.jpg']);
    expect([...kv.items.values()]).toContain('owner-a');
  });

  test('another account, and the photos cannot be deleted: the claim fails and the owner stays (the sign-in fails closed)', async () => {
    const folder = photoFolder(['2026-10-07-front.jpg']);
    const kv = memoryKv();
    const { services } = await build(
      { ...folder, files: { ...folder.files, clear: async () => {
        throw Object.assign(new Error('locked'), { name: 'FileSystemError' });
      } } },
      kv,
    );
    await services.claimPhotos('owner-a');

    await expect(services.claimPhotos('owner-b')).rejects.toMatchObject({ name: 'FileSystemError' });
    expect([...kv.items.values()]).toContain('owner-a');
  });

  test('the account deleted: the owner goes with the photos', async () => {
    const folder = photoFolder(['2026-10-07-front.jpg']);
    const kv = memoryKv();
    const fetch = jest.fn(async (request: Request) => new Response(null, { status: request.method === 'DELETE' ? 202 : 404 }));
    const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch, report: () => {}, kv,
      locale: 'en-US', photoFiles: folder.files });
    await services.session.signIn(SESSION);
    await services.claimPhotos('owner-a');
    await services.deleteAccount();
    expect([...kv.items.values()]).not.toContain('owner-a');
    expect([...folder.names]).toEqual([]);
  });

  test('a sign-out by the user deletes them and forgets the owner', async () => {
    const { services, folder, kv } = await build();
    await services.session.signIn(SESSION);
    await services.claimPhotos('owner-a');
    await services.signOut();
    await settle();
    expect([...folder.names]).toEqual([]);
    expect([...kv.items.values()]).not.toContain('owner-a');
  });
});

test('the account deleted (202): its photos are deleted from the phone (K-614)', async () => {
  const folder = photoFolder();
  const fetch = jest.fn(async (request: Request) => new Response(null, { status: request.method === 'DELETE' ? 202 : 404 }));
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch, report: () => {},
    kv: memoryKv(), locale: 'en-US', photoFiles: folder.files });
  await services.session.signIn(SESSION);
  await services.photos.add('file:///cache/a.jpg', '2026-10-07', 'front');
  await services.deleteAccount();
  await settle();
  expect([...folder.names]).toEqual([]);
});

test('photos that cannot be deleted at sign-out are reported by name, the sign-out still done (K-614)', async () => {
  const folder = photoFolder(['2026-10-07-front.jpg']);
  const report = jest.fn();
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(404).fetch, report,
    kv: memoryKv(), locale: 'en-US', photoFiles: { ...folder.files, clear: async () => {
      throw Object.assign(new Error('locked'), { name: 'FileSystemError' });
    } } }).catch(() => null);
  // A start with no session does not try any more (ADR-055 #101): the services built, nothing to report yet.
  expect(services).not.toBeNull();
  expect(report).not.toHaveBeenCalled();
  await services!.session.signIn(SESSION);
  await services!.signOut();
  await settle();
  expect(await services!.session.isSignedIn()).toBe(false);
  expect(report).toHaveBeenCalledWith({ name: 'FileSystemError' });
});

test('with no photos folder (tests, a phone without one) the library is empty and keeps nothing', async () => {
  const { services } = await setup(server(404));
  expect(await services.photos.photos()).toEqual([]);
  await expect(services.photos.add('file:///cache/a.jpg', '2026-10-07', 'front')).rejects.toThrow();
});

test("the support link follows the phone's region (K-607)", async () => {
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(404).fetch,
    report: () => {}, kv: memoryKv(), locale: 'en-GB' });
  expect(services.projection.support()?.region).toBe('GB');
});

test('a declared state goes with the session: forgotten at sign-out (K-518)', async () => {
  const kv = memoryKv();
  const { services } = await setup(server(404), memoryStorage(), kv);
  await services.session.signIn(SESSION);
  await services.state.keep({ state: 'ready', value: { kind: 'SICK', since: '2026-10-07' } });
  await services.signOut();
  await settle();
  expect(await services.state.inForce()).toBe(false);
  expect(kv.items.has('state.current')).toBe(false);
});

test('a state in force quiets the reminders (ADR-036 #7): they plan again as it begins and ends (K-518)', async () => {
  const scheduled: string[][] = [];
  const notifications = {
    permission: async () => ({ granted: true, canAskAgain: true }),
    request: async () => ({ granted: true, canAskAgain: true }),
    replace: async (reminders: { id: string }[]) => void scheduled.push(reminders.map((r) => r.id)),
    clear: async () => void scheduled.push([]),
  };
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(404).fetch, report: () => {},
    kv: memoryKv(), locale: 'en-US', notifications });
  await services.session.signIn(SESSION);
  await services.reminders.keepSchedule({ trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'UTC' } as never);
  await services.reminders.turnOn();
  expect(scheduled.at(-1)?.length).toBeGreaterThan(0);

  await services.state.keep({ state: 'ready', value: { kind: 'SICK', since: '2026-10-07' } });
  await settle();
  expect(scheduled.at(-1)).toEqual([]);

  await services.state.keep({ state: 'none' });
  await settle();
  expect(scheduled.at(-1)?.length).toBeGreaterThan(0);
});

test("signing in brings the account's own unit choice to the phone", async () => {
  const kv = memoryKv();
  const fetch = jest.fn(async (request: Request) =>
    request.url.endsWith('/v1/profile')
      ? new Response(
          JSON.stringify({
            goal: 'LOSE_FAT',
            sex: 'MALE',
            heightCm: 178,
            birthYear: 1994,
            programChoice: 'BUILD_ONE_FOR_ME',
            schedule: { trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'America/New_York' },
            units: 'METRIC',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      : new Response(null, { status: 204 }),
  );
  const services = await createAppServices({
    baseUrl: BASE,
    storage: memoryStorage(),
    db: nodeSqlite(),
    fetch,
    report: () => {},
    kv,
    locale: 'en-US',
  });
  expect(services.units.current()).toBe('IMPERIAL'); // the region's guess
  await services.session.signIn(SESSION);
  await settle();
  expect(services.units.current()).toBe('METRIC');
  expect(kv.items.get('units')).toBe('METRIC');
});

test('signing in asks, with the same single read, whether onboarding is done (K-306)', async () => {
  const kv = memoryKv();
  const fetch = jest.fn(
    async () => new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'x' }), { status: 404, headers: { 'Content-Type': 'application/json' } }),
  );
  const services = await createAppServices({
    baseUrl: BASE,
    storage: memoryStorage(),
    db: nodeSqlite(),
    fetch,
    report: () => {},
    kv,
    locale: 'en-US',
  });
  expect(services.profile.current()).toBe('unknown');
  await services.session.signIn(SESSION);
  await settle();
  expect(services.profile.current()).toBe('needed');
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('signing out forgets whether onboarding was done: the next account is asked afresh', async () => {
  const kv = memoryKv();
  const fetch = jest.fn(async (request: Request) =>
    request.url.endsWith('/v1/profile')
      ? new Response(
          JSON.stringify({
            goal: 'LOSE_FAT',
            sex: 'MALE',
            heightCm: 178,
            birthYear: 1994,
            programChoice: 'BUILD_ONE_FOR_ME',
            schedule: { trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'America/New_York' },
            units: 'METRIC',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      : new Response(null, { status: 204 }),
  );
  const services = await createAppServices({
    baseUrl: BASE,
    storage: memoryStorage(),
    db: nodeSqlite(),
    fetch,
    report: () => {},
    kv,
    locale: 'en-US',
  });
  await services.session.signIn(SESSION);
  await settle();
  expect(services.profile.current()).toBe('done');
  await services.signOut();
  await settle();
  expect(services.profile.current()).toBe('unknown');
  expect(kv.items.has('onboarded')).toBe(false);
});

test('opening without a session drops a "done" left on the phone (a backup restored to a new phone)', async () => {
  const kv = memoryKv();
  kv.items.set('onboarded', 'done');
  const services = await createAppServices({
    baseUrl: BASE,
    storage: memoryStorage(),
    db: nodeSqlite(),
    fetch: server().fetch,
    report: () => {},
    kv,
    locale: 'en-US',
  });
  expect(services.profile.current()).toBe('unknown');
  expect(kv.items.has('onboarded')).toBe(false);
});

describe('withdrawing the health data consent (K-231)', () => {
  const WORKOUT = { kind: 'workout' as const, body: { clientId: '55555555-5555-4555-8555-555555555555', startedAt: '2026-09-30T18:00:00+03:00' } };
  const MEAL = {
    kind: 'meal' as const,
    body: { clientId: '66666666-6666-4666-8666-666666666666', eatenAt: '2026-09-30T12:30:00+03:00', slot: 'LUNCH' as const, items: [] },
  };

  async function withEntries(status: number) {
    const fake = server(status);
    const { services } = await setup(fake);
    await services.session.signIn(SESSION);
    fake.goOffline(); // the entries wait on the phone
    await services.queue.record(WEIGH);
    await services.queue.record(MEAL);
    await services.queue.record(WORKOUT);
    fake.goOnline();
    return { services, fake };
  }

  test('the server deletes, confirmed; then the health entries leave the phone too — training stays (ADR-030 #25)', async () => {
    const { services, fake } = await withEntries(200);

    await services.withdrawHealthData();

    expect(fake.seen).toContainEqual(expect.objectContaining({ method: 'DELETE', path: '/v1/consents/HEALTH_DATA?confirmDataDeletion=true' }));
    expect(await services.pendingCount()).toBe(1);
  });

  test('the activity days sent are forgotten with it: the server deleted them, so they go again once allowed again (K-404)', async () => {
    const kv = memoryKv();
    kv.items.set('health.activityDaysSent', '{"2026-09-30":"x"}');
    const fake = server(200);
    const { services } = await setup(fake, memoryStorage(), kv);
    await services.session.signIn(SESSION);
    await services.withdrawHealthData();
    expect(kv.items.has('health.activityDaysSent')).toBe(false);
  });

  test('a declared state goes with it: sickness and pain are health data, deleted on the server (K-518)', async () => {
    const { services } = await withEntries(200);
    await services.state.keep({ state: 'ready', value: { kind: 'PAIN', since: '2026-10-07' } });
    await services.withdrawHealthData();
    expect(await services.state.inForce()).toBe(false);
  });

  test('and the reminders it quieted come back at once (K-518)', async () => {
    const scheduled: string[][] = [];
    const notifications = {
      permission: async () => ({ granted: true, canAskAgain: true }),
      request: async () => ({ granted: true, canAskAgain: true }),
      replace: async (reminders: { id: string }[]) => void scheduled.push(reminders.map((r) => r.id)),
      clear: async () => void scheduled.push([]),
    };
    const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(200).fetch, report: () => {},
      kv: memoryKv(), locale: 'en-US', notifications });
    await services.session.signIn(SESSION);
    await settle(); // the profile read at sign-in keeps its own schedule first
    await services.reminders.keepSchedule({ trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'UTC' } as never);
    await services.reminders.turnOn();
    await services.state.keep({ state: 'ready', value: { kind: 'SICK', since: '2026-10-07' } });
    await settle();
    expect(scheduled.at(-1)).toEqual([]);

    await services.withdrawHealthData();
    await settle();

    expect(scheduled.at(-1)?.length).toBeGreaterThan(0);
  });

  test('a state with a last day: the reminders after it are planned by date, no open needed (K-518)', async () => {
    const scheduled: { id: string; when: object }[][] = [];
    const notifications = {
      permission: async () => ({ granted: true, canAskAgain: true }),
      request: async () => ({ granted: true, canAskAgain: true }),
      replace: async (reminders: { id: string; when: object }[]) => void scheduled.push(reminders),
      clear: async () => void scheduled.push([]),
    };
    const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server(200).fetch, report: () => {},
      kv: memoryKv(), locale: 'en-US', notifications });
    await services.session.signIn(SESSION);
    await settle(); // the profile read at sign-in keeps its own schedule first
    await services.reminders.keepSchedule({ trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'UTC' } as never);
    await services.reminders.turnOn();
    const inThreeDays = localDay(new Date(Date.now() + 3 * 86_400_000)); // the services read the real clock
    await services.state.keep({ state: 'ready', value: { kind: 'TRAVELING', since: localDay(new Date()), until: inThreeDays } });
    await settle();

    expect(scheduled.at(-1)?.length).toBeGreaterThan(0);
    expect(scheduled.at(-1)?.every((reminder) => 'at' in reminder.when)).toBe(true);
  });

  test('the phone remembers it at once: offline, the health data consent reads as withdrawn (K-402)', async () => {
    const { services, fake } = await withEntries(200);
    await services.consents.remember('HEALTH_DATA', 'GRANTED');
    await services.withdrawHealthData();
    fake.goOffline();
    expect(await services.consents.granted('HEALTH_DATA')).toBe(false);
  });

  test('a refusal keeps every entry and throws by name', async () => {
    const { services } = await withEntries(500);

    await expect(services.withdrawHealthData()).rejects.toMatchObject({ name: 'ConsentRefused' });
    expect(await services.pendingCount()).toBe(3);
  });

  test('offline, nothing is withdrawn and nothing forgotten', async () => {
    const { services, fake } = await withEntries(200);
    fake.goOffline();

    await expect(services.withdrawHealthData()).rejects.toMatchObject({ name: 'NoConnection' });
    expect(await services.pendingCount()).toBe(3);
  });
});

test('the activity days sent go with the session at sign-out (K-404)', async () => {
  const kv = memoryKv();
  kv.items.set('health.activityDaysSent', '{"2026-09-30":"x"}');
  const { services } = await setup(server(), memoryStorage(), kv);
  await services.session.signIn(SESSION);
  await services.signOut();
  await settle();
  expect(kv.items.has('health.activityDaysSent')).toBe(false);
});

test('the program and the catalog kept for offline training go with the session at sign-out (K-405)', async () => {
  const kv = memoryKv();
  kv.items.set('train.program', '{"id":"p1"}');
  kv.items.set('train.exercises', '[]');
  const { services } = await setup(server(), memoryStorage(), kv);
  await services.session.signIn(SESSION);
  await services.signOut();
  await settle();
  expect(kv.items.has('train.program') || kv.items.has('train.exercises')).toBe(false);
});

test('what the phone knows of the consents goes with the session at sign-out (K-402)', async () => {
  const { services, fake } = await setup();
  await services.session.signIn(SESSION);
  await services.consents.remember('HEALTH_DATA', 'GRANTED');
  await services.signOut();
  await settle();
  fake.goOffline();
  expect(await services.consents.granted('HEALTH_DATA')).toBe(false);
});

describe('deleting the account (K-309, K-214)', () => {
  function accountServer(status: number) {
    const seen: string[] = [];
    const fetch = jest.fn(async (request: Request) => {
      seen.push(`${request.method} ${request.url.slice(BASE.length)}`);
      if (request.url.endsWith('/v1/account')) return new Response(null, { status });
      return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'x' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    });
    return { fetch, seen };
  }

  test('the server deletes (202): the phone forgets the session and the records, and asks nothing more of the server', async () => {
    const fake = accountServer(202);
    const services = await createAppServices({
      baseUrl: BASE,
      storage: memoryStorage(),
      db: nodeSqlite(),
      fetch: fake.fetch,
      report: () => {},
      kv: memoryKv(),
      locale: 'en-US',
    });
    await services.session.signIn(SESSION);
    await settle();
    await services.queue.record(WEIGH);
    fake.seen.length = 0;
    await services.deleteAccount();
    expect(fake.seen[0]).toBe('DELETE /v1/account');
    expect(fake.seen).not.toContain('POST /v1/auth/sign-out'); // its tokens are already refused
    expect(await services.session.isSignedIn()).toBe(false);
    expect(await services.pendingCount()).toBe(0);
  });

  test('offline, nothing is forgotten: the account still exists, and so do the entries waiting for it', async () => {
    const fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const services = await createAppServices({
      baseUrl: BASE,
      storage: memoryStorage(),
      db: nodeSqlite(),
      fetch,
      report: () => {},
      kv: memoryKv(),
      locale: 'en-US',
    });
    await services.session.signIn(SESSION);
    await services.queue.record(WEIGH);
    await expect(services.deleteAccount()).rejects.toMatchObject({ name: 'NoConnection' });
    expect(await services.session.isSignedIn()).toBe(true);
    expect(await services.pendingCount()).toBe(1);
  });

  test('deleted: the settings kept for the account go too (units, "onboarding done")', async () => {
    const kv = memoryKv();
    const services = await createAppServices({
      baseUrl: BASE,
      storage: memoryStorage(),
      db: nodeSqlite(),
      fetch: accountServer(202).fetch,
      report: () => {},
      kv,
      locale: 'en-US',
    });
    await services.session.signIn(SESSION);
    kv.items.set('onboarded', 'done');
    await services.units.keepOnPhone('METRIC');
    await services.deleteAccount();
    await settle();
    expect(kv.items.has('onboarded')).toBe(false);
    expect(kv.items.has('units')).toBe(false);
  });

  test('deleted on the server but the keychain will not clear: still done, the phone forgot what it could, and it is reported', async () => {
    const storage = memoryStorage();
    storage.clear = async () => {
      throw Object.assign(new Error('keychain locked'), { name: 'KeychainError' });
    };
    const problems: string[] = [];
    const services = await createAppServices({
      baseUrl: BASE,
      storage,
      db: nodeSqlite(),
      fetch: accountServer(202).fetch,
      report: (p) => problems.push(p.name),
      kv: memoryKv(),
      locale: 'en-US',
    });
    await services.session.signIn(SESSION);
    await services.queue.record(WEIGH);
    await services.deleteAccount(); // the account is gone; a local hiccup is not a failed deletion
    expect(await services.session.isSignedIn()).toBe(false);
    expect(await services.pendingCount()).toBe(0);
    expect(problems).toContain('KeychainError');
  });

  test.each([500, 400, 409])(
    'a refused deletion (%i) keeps the session: nothing is forgotten on the phone, the error says why by name',
    async (status) => {
      const services = await createAppServices({
        baseUrl: BASE,
        storage: memoryStorage(),
        db: nodeSqlite(),
        fetch: accountServer(status).fetch,
        report: () => {},
        kv: memoryKv(),
        locale: 'en-US',
      });
      await services.session.signIn(SESSION);
      await expect(services.deleteAccount()).rejects.toMatchObject({ name: 'DeletionFailed' });
      expect(await services.session.isSignedIn()).toBe(true);
    },
  );
});

describe('the reminders (K-410)', () => {
  const PROFILE = {
    goal: 'LOSE_FAT',
    sex: 'MALE',
    heightCm: 178,
    birthYear: 1994,
    programChoice: 'BUILD_ONE_FOR_ME',
    schedule: { trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
    units: 'METRIC',
  };
  const profileServer = (status = 200) =>
    jest.fn(async (request: Request) =>
      request.url.endsWith('/v1/profile')
        ? new Response(JSON.stringify(PROFILE), { status, headers: { 'Content-Type': 'application/json' } })
        : new Response(null, { status: 204 }),
    );
  function phone() {
    const scheduled: { kind: string }[][] = [];
    const notifications = {
      permission: async () => ({ granted: true, canAskAgain: true }),
      request: async () => ({ granted: true, canAskAgain: true }),
      replace: async (reminders: { kind: string }[]) => void scheduled.push(reminders),
      clear: async () => void scheduled.push([]),
    };
    return { notifications, latest: () => scheduled[scheduled.length - 1] ?? [] };
  }

  test("the profile read at sign-in brings the account's schedule: turned on, its training day is scheduled", async () => {
    const device = phone();
    const services = await createAppServices({
      baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: profileServer(), report: () => {}, kv: memoryKv(), locale: 'en-US', notifications: device.notifications,
    });
    await services.reminders.turnOn();
    expect(device.latest().map((r) => r.kind)).toEqual([]);
    await services.session.signIn(SESSION);
    await settle();
    await services.reminders.opened();
    expect(device.latest().map((r) => r.kind)).toEqual(['training', 'check_in', 'quiet']);
  });

  test('the profile saved at the end of onboarding brings it too', async () => {
    const device = phone();
    const services = await createAppServices({
      baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: profileServer(), report: () => {}, kv: memoryKv(), locale: 'en-US', notifications: device.notifications,
    });
    await services.reminders.turnOn();
    await services.profile.save(PROFILE as Parameters<typeof services.profile.save>[0]);
    await settle();
    expect(device.latest().map((r) => r.kind)).toContain('training');
  });

  test('a sign-out leaves nothing scheduled and nothing kept for the next account', async () => {
    const device = phone();
    const kv = memoryKv();
    const services = await createAppServices({
      baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: profileServer(), report: () => {}, kv, locale: 'en-US', notifications: device.notifications,
    });
    await services.session.signIn(SESSION);
    await settle();
    await services.reminders.setCue('After work');
    await services.reminders.turnOn();
    await services.signOut();
    await settle();
    expect(device.latest()).toEqual([]);
    expect([...kv.items.keys()].filter((key) => key.startsWith('reminders.'))).toEqual([]);
  });

  test('opening without a session drops reminders left on the phone (a backup restored to a new phone)', async () => {
    const device = phone();
    const kv = memoryKv();
    kv.items.set('reminders.enabled', 'on');
    kv.items.set('reminders.cue', 'Someone else\'s words');
    const services = await createAppServices({
      baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: profileServer(), report: () => {}, kv, locale: 'en-US', notifications: device.notifications,
    });
    await settle();
    expect(services.reminders.current()).toEqual({ enabled: false, cue: '' });
    expect([...kv.items.keys()].filter((key) => key.startsWith('reminders.'))).toEqual([]);
  });
});

test("a sign-out takes a rest alert away: no voice for the account that left (K-411)", async () => {
  const cancelled: string[] = [];
  const alerts = {
    permission: async () => ({ granted: true, canAskAgain: false }),
    alertAt: async () => {},
    cancel: async (id: string) => void cancelled.push(id),
  };
  const services = await createAppServices({
    baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server().fetch, report: () => {}, kv: memoryKv(), locale: 'en-US', alerts,
  });
  await services.session.signIn(SESSION);
  await services.restAlert.start(Date.now());
  await services.signOut();
  await settle();
  expect(cancelled).toEqual(['rest']);
});

test('a sign-out forgets the Apple Health switches (K-412)', async () => {
  const kv = memoryKv();
  const healthWrite = {
    available: true,
    requestWrite: async () => {},
    canWrite: () => true,
    writeWorkout: async () => {},
    writeWeight: async () => {},
  };
  const services = await createAppServices({
    baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server().fetch, report: () => {}, kv, locale: 'en-US', healthWrite,
  });
  await services.session.signIn(SESSION);
  await services.healthWriting.turnOn('workouts');
  expect(services.healthWriting.current().workouts).toBe(true);
  await services.signOut();
  await settle();
  expect(services.healthWriting.current()).toEqual({ workouts: false, weighIns: false });
  expect([...kv.items.keys()].filter((key) => key.startsWith('healthWrite.'))).toEqual([]);
});

test("the profile's sex is kept for the muscle map's figure, and forgotten at sign-out (ADR-037 › 49)", async () => {
  const kv = memoryKv();
  const fetch = jest.fn(async (request: Request) =>
    request.url.endsWith('/v1/profile')
      ? new Response(
          JSON.stringify({
            goal: 'LOSE_FAT',
            sex: 'FEMALE',
            heightCm: 165,
            birthYear: 1996,
            programChoice: 'BUILD_ONE_FOR_ME',
            schedule: { trainingDays: ['MONDAY'], checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
            units: 'METRIC',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      : new Response(null, { status: 204 }),
  );
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch, report: () => {}, kv, locale: 'en-US' });
  expect(await services.bodyFigure()).toBe('male'); // not known yet: the figure drawn until now
  await services.session.signIn(SESSION);
  await settle();
  await settle();
  expect(await services.bodyFigure()).toBe('female');
  await services.signOut();
  await settle();
  expect(await services.bodyFigure()).toBe('male');
});

test("opening without a session drops the profile's sex left on the phone (a backup restored to a new phone)", async () => {
  const kv = memoryKv();
  kv.items.set('profile.figure', 'female');
  const services = await createAppServices({ baseUrl: BASE, storage: memoryStorage(), db: nodeSqlite(), fetch: server().fetch, report: () => {}, kv, locale: 'en-US' });
  expect(kv.items.has('profile.figure')).toBe(false);
  expect(await services.bodyFigure()).toBe('male');
});
