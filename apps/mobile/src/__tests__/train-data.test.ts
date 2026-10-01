/**
 * The program and the exercise catalog for the Train tab and the session (K-405): read from the server, and kept on the
 * phone so a workout starts and runs offline. A kept copy says it is one; the server's "none" (404) forgets it.
 */
import { createApiClient } from '@/api/client';
import { createTrainingCache } from '@/train/trainData';
import type { KeyValue } from '@/units/preference';

const BASE = 'https://api.example.test';
const PROGRAM = { id: 'p1', source: 'GENERATED', days: [] };
const EXERCISES = [{ id: 'bench_press' }];

function memoryKv(): KeyValue & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (key) => map.get(key) ?? null,
    setItemAsync: async (key, value) => void map.set(key, value),
    removeItemAsync: async (key) => map.delete(key),
  };
}

function api(answer: (path: string) => Response | 'offline') {
  return createApiClient({
    baseUrl: BASE,
    accessToken: async () => 'tok',
    fetch: async (request: Request) => {
      const found = answer(new URL(request.url).pathname);
      if (found === 'offline') throw new TypeError('Network request failed');
      return found;
    },
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const online = api((path) => (path === '/v1/program' ? json(PROGRAM) : json(EXERCISES)));
const readTraining = (client: ReturnType<typeof api>, kv: KeyValue) => createTrainingCache(kv).read(client);

test('read online: the server answer, and a copy kept', async () => {
  const kv = memoryKv();
  const read = await readTraining(online, kv);
  expect(read).toEqual({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false });
  expect(kv.map.size).toBe(2);
});

test('offline: the kept copy, saying it is one', async () => {
  const kv = memoryKv();
  await readTraining(online, kv);
  const read = await readTraining(
    api(() => 'offline'),
    kv,
  );
  expect(read).toEqual({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: true });
});

test('one part from the kept copy (the server erred on it) marks the whole read as kept', async () => {
  const kv = memoryKv();
  await readTraining(online, kv);
  const read = await readTraining(
    api((path) => (path === '/v1/program' ? json({ code: 'X' }, 500) : json(EXERCISES))),
    kv,
  );
  expect(read).toEqual({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: true });
});

test('a read started after a sign-out keeps its copy: the guard is per read, not for good', async () => {
  const kv = memoryKv();
  const cache = createTrainingCache(kv);
  await cache.forget();
  await cache.read(online);
  expect((await cache.read(api(() => 'offline'))).kept).toBe(true);
});

test('offline with nothing kept: failed, no connection', async () => {
  const read = await readTraining(
    api(() => 'offline'),
    memoryKv(),
  );
  expect(read.program).toEqual({ state: 'failed', problem: 'NoConnection' });
  expect(read.kept).toBe(false);
});

test('no program on the server (404) forgets the kept one', async () => {
  const kv = memoryKv();
  await readTraining(online, kv);
  const read = await readTraining(
    api((path) => (path === '/v1/program' ? json({ code: 'NOT_FOUND' }, 404) : json(EXERCISES))),
    kv,
  );
  expect(read.program).toEqual({ state: 'none' });
  expect(
    (
      await readTraining(
        api(() => 'offline'),
        kv,
      )
    ).program,
  ).toEqual({ state: 'failed', problem: 'NoConnection' });
});

test('signing out forgets both', async () => {
  const kv = memoryKv();
  const cache = createTrainingCache(kv);
  await cache.read(online);
  await cache.forget();
  expect(kv.map.size).toBe(0);
});

test("a read still on its way when the user signs out keeps nothing: the program was the last account's", async () => {
  const kv = memoryKv();
  const cache = createTrainingCache(kv);
  let answer: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (answer = resolve));
  const slow = createApiClient({
    baseUrl: BASE,
    accessToken: async () => 'tok',
    fetch: async (request: Request) => {
      await gate;
      return new URL(request.url).pathname === '/v1/program' ? json(PROGRAM) : json(EXERCISES);
    },
  });
  const reading = cache.read(slow);
  await cache.forget();
  answer();
  await reading;
  expect(kv.map.size).toBe(0);
});

test('a kept copy that cannot be read is no copy', async () => {
  const kv = memoryKv();
  kv.map.set('train.program', '{not json');
  const read = await readTraining(
    api(() => 'offline'),
    kv,
  );
  expect(read.program).toEqual({ state: 'failed', problem: 'NoConnection' });
});

describe('the gym in use (K-417): its weights kept on the phone, for the warm-ups and the plates offline', () => {
  const GYMS = [
    { id: 'g1', name: 'Home', current: false, platesKg: [10], dumbbellsKg: [], machines: [] },
    {
      id: 'g2',
      name: 'Club',
      current: true,
      barKg: 20,
      platesKg: [20, 10, 5],
      dumbbellsKg: [10, 12],
      stackStepKg: 5,
      machines: [{ exerciseId: 'leg_extension', stepKg: 7 }],
    },
  ];
  const withGyms = (gyms: unknown) => api((path) => (path === '/v1/program' ? json(PROGRAM) : path === '/v1/gyms' ? json(gyms) : json(EXERCISES)));
  const WEIGHTS = { barKg: 20, platesKg: [20, 10, 5], dumbbellsKg: [10, 12], stackStepKg: 5, machineStepsKg: { leg_extension: 7 } };

  test("online: the current gym's weights, machines by move; kept", async () => {
    const kv = memoryKv();
    expect((await readTraining(withGyms(GYMS), kv)).gym).toEqual(WEIGHTS);
    expect(
      (
        await readTraining(
          api(() => 'offline'),
          kv,
        )
      ).gym,
    ).toEqual(WEIGHTS);
  });

  test('a gym without a bar or a stack step has none', async () => {
    const read = await readTraining(withGyms([{ ...GYMS[0], current: true }]), memoryKv());
    expect(read.gym).toEqual({ barKg: null, platesKg: [10], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} });
  });

  test('no gym in use: none, and the kept one is forgotten', async () => {
    const kv = memoryKv();
    await readTraining(withGyms(GYMS), kv);
    expect((await readTraining(withGyms([GYMS[0]]), kv)).gym).toBeUndefined();
    expect(
      (
        await readTraining(
          api(() => 'offline'),
          kv,
        )
      ).gym,
    ).toBeUndefined();
  });

  test('the gyms unread and nothing kept: no gym, and the program is not marked as a kept copy for it', async () => {
    const read = await readTraining(
      api((path) => (path === '/v1/gyms' ? json({ code: 'X' }, 500) : path === '/v1/program' ? json(PROGRAM) : json(EXERCISES))),
      memoryKv(),
    );
    expect(read.gym).toBeUndefined();
    expect(read.kept).toBe(false);
  });

  test('the gym from its kept copy with the program fresh: the gym is there, and the read is not a kept copy', async () => {
    const kv = memoryKv();
    await readTraining(withGyms(GYMS), kv);
    const read = await readTraining(
      api((path) => (path === '/v1/gyms' ? json({ code: 'X' }, 500) : path === '/v1/program' ? json(PROGRAM) : json(EXERCISES))),
      kv,
    );
    expect(read.gym).toEqual(WEIGHTS);
    expect(read.kept).toBe(false);
  });

  test('signing out forgets the gym too', async () => {
    const kv = memoryKv();
    const cache = createTrainingCache(kv);
    await cache.read(withGyms(GYMS));
    await cache.forget();
    expect(kv.map.size).toBe(0);
  });
});

describe("the workouts behind a move's history (K-415): the server's last year, kept on the phone", () => {
  const WORKOUTS = [{ id: 'srv-1', clientId: 'w1', startedAt: '2026-09-21T17:00:00Z', sets: [] }];
  let asked: URL | null = null;
  const listing = api((path) => (path === '/v1/workouts' ? json(WORKOUTS) : json([])));
  const watching = createApiClient({
    baseUrl: BASE,
    accessToken: async () => 'tok',
    fetch: async (request: Request) => {
      asked = new URL(request.url);
      return json(WORKOUTS);
    },
  });

  test('read online: the last history_days days, ending today on the phone; kept', async () => {
    const kv = memoryKv();
    expect(await createTrainingCache(kv).history(watching, new Date(2026, 9, 1, 9))).toEqual({ state: 'ready', value: WORKOUTS });
    expect(asked?.searchParams.get('to')).toBe('2026-10-01');
    expect(asked?.searchParams.get('from')).toBe('2025-10-02'); // 365 days, today included
    expect(
      await createTrainingCache(kv).history(
        api(() => 'offline'),
        new Date(2026, 9, 1, 9),
      ),
    ).toEqual({ state: 'ready', value: WORKOUTS });
  });

  test('signing out forgets it', async () => {
    const kv = memoryKv();
    const cache = createTrainingCache(kv);
    await cache.history(listing, new Date(2026, 9, 1, 9));
    await cache.forget();
    expect(kv.map.size).toBe(0);
  });
});

test("a history read still on its way when the user signs out keeps nothing: the workouts were the last account's", async () => {
  const kv = memoryKv();
  const cache = createTrainingCache(kv);
  let answer: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (answer = resolve));
  const slow = createApiClient({
    baseUrl: BASE,
    accessToken: async () => 'tok',
    fetch: async () => {
      await gate;
      return json([{ id: 'srv-1', clientId: 'w1', startedAt: '2026-09-21T17:00:00Z', sets: [] }]);
    },
  });
  const reading = cache.history(slow, new Date(2026, 9, 1, 9));
  await cache.forget();
  answer();
  await reading;
  expect(kv.map.size).toBe(0);
});
