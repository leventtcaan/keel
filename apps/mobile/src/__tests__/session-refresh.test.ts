/**
 * Single-flight refresh (K-311, ADR-025). The server rotates the refresh token on every use and, when a used one comes
 * back, revokes the whole family — so two refreshes racing each other sign the user out. Every request that meets a
 * 401 must share one refresh and retry once with the new token.
 */
import { createApiClient } from '@/api/client';
import {
  type RefreshOutcome,
  type SessionStorage,
  type StoredSession,
  createSessionManager,
  refreshWithServer,
} from '@/session/session';

const BASE = 'https://api.example.test';

function memoryStorage(initial: StoredSession | null): SessionStorage & { value: StoredSession | null } {
  const box = {
    value: initial,
    load: async () => box.value,
    save: async (session: StoredSession) => {
      box.value = session;
    },
    clear: async () => {
      box.value = null;
    },
  };
  return box;
}

function stored(accessToken: string, refreshToken: string): StoredSession {
  return { accessToken, refreshToken, accessTokenExpiresAt: '2026-09-30T12:15:00Z' };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** A server that accepts only `valid` as the bearer token; everything else is 401. Records what it saw. */
function tokenServer(valid: () => string) {
  const seen: { url: string; auth: string | null; body: string }[] = [];
  const fetch = jest.fn(async (request: Request) => {
    const body = await request.text();
    const auth = request.headers.get('Authorization');
    seen.push({ url: request.url, auth, body });
    const status = auth === `Bearer ${valid()}` ? 200 : 401;
    return new Response(JSON.stringify(status === 200 ? { status: 'UP' } : { code: 'UNAUTHENTICATED', message: 'x' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { fetch, seen };
}

function renewed(accessToken: string, refreshToken: string): RefreshOutcome {
  return { kind: 'renewed', session: stored(accessToken, refreshToken) };
}

describe('single-flight refresh', () => {
  test('requests that meet 401 together share one refresh and each retries once with the new token', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const valid = 'new';
    const server = tokenServer(() => valid);
    const gate = deferred<RefreshOutcome>();
    const refresh = jest.fn(() => gate.promise);
    const session = createSessionManager({ storage, refresh });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });

    const all = Promise.all([api.GET('/health'), api.GET('/health'), api.GET('/health')]);
    await new Promise((r) => setTimeout(r, 0));
    gate.resolve(renewed('new', 'r2'));
    const results = await all;

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('r1');
    expect(results.map((r) => r.response.status)).toEqual([200, 200, 200]);
    expect(server.seen.filter((s) => s.auth === 'Bearer new')).toHaveLength(3);
    expect(server.fetch).toHaveBeenCalledTimes(6);
    expect(storage.value).toEqual(stored('new', 'r2'));
  });

  test('a 401 that lands after the refresh finished does not refresh again: it retries with the current token', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const refresh = jest.fn(async () => renewed('new', 'r2'));
    const session = createSessionManager({ storage, refresh });

    expect(await session.refresh('old')).toBe('new');
    // A request signed with 'old' before the refresh comes back late with 401:
    expect(await session.refresh('old')).toBe('new');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('a 401 that lands after a rejection finds no session: null, and no second refresh', async () => {
    const refresh = jest.fn(async (): Promise<RefreshOutcome> => ({ kind: 'rejected' }));
    const session = createSessionManager({ storage: memoryStorage(stored('old', 'r1')), refresh });

    expect(await session.refresh('old')).toBeNull();
    expect(await session.refresh('old')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('a refresh the server rejects signs out: the session is cleared and the 401 comes back, no loop', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const server = tokenServer(() => 'never');
    const refresh = jest.fn(async (): Promise<RefreshOutcome> => ({ kind: 'rejected' }));
    const session = createSessionManager({ storage, refresh });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });

    const { response } = await api.GET('/health');

    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(server.fetch).toHaveBeenCalledTimes(1);
    expect(storage.value).toBeNull();
    expect(await session.accessToken()).toBeNull();
  });

  test('a refresh that fails in transit keeps the session and lets a later refresh try again', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const refresh = jest
      .fn<Promise<RefreshOutcome>, [string]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(renewed('new', 'r2'));
    const session = createSessionManager({ storage, refresh });

    expect(await session.refresh('old')).toBeNull();
    expect(storage.value).toEqual(stored('old', 'r1'));
    expect(await session.refresh('old')).toBe('new');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('a retried request carries the same body it was first sent with', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const server = tokenServer(() => 'new');
    const session = createSessionManager({ storage, refresh: async () => renewed('new', 'r2') });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });
    const body = { clientId: '0b3f1c2e-8a4d-4c7e-9f1a-2b3c4d5e6f70', measuredAt: '2026-09-30T07:00:00+03:00', kg: 81.5, source: 'MANUAL' as const };

    await api.POST('/v1/weigh-ins', { body });

    expect(server.seen).toHaveLength(2);
    expect(JSON.parse(server.seen[1].body)).toEqual(body);
    expect(server.seen[1].auth).toBe('Bearer new');
  });

  test('a request is retried at most once, even if the retry meets 401 again', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const server = tokenServer(() => 'never');
    const refresh = jest.fn(async () => renewed('new', 'r2'));
    const session = createSessionManager({ storage, refresh });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });

    const { response } = await api.GET('/health');

    expect(response.status).toBe(401);
    expect(server.fetch).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('only 401 is refreshed: another error is the answer as it is', async () => {
    const refresh = jest.fn(async () => renewed('new', 'r2'));
    const session = createSessionManager({ storage: memoryStorage(stored('old', 'r1')), refresh });
    const fetch = jest.fn(async (_request: Request) => new Response('{"code":"CONSENT_REQUIRED","message":"x"}', { status: 403 }));
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch });

    const { response } = await api.GET('/health');

    expect(response.status).toBe(403);
    expect(refresh).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('signed out, a 401 is passed through without a refresh', async () => {
    const server = tokenServer(() => 'never');
    const refresh = jest.fn(async () => renewed('new', 'r2'));
    const session = createSessionManager({ storage: memoryStorage(null), refresh });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });

    const { response } = await api.GET('/health');

    expect(response.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
    expect(server.fetch).toHaveBeenCalledTimes(1);
  });

  test('sign-in endpoints are never retried: their 401 is the answer', async () => {
    const server = tokenServer(() => 'never');
    const refresh = jest.fn(async () => renewed('new', 'r2'));
    const session = createSessionManager({ storage: memoryStorage(stored('old', 'r1')), refresh });
    const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, refresh: session.refresh, fetch: server.fetch });

    await api.POST('/v1/auth/apple', { body: { identityToken: 'x', nonce: 'n' } });

    expect(refresh).not.toHaveBeenCalled();
    expect(server.fetch).toHaveBeenCalledTimes(1);
  });

  test('sign in stores the session; sign out clears it', async () => {
    const storage = memoryStorage(null);
    const session = createSessionManager({ storage, refresh: async () => ({ kind: 'rejected' }) });

    await session.signIn(stored('a', 'r'));
    expect(await session.accessToken()).toBe('a');
    await session.signOut();
    expect(await session.accessToken()).toBeNull();
    expect(storage.value).toBeNull();
  });
});

/** A keychain whose writes land only when flushed — the real one is slow and asynchronous. */
function slowStorage(initial: StoredSession | null) {
  const box = memoryStorage(initial);
  const pending: (() => void)[] = [];
  const later = (write: () => Promise<void>) => new Promise<void>((resolve) => pending.push(() => void write().then(resolve)));
  return {
    box,
    storage: {
      load: box.load,
      save: (session: StoredSession) => later(() => box.save(session)),
      clear: () => later(() => box.clear()),
    } satisfies SessionStorage,
    flush: () => pending.splice(0).forEach((write) => write()),
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('the session while a refresh is in flight', () => {
  test('signing out during a refresh stays signed out: the late answer is dropped', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const gate = deferred<RefreshOutcome>();
    const session = createSessionManager({ storage, refresh: () => gate.promise });

    const refreshing = session.refresh('old');
    await tick();
    await session.signOut();
    gate.resolve(renewed('new', 'r2'));

    expect(await refreshing).toBeNull();
    expect(storage.value).toBeNull();
    expect(await session.accessToken()).toBeNull();
  });

  test('signing in during a refresh that is then rejected keeps the new session', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    const gate = deferred<RefreshOutcome>();
    const session = createSessionManager({ storage, refresh: () => gate.promise });

    const refreshing = session.refresh('old');
    await tick();
    await session.signIn(stored('fresh', 'rf'));
    gate.resolve({ kind: 'rejected' });
    await refreshing;

    expect(storage.value).toEqual(stored('fresh', 'rf'));
    expect(await session.accessToken()).toBe('fresh');
  });

  test('a 401 arriving before the slow keychain has saved the renewed session uses it, never the spent refresh token', async () => {
    const slow = slowStorage(stored('old', 'r1'));
    const gate = deferred<RefreshOutcome>();
    const refresh = jest.fn((_token: string) => gate.promise);
    const session = createSessionManager({ storage: slow.storage, refresh });

    const first = session.refresh('old');
    await tick();
    gate.resolve(renewed('new', 'r2'));
    await tick();
    const second = session.refresh('old');
    slow.flush();

    expect(await Promise.all([first, second])).toEqual(['new', 'new']);
    expect(refresh.mock.calls.map(([token]) => token)).toEqual(['r1']);
  });

  test('a 401 arriving before the slow keychain has cleared a rejected session gets null, no second refresh', async () => {
    const slow = slowStorage(stored('old', 'r1'));
    const gate = deferred<RefreshOutcome>();
    const refresh = jest.fn((_token: string) => gate.promise);
    const session = createSessionManager({ storage: slow.storage, refresh });

    const first = session.refresh('old');
    await tick();
    gate.resolve({ kind: 'rejected' });
    await tick();
    const second = session.refresh('old');
    slow.flush();

    expect(await Promise.all([first, second])).toEqual([null, null]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('a sign-in during the first, slow keychain read is not overwritten by what the read finds', async () => {
    const storage = memoryStorage(null);
    const read = deferred<StoredSession | null>();
    storage.load = () => read.promise;
    const session = createSessionManager({ storage, refresh: async () => ({ kind: 'rejected' }) });

    const reading = session.accessToken();
    await session.signIn(stored('fresh', 'rf'));
    read.resolve(null);

    expect(await reading).toBe('fresh');
    expect(await session.accessToken()).toBe('fresh');
  });

  test('a keychain that fails to save the renewed session fails the request, but the spent refresh token is not sent again', async () => {
    const storage = memoryStorage(stored('old', 'r1'));
    storage.save = async () => {
      throw new Error('keychain locked');
    };
    const refresh = jest.fn(async (_token: string) => renewed('new', 'r2'));
    const session = createSessionManager({ storage, refresh });

    await expect(session.refresh('old')).rejects.toThrow('keychain locked');
    expect(await session.refresh('old')).toBe('new');
    expect(await session.accessToken()).toBe('new');
    expect(refresh.mock.calls.map(([token]) => token)).toEqual(['r1']);
  });
});

describe('the refresh call to the server', () => {
  function server(status: number, body: unknown) {
    return jest.fn(
      async (_request: Request) =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
  }

  test('200 is a renewed session, sent to the refresh endpoint with the refresh token and no bearer', async () => {
    const fetch = server(200, { ...stored('a2', 'r2'), newAccount: false });
    const outcome = await refreshWithServer({ baseUrl: BASE, fetch })('r1');
    expect(outcome).toEqual(renewed('a2', 'r2'));
    const request = fetch.mock.calls[0][0];
    expect(request.url).toBe(`${BASE}/v1/auth/refresh`);
    expect(request.headers.has('Authorization')).toBe(false);
    expect(await request.json()).toEqual({ refreshToken: 'r1' });
  });

  test('401 means the refresh token is dead: rejected', async () => {
    const outcome = await refreshWithServer({ baseUrl: BASE, fetch: server(401, { code: 'UNAUTHENTICATED', message: 'x' }) })('r1');
    expect(outcome).toEqual({ kind: 'rejected' });
  });

  test('400 means the refresh token is malformed: rejected too', async () => {
    const outcome = await refreshWithServer({ baseUrl: BASE, fetch: server(400, { code: 'VALIDATION_FAILED', message: 'x' }) })('r1');
    expect(outcome).toEqual({ kind: 'rejected' });
  });

  test('a server error is not a rejection: it throws, so the session is kept', async () => {
    await expect(
      refreshWithServer({ baseUrl: BASE, fetch: server(503, { code: 'UNAVAILABLE', message: 'x' }) })('r1'),
    ).rejects.toThrow();
  });
});
