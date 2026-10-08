/**
 * Apple Health through @kingstinct/react-native-healthkit (K-403, ADR-031). The library needs a native build: in Expo Go
 * its module is missing, so loading it fails and Health is simply not available. What is read is exactly what the
 * consent text names (ADR-018 §2); nothing is written yet (K-412), and what ADR-018 §4 excludes is never asked for.
 */
import { READ_TYPES, healthKitAccess } from '@/health/healthKit';

type Kit = { isHealthDataAvailable(): boolean; requestAuthorization(request: unknown): Promise<boolean> };

function kit(available = true): Kit & { requested: unknown[] } {
  const requested: unknown[] = [];
  return {
    requested,
    isHealthDataAvailable: () => available,
    requestAuthorization: async (request) => (requested.push(request), true),
  };
}

test('in Expo Go the library is not even loaded: Metro would report its failure as a fatal error before any catch', () => {
  const load = jest.fn(() => kit());
  const access = healthKitAccess(load, () => true);
  expect(access.available).toBe(false);
  expect(load).not.toHaveBeenCalled();
});

test('elsewhere, a library that still cannot be loaded (no native module): not available', () => {
  const access = healthKitAccess(
    () => {
      throw new Error('NitroModules are not supported');
    },
    () => false,
  );
  expect(access.available).toBe(false);
});

test('the device has no Health data store (an iPad): not available', () => {
  expect(
    healthKitAccess(
      () => kit(false),
      () => false,
    ).available,
  ).toBe(false);
});

test("available: the sheet asks to read exactly the consent's list, and to write nothing", async () => {
  const fake = kit();
  const access = healthKitAccess(
    () => fake,
    () => false,
  );
  expect(access.available).toBe(true);
  await access.requestRead();
  expect(fake.requested).toEqual([{ toRead: READ_TYPES }]);
  expect(READ_TYPES).toEqual([
    'HKQuantityTypeIdentifierStepCount',
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKWorkoutTypeIdentifier',
  ]);
});

test('never heart, cycle, medication, clinical or location data (ADR-018 §4)', () => {
  expect(READ_TYPES.filter((type) => /Heart|Menstrual|Cervical|Ovulation|Medication|Clinical|Route|Location/.test(type))).toEqual([]);
});

test('a sheet that fails reaches the caller (onboarding and Settings word it)', async () => {
  const failing = { ...kit(), requestAuthorization: async () => Promise.reject(new Error('denied')) };
  await expect(
    healthKitAccess(
      () => failing,
      () => false,
    ).requestRead(),
  ).rejects.toThrow('denied');
});

test('weights are read as kilograms over the days asked, each with its Health id and time (K-402)', async () => {
  const asked: unknown[] = [];
  const fake = {
    ...kit(),
    queryQuantitySamples: async (identifier: string, options: unknown) => {
      asked.push({ identifier, options });
      return [{ uuid: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F', startDate: new Date('2026-10-01T05:12:00Z'), quantity: 81.4, unit: 'kg' }];
    },
  };
  const from = new Date('2026-09-24T09:00:00Z');
  const to = new Date('2026-10-01T09:00:00Z');

  const weights = await healthKitAccess(
    () => fake,
    () => false,
  ).readWeights(from, to);

  expect(asked).toEqual([
    { identifier: 'HKQuantityTypeIdentifierBodyMass', options: { limit: 0, unit: 'kg', filter: { date: { startDate: from, endDate: to } } } },
  ]);
  expect(weights).toEqual([{ id: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F', at: '2026-10-01T05:12:00.000Z', kg: 81.4 }]);
});

test('where Apple Health is not available, reading weights refuses', async () => {
  await expect(
    healthKitAccess(
      () => kit(false),
      () => false,
    ).readWeights(new Date(), new Date()),
  ).rejects.toThrow();
});

test('daily steps and active energy are HealthKit sums per calendar day (sources not counted twice), from local midnight (K-404)', async () => {
  const asked: unknown[] = [];
  const fake = {
    ...kit(),
    queryStatisticsCollectionForQuantity: async (identifier: string, statistics: string[], anchor: Date, interval: unknown, options: unknown) => {
      asked.push({ identifier, statistics, anchor, interval, options });
      return identifier === 'HKQuantityTypeIdentifierStepCount'
        ? [{ startDate: new Date('2026-09-30T00:00:00'), sumQuantity: { quantity: 9120, unit: 'count' }, sources: [] }]
        : [{ startDate: new Date('2026-09-30T00:00:00'), sumQuantity: { quantity: 512.6, unit: 'kcal' }, sources: [] }];
    },
  };
  const from = new Date('2026-09-03T18:00:00');
  const to = new Date('2026-10-01T18:00:00');

  const totals = await healthKitAccess(
    () => fake,
    () => false,
  ).readDailyTotals(from, to);

  const midnight = new Date('2026-09-03T00:00:00');
  expect(asked).toEqual([
    {
      identifier: 'HKQuantityTypeIdentifierStepCount',
      statistics: ['cumulativeSum'],
      anchor: midnight,
      interval: { day: 1 },
      options: { unit: 'count', filter: { date: { startDate: midnight, endDate: to } } },
    },
    {
      identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      statistics: ['cumulativeSum'],
      anchor: midnight,
      interval: { day: 1 },
      options: { unit: 'kcal', filter: { date: { startDate: midnight, endDate: to } } },
    },
  ]);
  expect(totals).toEqual([{ day: '2026-09-30', steps: 9120, activeEnergyKcal: 512.6 }]);
});

test('sleep: asleep (unspecified, core, deep, REM) is sleep; in bed and awake are not', async () => {
  const fake = {
    ...kit(),
    queryCategorySamples: async () =>
      [0, 1, 2, 3, 4, 5].map((value) => ({ value, startDate: new Date('2026-09-30T01:00:00Z'), endDate: new Date('2026-09-30T02:00:00Z') })),
  };
  const sleep = await healthKitAccess(
    () => fake,
    () => false,
  ).readSleep(new Date('2026-09-29T00:00:00Z'), new Date('2026-10-01T00:00:00Z'));
  expect(sleep.map((s) => s.asleep)).toEqual([false, true, false, true, true, true]);
  expect(sleep[0]).toEqual({ start: '2026-09-30T01:00:00.000Z', end: '2026-09-30T02:00:00.000Z', asleep: false });
});

// Cardio (K-959, ADR-074 #5, #6): the active energy an Apple Watch measured in a window, and the cardio workouts in one.
// A watch's samples carry its product type ("Watch6,1"); the phone's own estimate ("iPhone14,2") is never shown.
const watch = { productType: 'Watch6,1' };
const phone = { productType: 'iPhone14,2' };
const energy = (start: string, end: string, kcal: number, sourceRevision: { productType?: string }) => ({
  uuid: `${start}-${kcal}`,
  startDate: new Date(start),
  endDate: new Date(end),
  quantity: kcal,
  sourceRevision,
});

test("a window's active energy is the sum of what a watch measured inside it, read in kcal over the window", async () => {
  const asked: unknown[] = [];
  const fake = {
    ...kit(),
    queryQuantitySamples: async (identifier: string, options: unknown) => {
      asked.push({ identifier, options });
      return [
        energy('2026-10-05T17:00:00Z', '2026-10-05T17:01:00Z', 9.5, watch),
        energy('2026-10-05T17:30:00Z', '2026-10-05T17:31:00Z', 10.5, { productType: 'watch2,4' }),
        energy('2026-10-05T17:10:00Z', '2026-10-05T17:20:00Z', 40, phone),
        energy('2026-10-05T16:59:30Z', '2026-10-05T17:00:30Z', 5, watch),
      ];
    },
  };
  const from = new Date('2026-10-05T17:00:00Z');
  const to = new Date('2026-10-05T18:00:00Z');

  const kcal = await healthKitAccess(
    () => fake,
    () => false,
  ).readWatchActiveEnergy(from, to);

  expect(asked).toEqual([
    { identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned', options: { limit: 0, unit: 'kcal', filter: { date: { startDate: from, endDate: to } } } },
  ]);
  expect(kcal).toBe(20);
});

test('without a watch in the window there is no energy: the phone guesses, the app never shows a guess', async () => {
  const fake = { ...kit(), queryQuantitySamples: async () => [energy('2026-10-05T17:10:00Z', '2026-10-05T17:20:00Z', 40, phone)] };

  const kcal = await healthKitAccess(
    () => fake,
    () => false,
  ).readWatchActiveEnergy(new Date('2026-10-05T17:00:00Z'), new Date('2026-10-05T18:00:00Z'));

  expect(kcal).toBeUndefined();
});

test("cardio workouts in a window: the cardio kinds only, never the app's own, minutes from Health's duration, a watch's energy", async () => {
  const asked: unknown[] = [];
  const workout = (uuid: string, type: number, start: string, end: string, seconds: number, metadata: object = {}) => ({
    uuid,
    workoutActivityType: type,
    startDate: new Date(start),
    endDate: new Date(end),
    duration: { quantity: seconds, unit: 's' },
    metadata,
  });
  const fake = {
    ...kit(),
    queryWorkoutSamples: async (options: unknown) => {
      asked.push({ workouts: options });
      // Elliptical (16), cycling (13) and HIIT (63: what happened is recorded, ADR-074 Ek 1) are cardio; strength (50),
      // the app's own elliptical, soccer (41) and a 35-second elliptical (no session: under a minute) are not.
      return [
        workout('E1', 16, '2026-10-05T17:00:00Z', '2026-10-05T17:30:00Z', 1790),
        workout('C1', 13, '2026-10-06T07:00:00Z', '2026-10-06T07:20:00Z', 1200),
        workout('H1', 63, '2026-10-06T12:00:00Z', '2026-10-06T12:15:00Z', 900),
        workout('S1', 50, '2026-10-05T16:00:00Z', '2026-10-05T17:00:00Z', 3600),
        workout('K1', 16, '2026-10-05T18:00:00Z', '2026-10-05T18:30:00Z', 1800, { HKExternalUUID: 'keel:4f1c' }),
        workout('F1', 41, '2026-10-06T18:00:00Z', '2026-10-06T19:30:00Z', 5400),
        workout('T1', 16, '2026-10-06T20:00:00Z', '2026-10-06T20:00:35Z', 35),
      ];
    },
    queryQuantitySamples: async (identifier: string, options: unknown) => {
      asked.push({ identifier, options });
      return [energy('2026-10-05T17:05:00Z', '2026-10-05T17:06:00Z', 12, watch), energy('2026-10-05T17:20:00Z', '2026-10-05T17:21:00Z', 11, watch)];
    },
  };
  const from = new Date('2026-10-05T00:00:00Z');
  const to = new Date('2026-10-07T00:00:00Z');

  const cardio = await healthKitAccess(
    () => fake,
    () => false,
  ).readCardioWorkouts(from, to);

  expect(asked[0]).toEqual({ workouts: { limit: 0, filter: { date: { startDate: from, endDate: to } } } });
  // The energy over each cardio workout's own window, never the days between them.
  const window = (start: string, end: string) => ({
    identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    options: { limit: 0, unit: 'kcal', filter: { date: { startDate: new Date(start), endDate: new Date(end) } } },
  });
  expect(asked.slice(1)).toEqual([
    window('2026-10-05T17:00:00Z', '2026-10-05T17:30:00Z'),
    window('2026-10-06T07:00:00Z', '2026-10-06T07:20:00Z'),
    window('2026-10-06T12:00:00Z', '2026-10-06T12:15:00Z'),
  ]);
  expect(cardio).toEqual([
    { id: 'E1', start: '2026-10-05T17:00:00.000Z', end: '2026-10-05T17:30:00.000Z', minutes: 30, activeEnergyKcal: 23 },
    { id: 'C1', start: '2026-10-06T07:00:00.000Z', end: '2026-10-06T07:20:00.000Z', minutes: 20 },
    { id: 'H1', start: '2026-10-06T12:00:00.000Z', end: '2026-10-06T12:15:00.000Z', minutes: 15 },
  ]);
});

test('no cardio workout in the window: nothing, and no energy read', async () => {
  const read = jest.fn();
  const fake = { ...kit(), queryWorkoutSamples: async () => [], queryQuantitySamples: read };

  const cardio = await healthKitAccess(
    () => fake,
    () => false,
  ).readCardioWorkouts(new Date('2026-10-05T00:00:00Z'), new Date('2026-10-07T00:00:00Z'));

  expect(cardio).toEqual([]);
  expect(read).not.toHaveBeenCalled();
});

test('where Apple Health is not available, the cardio reads refuse', async () => {
  const access = healthKitAccess(
    () => kit(false),
    () => false,
  );
  await expect(access.readWatchActiveEnergy(new Date(), new Date())).rejects.toThrow();
  await expect(access.readCardioWorkouts(new Date(), new Date())).rejects.toThrow();
});
