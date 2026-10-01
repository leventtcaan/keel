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
  const read = await readTraining(api(() => 'offline'), kv);
  expect(read).toEqual({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: true });
});

test('offline with nothing kept: failed, no connection', async () => {
  const read = await readTraining(api(() => 'offline'), memoryKv());
  expect(read.program).toEqual({ state: 'failed', problem: 'NoConnection' });
  expect(read.kept).toBe(false);
});

test('no program on the server (404) forgets the kept one', async () => {
  const kv = memoryKv();
  await readTraining(online, kv);
  const read = await readTraining(api((path) => (path === '/v1/program' ? json({ code: 'NOT_FOUND' }, 404) : json(EXERCISES))), kv);
  expect(read.program).toEqual({ state: 'none' });
  expect((await readTraining(api(() => 'offline'), kv)).program).toEqual({ state: 'failed', problem: 'NoConnection' });
});

test('signing out forgets both', async () => {
  const kv = memoryKv();
  const cache = createTrainingCache(kv);
  await cache.read(online);
  await cache.forget();
  expect(kv.map.size).toBe(0);
});

test('a read still on its way when the user signs out keeps nothing: the program was the last account\'s', async () => {
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
  const read = await readTraining(api(() => 'offline'), kv);
  expect(read.program).toEqual({ state: 'failed', problem: 'NoConnection' });
});
