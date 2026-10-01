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
  const access = healthKitAccess(() => {
    throw new Error('NitroModules are not supported');
  }, () => false);
  expect(access.available).toBe(false);
});

test('the device has no Health data store (an iPad): not available', () => {
  expect(healthKitAccess(() => kit(false), () => false).available).toBe(false);
});

test("available: the sheet asks to read exactly the consent's list, and to write nothing", async () => {
  const fake = kit();
  const access = healthKitAccess(() => fake, () => false);
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
  await expect(healthKitAccess(() => failing, () => false).requestRead()).rejects.toThrow('denied');
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

  const weights = await healthKitAccess(() => fake, () => false).readWeights(from, to);

  expect(asked).toEqual([
    { identifier: 'HKQuantityTypeIdentifierBodyMass', options: { limit: 0, unit: 'kg', filter: { date: { startDate: from, endDate: to } } } },
  ]);
  expect(weights).toEqual([{ id: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F', at: '2026-10-01T05:12:00.000Z', kg: 81.4 }]);
});

test('where Apple Health is not available, reading weights refuses', async () => {
  await expect(healthKitAccess(() => kit(false), () => false).readWeights(new Date(), new Date())).rejects.toThrow();
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

  const totals = await healthKitAccess(() => fake, () => false).readDailyTotals(from, to);

  const midnight = new Date('2026-09-03T00:00:00');
  expect(asked).toEqual([
    { identifier: 'HKQuantityTypeIdentifierStepCount', statistics: ['cumulativeSum'], anchor: midnight, interval: { day: 1 },
      options: { unit: 'count', filter: { date: { startDate: midnight, endDate: to } } } },
    { identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned', statistics: ['cumulativeSum'], anchor: midnight, interval: { day: 1 },
      options: { unit: 'kcal', filter: { date: { startDate: midnight, endDate: to } } } },
  ]);
  expect(totals).toEqual([{ day: '2026-09-30', steps: 9120, activeEnergyKcal: 512.6 }]);
});

test('sleep: asleep (unspecified, core, deep, REM) is sleep; in bed and awake are not', async () => {
  const fake = {
    ...kit(),
    queryCategorySamples: async () => [0, 1, 2, 3, 4, 5].map((value) => ({ value, startDate: new Date('2026-09-30T01:00:00Z'), endDate: new Date('2026-09-30T02:00:00Z') })),
  };
  const sleep = await healthKitAccess(() => fake, () => false).readSleep(new Date('2026-09-29T00:00:00Z'), new Date('2026-10-01T00:00:00Z'));
  expect(sleep.map((s) => s.asleep)).toEqual([false, true, false, true, true, true]);
  expect(sleep[0]).toEqual({ start: '2026-09-30T01:00:00.000Z', end: '2026-09-30T02:00:00.000Z', asleep: false });
});
