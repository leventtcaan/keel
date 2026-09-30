/**
 * A profile server for tests (K-310, K-306): GET answers the stored profile (or 404), PUT stores it. `failPut` answers
 * PUT with that status, `failGet` the GET. `holdNextGet` keeps the next GET's answer (as it was when asked) until
 * `release()` — a slow network. And a key-value store in memory (expo-sqlite/kv-store's shape).
 */
import type { components } from '@/api/schema';

export const BASE = 'https://api.example.test';
export type Profile = components['schemas']['Profile'];

export const PROFILE: Profile = {
  goal: 'LOSE_FAT',
  sex: 'MALE',
  heightCm: 178,
  birthYear: 1994,
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['MONDAY', 'THURSDAY'], checkInDay: 'MONDAY', timeZone: 'America/New_York' },
  units: 'METRIC',
};

export function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}

/**
 * A profile server: GET answers the stored profile (or 404), PUT stores it; `failPut` answers PUT with that status,
 * `failGet` the GET. `holdNextGet` keeps the next GET's answer (as it was when asked) until `release()` — a slow network.
 */
export function profileServer(initial: Profile | null, failPut?: number, failGet?: number) {
  let stored = initial;
  const puts: Profile[] = [];
  let offline = false;
  let holdNext = false;
  let holdNextPut = false;
  let release = () => {};
  const fetch = jest.fn(async (request: Request) => {
    if (offline) throw new TypeError('Network request failed');
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'GET') {
      if (failGet !== undefined) return json(failGet, { code: 'UNAVAILABLE', message: 'x' });
      const answer = stored === null ? json(404, { code: 'NOT_FOUND', message: 'x' }) : json(200, stored);
      if (!holdNext) return answer;
      holdNext = false;
      return new Promise<Response>((resolve) => (release = () => resolve(answer)));
    }
    if (failPut !== undefined) return json(failPut, { code: 'VALIDATION_FAILED', message: 'x' });
    const body = (await request.json()) as Profile;
    puts.push(body);
    stored = body;
    if (!holdNextPut) return json(200, body);
    holdNextPut = false;
    return new Promise<Response>((resolve) => (release = () => resolve(json(200, body))));
  });
  return {
    fetch,
    puts,
    goOffline: () => (offline = true),
    holdNextGet: () => (holdNext = true),
    holdNextPut: () => (holdNextPut = true),
    release: () => release(),
  };
}

