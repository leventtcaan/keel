/**
 * Sign in with Apple (K-305, ADR-011, ADR-025). The phone makes a random nonce, sends Apple its SHA-256 (lowercase hex)
 * and our server the raw value; the server checks that Apple's token carries the hash (K-203 AppleIdentityVerifier),
 * so a token caught from someone else's sign-in is useless here. No name, no email is asked for (ADR-025 §3).
 */
import { createHash } from 'node:crypto';

import { createApiClient } from '@/api/client';
import { type AppleAuth, deviceNonce, signInWithApple } from '@/session/appleSignIn';
import { type StoredSession, createSessionManager } from '@/session/session';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(crypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) => crypto.createHash('sha256').update(data).digest('hex'),
  };
});

const BASE = 'https://api.example.test';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function memorySession() {
  let value: StoredSession | null = null;
  return createSessionManager({
    storage: { load: async () => value, save: async (s) => void (value = s), clear: async () => void (value = null) },
    refresh: async () => ({ kind: 'rejected' }),
  });
}

function server(status: number, body: unknown) {
  return jest.fn(
    async (_request: Request) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

const SESSION = { accessToken: 'a1', accessTokenExpiresAt: '2026-09-30T12:15:00Z', refreshToken: 'r1', newAccount: true };

function apple(credential: Partial<{ identityToken: string | null; authorizationCode: string | null }> = {}): AppleAuth & { signInAsync: jest.Mock } {
  return {
    signInAsync: jest.fn(async () => ({ identityToken: 'apple-jwt', authorizationCode: 'code-1', ...credential })),
  };
}

function setup(fetch: ReturnType<typeof server>, auth = apple()) {
  const session = memorySession();
  const api = createApiClient({ baseUrl: BASE, accessToken: session.accessToken, fetch });
  const nonce = { raw: () => 'raw-nonce-123', hash: async (raw: string) => sha256(raw) };
  return { session, run: () => signInWithApple({ apple: auth, nonce, api, session }), auth };
}

test('Apple gets the SHA-256 of the nonce and no scopes; the server gets the raw nonce, the token and the code', async () => {
  const fetch = server(200, SESSION);
  const { run, auth } = setup(fetch);
  await run();
  expect(auth.signInAsync).toHaveBeenCalledWith({ requestedScopes: [], nonce: sha256('raw-nonce-123') });
  const request = fetch.mock.calls[0][0];
  expect(request.url).toBe(`${BASE}/v1/auth/apple`);
  expect(await request.json()).toEqual({ identityToken: 'apple-jwt', nonce: 'raw-nonce-123', authorizationCode: 'code-1' });
});

test('a session from the server is stored, and a first sign-in says so', async () => {
  const { run, session } = setup(server(200, SESSION));
  expect(await run()).toEqual({ kind: 'signedIn', newAccount: true });
  expect(await session.accessToken()).toBe('a1');
});

test('no authorization code from Apple: the request simply leaves it out', async () => {
  const fetch = server(200, SESSION);
  await setup(fetch, apple({ authorizationCode: null })).run();
  expect(await fetch.mock.calls[0][0].json()).toEqual({ identityToken: 'apple-jwt', nonce: 'raw-nonce-123' });
});

test('the user closing the Apple sheet is not an error', async () => {
  const auth = apple();
  auth.signInAsync.mockRejectedValueOnce(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
  const fetch = server(200, SESSION);
  expect(await setup(fetch, auth).run()).toEqual({ kind: 'canceled' });
  expect(fetch).not.toHaveBeenCalled();
});

test('Apple failing another way is a failure, and nothing is sent', async () => {
  const auth = apple();
  auth.signInAsync.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'ERR_REQUEST_FAILED' }));
  const fetch = server(200, SESSION);
  expect(await setup(fetch, auth).run()).toEqual({ kind: 'failed', reason: 'APPLE' });
  expect(fetch).not.toHaveBeenCalled();
});

test('Apple without an identity token is a failure', async () => {
  const fetch = server(200, SESSION);
  expect(await setup(fetch, apple({ identityToken: null })).run()).toEqual({ kind: 'failed', reason: 'APPLE' });
  expect(fetch).not.toHaveBeenCalled();
});

test('the server refusing the token is a failure, and no session is stored', async () => {
  const { run, session } = setup(server(401, { code: 'UNAUTHENTICATED', message: 'x' }));
  expect(await run()).toEqual({ kind: 'failed', reason: 'REFUSED' });
  expect(await session.accessToken()).toBeNull();
});

test('no answer from the server is its own failure', async () => {
  const fetch = jest.fn(async (_request: Request): Promise<Response> => {
    throw new TypeError('Network request failed');
  });
  expect(await setup(fetch).run()).toEqual({ kind: 'failed', reason: 'NO_ANSWER' });
});

describe('the device nonce', () => {
  test('raw: 32 random bytes as hex, new every time', () => {
    const a = deviceNonce.raw();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(deviceNonce.raw()).not.toBe(a);
  });

  test('hash: lowercase hex SHA-256, what the server recomputes', async () => {
    expect(await deviceNonce.hash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
