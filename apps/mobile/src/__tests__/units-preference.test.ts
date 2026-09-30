/**
 * The unit preference (K-310, ADR-029): the server profile is the truth (Profile.units); the phone keeps the last known
 * value so it can show units offline and at start; before there is a profile, the device region decides.
 */
import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { createUnitsPreference } from '@/units/preference';

const BASE = 'https://api.example.test';
type Profile = components['schemas']['Profile'];

const PROFILE: Profile = {
  goal: 'LOSE_FAT',
  sex: 'MALE',
  heightCm: 178,
  birthYear: 1994,
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['MONDAY', 'THURSDAY'], checkInDay: 'MONDAY', timeZone: 'America/New_York' },
  units: 'METRIC',
};

function memoryKv() {
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
function profileServer(initial: Profile | null, failPut?: number, failGet?: number) {
  let stored = initial;
  const puts: Profile[] = [];
  let offline = false;
  let holdNext = false;
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
    return json(200, body);
  });
  return {
    fetch,
    puts,
    goOffline: () => (offline = true),
    holdNextGet: () => (holdNext = true),
    release: () => release(),
  };
}

async function setup({
  profile = PROFILE as Profile | null,
  locale = 'en-US',
  failPut = undefined as number | undefined,
  failGet = undefined as number | undefined,
} = {}) {
  const kv = memoryKv();
  const server = profileServer(profile, failPut, failGet);
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch: server.fetch });
  const units = await createUnitsPreference({ kv, api, locale });
  return { kv, server, units };
}

test('with nothing known yet, the device region decides', async () => {
  expect((await setup({ locale: 'en-US' })).units.current()).toBe('IMPERIAL');
  expect((await setup({ locale: 'tr-TR' })).units.current()).toBe('METRIC');
});

test('the last known choice wins over the region, from the first moment', async () => {
  const kv = memoryKv();
  await kv.setItemAsync('units', 'METRIC');
  const server = profileServer(null);
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch: server.fetch });
  const units = await createUnitsPreference({ kv, api, locale: 'en-US' });
  expect(units.current()).toBe('METRIC');
});

test('refreshing reads the profile, keeps it and tells whoever listens', async () => {
  const { units, kv } = await setup({ locale: 'en-US' });
  const heard: string[] = [];
  units.subscribe(() => heard.push(units.current()));
  await units.refresh();
  expect(units.current()).toBe('METRIC');
  expect(kv.items.get('units')).toBe('METRIC');
  expect(heard).toEqual(['METRIC']);
});

test('refreshing before there is a profile changes nothing', async () => {
  const { units } = await setup({ profile: null, locale: 'en-US' });
  await units.refresh();
  expect(units.current()).toBe('IMPERIAL');
});

test('choosing a unit stores it in the profile — the whole profile, only the units changed', async () => {
  const { units, server, kv } = await setup();
  expect(await units.set('IMPERIAL')).toBe('profile');
  expect(server.puts).toEqual([{ ...PROFILE, units: 'IMPERIAL' }]);
  expect(units.current()).toBe('IMPERIAL');
  expect(kv.items.get('units')).toBe('IMPERIAL');
});

test('choosing before there is a profile keeps it on the phone (onboarding sends it)', async () => {
  const { units, server } = await setup({ profile: null, locale: 'tr-TR' });
  expect(await units.set('IMPERIAL')).toBe('phone');
  expect(server.puts).toEqual([]);
  expect(units.current()).toBe('IMPERIAL');
});

test('a profile the server refuses to store: the choice is not taken, and it says so', async () => {
  const { units } = await setup({ failPut: 400, locale: 'tr-TR' });
  await expect(units.set('IMPERIAL')).rejects.toThrow();
  expect(units.current()).toBe('METRIC');
});

test('offline, choosing fails and nothing changes (settings need a connection)', async () => {
  const { units, server } = await setup({ locale: 'tr-TR' });
  server.goOffline();
  await expect(units.set('IMPERIAL')).rejects.toThrow();
  expect(units.current()).toBe('METRIC');
});

test('a listener that unsubscribed hears nothing', async () => {
  const { units } = await setup();
  let heard = 0;
  const stop = units.subscribe(() => heard++);
  stop();
  await units.set('IMPERIAL');
  expect(heard).toBe(0);
});

test('forgetting (sign-out) drops the kept choice and goes back to the region', async () => {
  const { units, kv } = await setup({ locale: 'en-US' });
  await units.set('METRIC');
  await units.forget();
  expect(kv.items.has('units')).toBe(false);
  expect(units.current()).toBe('IMPERIAL');
});

test('a profile that cannot be read (not "there is none") fails the choice: nothing changes', async () => {
  const { units, kv } = await setup({ failGet: 500, locale: 'tr-TR' });
  await expect(units.set('IMPERIAL')).rejects.toThrow();
  expect(units.current()).toBe('METRIC');
  expect(kv.items.has('units')).toBe(false);
});

test('a slow refresh that answers after the user chose does not undo the choice', async () => {
  const { units, server, kv } = await setup({ locale: 'tr-TR' }); // the profile says METRIC
  server.holdNextGet();
  const refreshing = units.refresh(); // answered "METRIC" by the server, but slow to arrive
  await new Promise((r) => setTimeout(r, 0));
  await units.set('IMPERIAL');
  server.release();
  await refreshing;
  expect(units.current()).toBe('IMPERIAL');
  expect(kv.items.get('units')).toBe('IMPERIAL');
});

test("a refresh still on its way at sign-out does not bring the old account's choice back", async () => {
  const { units, server, kv } = await setup({ locale: 'en-US' }); // the profile says METRIC
  server.holdNextGet();
  const refreshing = units.refresh();
  await new Promise((r) => setTimeout(r, 0));
  await units.forget();
  server.release();
  await refreshing;
  expect(units.current()).toBe('IMPERIAL');
  expect(kv.items.has('units')).toBe(false);
});

test('a profile answer without a known unit system is ignored, not stored', async () => {
  const { units, kv } = await setup({ profile: { ...PROFILE, units: 'CUBITS' as never }, locale: 'tr-TR' });
  await units.refresh();
  expect(units.current()).toBe('METRIC');
  expect(kv.items.has('units')).toBe(false);
});

test('forgetting tells whoever listens when the system changes back', async () => {
  const { units } = await setup({ locale: 'en-US' });
  await units.set('METRIC');
  let heard = 0;
  units.subscribe(() => heard++);
  await units.forget();
  expect(heard).toBe(1);
});
