/**
 * Each queued record goes to its contract endpoint (K-304); the answer is reduced to what the queue needs.
 */
import { createApiClient } from '@/api/client';
import { NoAnswer, type Outbound } from '@/sync/queue';
import { newClientId, sendWithApi } from '@/sync/send';

// jest-expo stubs native modules; the phone's randomUUID is swapped for Node's, the same RFC 4122 v4 generator.
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const BASE = 'https://api.example.test';
const ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function server(status: number, body: unknown) {
  return jest.fn(
    async (_request: Request) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function send(fetch: ReturnType<typeof server>) {
  return sendWithApi(createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch }));
}

const cases: [Outbound, string][] = [
  [{ kind: 'weighIn', body: { clientId: ID, measuredAt: '2026-09-30T07:00:00+03:00', kg: 81.5, source: 'MANUAL' } }, '/v1/weigh-ins'],
  [{ kind: 'waist', body: { clientId: ID, measuredOn: '2026-09-30', cm: 84 } }, '/v1/waist-measurements'],
  [{ kind: 'bodyLook', body: { clientId: ID, takenOn: '2026-09-30', level: 4 } }, '/v1/body-looks'],
  [{ kind: 'photoCheck', body: { clientId: ID, takenOn: '2026-09-30', look: 'SAME' } }, '/v1/photo-checks'],
  [{ kind: 'meal', body: { clientId: ID, eatenAt: '2026-09-30T13:00:00+03:00', slot: 'LUNCH', repeatOf: ID } }, '/v1/meals'],
  [{ kind: 'workout', body: { clientId: ID, startedAt: '2026-09-30T18:00:00+03:00' } }, '/v1/workouts'],
];

test.each(cases)('%# a %s record is posted to its endpoint with its body', async (record, path) => {
  const fetch = server(201, { ...record.body, id: 'srv-1' });
  const result = await send(fetch)(record, null);
  const request = fetch.mock.calls[0][0];
  expect(request.method).toBe('POST');
  expect(request.url).toBe(`${BASE}${path}`);
  expect(await request.json()).toEqual(record.body);
  expect(result).toEqual({ status: 201, id: 'srv-1', body: { ...record.body, id: 'srv-1' } });
});

test('a set goes under its workout, by the workout server id', async () => {
  const fetch = server(201, { id: 'set-1' });
  const record: Outbound = {
    kind: 'set',
    workoutClientId: ID,
    body: { clientId: ID, exerciseId: 'back-squat', setType: 'WORKING', reps: 5, loadKg: 100 },
  };
  await send(fetch)(record, 'wk-9');
  expect(fetch.mock.calls[0][0].url).toBe(`${BASE}/v1/workouts/wk-9/sets`);
});

test('a finish goes to its workout, by the workout server id, with the contract body only (K-405)', async () => {
  const fetch = server(200, { id: 'srv-w', clientId: ID, startedAt: '2026-09-30T18:00:00+03:00', sets: [] });
  const body = { endedAt: '2026-09-30T19:10:00+03:00', uncleanExerciseIds: ['bench_press'] };
  const result = await send(fetch)({ kind: 'finish', clientId: 'local-finish', workoutClientId: ID, body }, 'srv-w');
  const request = fetch.mock.calls[0][0];
  expect(request.method).toBe('POST');
  expect(request.url).toBe(`${BASE}/v1/workouts/srv-w/finish`);
  expect(await request.json()).toEqual(body);
  expect(result).toMatchObject({ status: 200, id: 'srv-w' });
});

test('a replay (200) is a success like the first store', async () => {
  const record = cases[0][0];
  const result = await send(server(200, { ...record.body, id: 'srv-1' }))(record, null);
  expect(result).toMatchObject({ status: 200, id: 'srv-1' });
});

test('an error keeps its status and the contract error code', async () => {
  const result = await send(server(409, { code: 'CONFLICT', message: 'x' }))(cases[0][0], null);
  expect(result).toEqual({ status: 409, errorCode: 'CONFLICT' });
});

test('no answer (the network failed, or the answer was not the contract JSON) is NoAnswer', async () => {
  const offline = jest.fn(async (_request: Request): Promise<Response> => {
    throw new TypeError('Network request failed');
  });
  await expect(send(offline)(cases[0][0], null)).rejects.toBeInstanceOf(NoAnswer);
  const portal = jest.fn(async (_request: Request) => new Response('<html>sign in to wifi</html>', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await expect(send(portal)(cases[0][0], null)).rejects.toBeInstanceOf(NoAnswer);
});

test('a set without its workout server id is a bug, not the network', async () => {
  const record: Outbound = {
    kind: 'set',
    workoutClientId: ID,
    body: { clientId: ID, exerciseId: 'back-squat', setType: 'WORKING', reps: 5, loadKg: 100 },
  };
  await expect(send(server(201, {}))(record, null)).rejects.not.toBeInstanceOf(NoAnswer);
});

test('a new clientId is a version 4 UUID, different every time', () => {
  const a = newClientId();
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(newClientId()).not.toBe(a);
});
