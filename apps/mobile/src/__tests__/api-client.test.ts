/**
 * The API client is typed from the contract (K3, ADR-006) and signs every request with the current session token
 * (K-303). The server is a fake fetch here; the real session store arrives in K-305 and refresh in K-304.
 */
import { type AccessTokenSource, createApiClient } from '@/api/client';
import { parseBaseUrl } from '@/api/config';

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
