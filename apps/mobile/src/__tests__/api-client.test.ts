/**
 * The API client is typed from the contract (K3, ADR-006) and signs every request with the current session token
 * (K-303). The server is a fake fetch here; the real session store arrives in K-305 and refresh in K-304.
 */
import * as fs from 'fs';
import * as path from 'path';

import { type AccessTokenSource, createApiClient } from '@/api/client';
import { clientFeatures } from '@/api/features';
import { parseBaseUrl } from '@/api/config';
import { setActiveLocale } from '@/copy/locales';

const ROOT = path.resolve(__dirname, '../../../..');

function fakeServer(body: unknown = { status: 'UP' }, status = 200) {
  return jest.fn(
    async (_request: Request) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

const noSession: AccessTokenSource = async () => null;

test('a request goes to the base URL plus the contract path', async () => {
  const fetch = fakeServer();
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: noSession, fetch });
  await api.GET('/health');
  expect(fetch.mock.calls[0][0].url).toBe('https://api.example.test/health');
});

test('the typed response body comes back as data', async () => {
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: noSession, fetch: fakeServer() });
  const { data, error } = await api.GET('/health');
  expect(error).toBeUndefined();
  expect(data?.status).toBe('UP');
});

test('with a session, every request carries the bearer token', async () => {
  const fetch = fakeServer();
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 'tok-1', fetch });
  await api.GET('/health');
  expect(fetch.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer tok-1');
});

test('without a session, no Authorization header is sent', async () => {
  const fetch = fakeServer();
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: noSession, fetch });
  await api.GET('/health');
  expect(fetch.mock.calls[0][0].headers.has('Authorization')).toBe(false);
});

test('the token is read for each request, so a rotated token is used at once', async () => {
  const fetch = fakeServer();
  const tokens = ['tok-1', 'tok-2'];
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => tokens.shift() ?? null, fetch });
  await api.GET('/health');
  await api.GET('/health');
  expect(fetch.mock.calls.map(([request]) => request.headers.get('Authorization'))).toEqual([
    'Bearer tok-1',
    'Bearer tok-2',
  ]);
});

test('a failing token source fails the request instead of sending it unsigned', async () => {
  const fetch = fakeServer();
  const api = createApiClient({
    baseUrl: 'https://api.example.test',
    accessToken: async () => {
      throw new Error('keychain locked');
    },
    fetch,
  });
  await expect(api.GET('/health')).rejects.toThrow('keychain locked');
  expect(fetch).not.toHaveBeenCalled();
});

test('an error response comes back as error, typed from the contract', async () => {
  const api = createApiClient({
    baseUrl: 'https://api.example.test',
    accessToken: noSession,
    fetch: fakeServer({ code: 'validation', message: 'bad' }, 400),
  });
  const { data, error, response } = await api.GET('/health');
  expect(data).toBeUndefined();
  expect(response.status).toBe(400);
  expect(error).toEqual({ code: 'validation', message: 'bad' });
});

test('a redirect is refused, so the session token never follows it to another host', async () => {
  const fetch = fakeServer();
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 'tok-1', fetch });
  await api.GET('/health');
  expect(fetch.mock.calls[0][0].redirect).toBe('error');
});

describe('base URL from configuration (K2: never in code)', () => {
  test('reads the configured value and drops a trailing slash', () => {
    expect(parseBaseUrl('https://api.example.test/')).toBe('https://api.example.test');
  });

  test('missing configuration fails loudly with the variable name', () => {
    expect(() => parseBaseUrl(undefined)).toThrow(/EXPO_PUBLIC_API_URL/);
    expect(() => parseBaseUrl('  ')).toThrow(/EXPO_PUBLIC_API_URL/);
  });
});

describe('the features the phone shows (ADR-091 Ek 1, K-1202)', () => {
  test('every request says the phone shows a locked call, signed in or not', async () => {
    const fetch = fakeServer();
    const signedOut = createApiClient({ baseUrl: 'https://api.example.test', accessToken: noSession, fetch });
    const signedIn = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 'tok-1', fetch });
    await signedOut.GET('/health');
    await signedIn.GET('/health');
    expect(fetch.mock.calls.map(([request]) => request.headers.get('X-Keel-Features'))).toEqual(['locked-calls', 'locked-calls']);
  });

  test('a request retried after a refresh says it again', async () => {
    const fetch = jest
      .fn<Promise<Response>, [Request]>()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"status":"UP"}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 'old', refresh: async () => 'new', fetch });
    await api.GET('/health');
    expect(fetch.mock.calls.map(([request]) => request.headers.get('X-Keel-Features'))).toEqual(['locked-calls', 'locked-calls']);
  });

  test('the header name and its token are the ones the server reads (data/parameters/quota.yaml): one source, no drift', () => {
    const quota = fs.readFileSync(path.join(ROOT, 'data/parameters/quota.yaml'), 'utf8');
    const valueOf = (key: string) => new RegExp(`- key: ${key}\\n\\s+value: "([^"]+)"`).exec(quota)?.[1];
    expect(clientFeatures.header).toBe(valueOf('client_features_header'));
    expect(clientFeatures.lockedCalls).toBe(valueOf('locked_calls_feature_token'));
  });
});

test('every request says the language showing in Accept-Language (K-1211)', async () => {
  const fetch = fakeServer();
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: noSession, fetch });
  try {
    await api.GET('/health');
    expect(fetch.mock.calls[0][0].headers.get('Accept-Language')).toBe('en');
    setActiveLocale('tr');
    await api.GET('/health');
    expect(fetch.mock.calls[1][0].headers.get('Accept-Language')).toBe('tr');
  } finally {
    setActiveLocale('en');
  }
});
