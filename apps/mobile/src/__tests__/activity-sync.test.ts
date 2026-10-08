/**
 * Steps, sleep and active energy from Apple Health (K-404, ADR-018 §2): read only with both consents — Apple Health's to
 * read, the health data consent to keep (K-309 review: the Health permission can outlive a withdrawn health data
 * consent) — and stopped the moment either is withdrawn. One activity day per calendar day, sent when its values are
 * new; sleep is the time asleep, each night counted once even when a watch and a phone both recorded it.
 */
import type { HealthAccess, HealthSleep } from '@/health/health';
import { sleepMinutesByDay, syncActivityDays } from '@/health/activitySync';
import { localDay } from '@/today/today';

const at = (iso: string) => new Date(iso).toISOString();
const night = (start: string, end: string, asleep = true): HealthSleep => ({ start: at(start), end: at(end), asleep });

describe('sleepMinutesByDay', () => {
  test('a night that crosses midnight belongs to the day one wakes up', () => {
    const minutes = sleepMinutesByDay([night('2026-09-29T23:00:00', '2026-09-30T06:30:00')]);
    expect(minutes).toEqual({ [localDay(new Date('2026-09-30T06:30:00'))]: 450 });
  });

  test('a watch and a phone recording the same night count it once', () => {
    const minutes = sleepMinutesByDay([night('2026-09-29T23:00:00', '2026-09-30T06:00:00'), night('2026-09-29T23:30:00', '2026-09-30T06:30:00')]);
    expect(Object.values(minutes)).toEqual([450]);
  });

  test('in bed and awake are not sleep; a nap the same day adds', () => {
    const minutes = sleepMinutesByDay([
      night('2026-09-29T23:00:00', '2026-09-30T06:00:00'),
      night('2026-09-30T06:00:00', '2026-09-30T06:40:00', false),
      night('2026-09-30T14:00:00', '2026-09-30T14:30:00'),
    ]);
    expect(Object.values(minutes)).toEqual([450]);
  });
});

function health(totals: Awaited<ReturnType<HealthAccess['readDailyTotals']>>, sleep: HealthSleep[], available = true) {
  const asked: string[] = [];
  const access: HealthAccess = {
    available,
    requestRead: async () => {},
    readWeights: async () => [],
    readDailyTotals: async () => (asked.push('totals'), totals),
    readSleep: async () => (asked.push('sleep'), sleep),
    readWatchActiveEnergy: async () => undefined,
    readCardioWorkouts: async () => [],
  };
  return { access, asked };
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
function api() {
  const sent: unknown[] = [];
  return {
    sent,
    PUT: jest.fn(
      async (_path: string, init: { body: unknown }) => (sent.push(init.body), { data: init.body, response: new Response(null, { status: 200 }) }),
    ),
  };
}

const NOW = new Date('2026-10-01T18:00:00');
const TODAY = localDay(NOW);
const YESTERDAY = localDay(new Date('2026-09-30T12:00:00'));

test('with both consents: each day with something to say, steps and energy as whole numbers, sleep in minutes; today steps known', async () => {
  const h = health(
    [
      { day: YESTERDAY, steps: 9120, activeEnergyKcal: 512.6 },
      { day: TODAY, steps: 6240.4 },
    ],
    [night('2026-09-29T23:00:00', '2026-09-30T06:30:00')],
  );
  const a = api();

  const result = await syncActivityDays({ health: h.access, api: a as never, kv: memoryKv(), consented: async () => true, now: NOW });

  expect(a.PUT.mock.calls.map(([path]) => path)).toEqual(['/v1/activity-days', '/v1/activity-days']);
  expect(a.sent).toEqual([
    { day: YESTERDAY, steps: 9120, activeEnergyKcal: 513, sleepMinutes: 450 },
    { day: TODAY, steps: 6240 },
  ]);
  expect(result).toEqual({ stepsToday: 6240 });
});

test('a day already sent with the same values is not sent again; a changed one is', async () => {
  const kv = memoryKv();
  const a = api();
  await syncActivityDays({ health: health([{ day: TODAY, steps: 100 }], []).access, api: a as never, kv, consented: async () => true, now: NOW });
  await syncActivityDays({ health: health([{ day: TODAY, steps: 100 }], []).access, api: a as never, kv, consented: async () => true, now: NOW });
  expect(a.PUT).toHaveBeenCalledTimes(1);
  await syncActivityDays({ health: health([{ day: TODAY, steps: 250 }], []).access, api: a as never, kv, consented: async () => true, now: NOW });
  expect(a.sent.at(-1)).toEqual({ day: TODAY, steps: 250 });
});

test('a day the server did not take is sent again next time', async () => {
  const kv = memoryKv();
  const failing = { PUT: jest.fn(async () => Promise.reject(new TypeError('offline'))) };
  await syncActivityDays({
    health: health([{ day: TODAY, steps: 100 }], []).access,
    api: failing as never,
    kv,
    consented: async () => true,
    now: NOW,
  });
  const a = api();
  await syncActivityDays({ health: health([{ day: TODAY, steps: 100 }], []).access, api: a as never, kv, consented: async () => true, now: NOW });
  expect(a.PUT).toHaveBeenCalledTimes(1);
});

test('a day the server refused is not taken for sent either', async () => {
  const kv = memoryKv();
  const refusing = { PUT: jest.fn(async () => ({ error: { code: 'CONSENT_REQUIRED' }, response: new Response(null, { status: 403 }) })) };
  await syncActivityDays({ health: health([{ day: TODAY, steps: 100 }], []).access, api: refusing as never, kv, consented: async () => true, now: NOW });
  const a = api();
  await syncActivityDays({ health: health([{ day: TODAY, steps: 100 }], []).access, api: a as never, kv, consented: async () => true, now: NOW });
  expect(a.PUT).toHaveBeenCalledTimes(1);
});

test("late in the day, the window's oldest day still has its night: its sleep is never sent empty (K-404 review)", async () => {
  const late = new Date('2026-10-01T22:00:00');
  const oldest = new Date(late.getTime() - 28 * 24 * 3600 * 1000);
  const oldestDay = localDay(oldest);
  const nightBefore = new Date(oldest.getFullYear(), oldest.getMonth(), oldest.getDate(), 0, 0);
  const records = [
    // The night that ended on the oldest day's morning, and one that ended the day before (outside the window).
    { start: new Date(nightBefore.getTime() - 2 * 3600e3).toISOString(), end: new Date(nightBefore.getTime() + 7 * 3600e3).toISOString(), asleep: true },
    { start: new Date(nightBefore.getTime() - 26 * 3600e3).toISOString(), end: new Date(nightBefore.getTime() - 17 * 3600e3).toISOString(), asleep: true },
  ];
  // Like HealthKit's date filter: only records overlapping the asked span come back.
  const access: HealthAccess = {
    available: true,
    requestRead: async () => {},
    readWeights: async () => [],
    readDailyTotals: async () => [{ day: oldestDay, steps: 5000 }],
    readSleep: async (from, to) => records.filter((r) => Date.parse(r.end) > from.getTime() && Date.parse(r.start) < to.getTime()),
    readWatchActiveEnergy: async () => undefined,
    readCardioWorkouts: async () => [],
  };
  const a = api();

  await syncActivityDays({ health: access, api: a as never, kv: memoryKv(), consented: async () => true, now: late });

  expect(a.sent).toEqual([{ day: oldestDay, steps: 5000, sleepMinutes: 540 }]);
});

test('without both consents (or once either is withdrawn): nothing read, nothing sent', async () => {
  const h = health([{ day: TODAY, steps: 100 }], []);
  const a = api();
  expect(await syncActivityDays({ health: h.access, api: a as never, kv: memoryKv(), consented: async () => false, now: NOW })).toEqual({
    stepsToday: null,
  });
  expect(h.asked).toEqual([]);
  expect(a.PUT).not.toHaveBeenCalled();
});

test('where Apple Health is not available: nothing asked', async () => {
  const consented = jest.fn(async () => true);
  expect(await syncActivityDays({ health: health([], [], false).access, api: api() as never, kv: memoryKv(), consented, now: NOW })).toEqual({
    stepsToday: null,
  });
  expect(consented).not.toHaveBeenCalled();
});
