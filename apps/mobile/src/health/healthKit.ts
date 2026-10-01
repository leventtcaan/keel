/**
 * Apple Health on the phone (K-403, ADR-031): @kingstinct/react-native-healthkit behind HealthAccess. The library is a
 * native module (Nitro) that Expo Go does not carry. It must not even be loaded there: a module required after the
 * app's first synchronous load that throws while loading is reported by Metro as a fatal error (the red screen) before
 * any catch here sees it. So Expo Go is checked first — `isRunningInExpoGo()` looks for Expo Go's own native module;
 * Constants.executionEnvironment cannot tell Expo Go from a development build — and a load that still fails elsewhere
 * means "not available" too. The screens then say so (K-312, K-309).
 */
import { isRunningInExpoGo } from 'expo';

import type { HealthAccess } from './health';
import { healthUnavailable } from './health';

/**
 * What is read: exactly the list the consent text names (en.json › consent.apple_health; ADR-018 §2) — steps, sleep,
 * weight from a scale, active energy (the energy-availability check, U13) and workouts logged in other apps. Nothing
 * else, and nothing written until the separate write toggle (K-412). ADR-018 §4's exclusions are tested.
 */
export const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKWorkoutTypeIdentifier',
] as const;

type Sample = { uuid: string; startDate: Date; quantity: number };
type Statistics = { startDate?: Date; sumQuantity?: { quantity: number } };
type StatisticsOptions = { unit: string; filter: { date: { startDate: Date; endDate: Date } } };
type Kit = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: { toRead: readonly string[] }): Promise<boolean>;
  // The installed 16.x signature (lib/typescript/healthkit.d.ts): limit 0 is "all"; the unit converts on the device.
  queryQuantitySamples(
    identifier: string,
    options: { limit: number; unit: string; filter: { date: { startDate: Date; endDate: Date } } },
  ): Promise<readonly Sample[]>;
  // HKStatisticsCollectionQuery: one sum per interval from the anchor; Health merges overlapping sources itself.
  queryStatisticsCollectionForQuantity(
    identifier: string,
    statistics: readonly string[],
    anchorDate: Date,
    intervalComponents: { day: number },
    options: StatisticsOptions,
  ): Promise<readonly Statistics[]>;
  queryCategorySamples(
    identifier: string,
    options: { limit: number; filter: { date: { startDate: Date; endDate: Date } } },
  ): Promise<readonly { value: number; startDate: Date; endDate: Date }[]>;
};

// HKCategoryValueSleepAnalysis (the installed library's CategoryValueSleepAnalysis): in bed 0, awake 2; asleep is
// unspecified 1, core 3, deep 4, REM 5.
const ASLEEP = new Set([1, 3, 4, 5]);

/** The phone's calendar day of a moment, as the API writes a day. */
const dayOf = (moment: Date) =>
  `${moment.getFullYear()}-${String(moment.getMonth() + 1).padStart(2, '0')}-${String(moment.getDate()).padStart(2, '0')}`;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadLibrary = () => require('@kingstinct/react-native-healthkit') as Kit;

export function healthKitAccess(load: () => unknown = loadLibrary, inExpoGo: () => boolean = isRunningInExpoGo): HealthAccess {
  if (inExpoGo()) return healthUnavailable;
  let kit: Kit;
  try {
    kit = load() as Kit;
    if (!kit.isHealthDataAvailable()) return healthUnavailable; // an iPad has no Health store
  } catch {
    return healthUnavailable; // no native module in this build
  }
  return {
    available: true,
    // Apple shows its sheet once; later calls resolve at once with the user's earlier choice (which the app cannot read).
    requestRead: async () => {
      await kit.requestAuthorization({ toRead: READ_TYPES });
    },
    // Scale weigh-ins as kilograms, whatever unit the scale wrote; each with its Health id (K-402: the clientId).
    readWeights: async (from, to) => {
      const samples = await kit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        limit: 0,
        unit: 'kg',
        filter: { date: { startDate: from, endDate: to } },
      });
      return samples.map((sample) => ({ id: sample.uuid, at: sample.startDate.toISOString(), kg: sample.quantity }));
    },
    // Steps and active energy as Health's daily sums, days from the phone's local midnight (K-404).
    readDailyTotals: async (from, to) => {
      const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const sums = (identifier: string, unit: string) =>
        kit.queryStatisticsCollectionForQuantity(
          identifier,
          ['cumulativeSum'],
          midnight,
          { day: 1 },
          {
            unit,
            filter: { date: { startDate: midnight, endDate: to } },
          },
        );
      const steps = await sums('HKQuantityTypeIdentifierStepCount', 'count');
      const energy = await sums('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal');
      const days = new Map<string, { day: string; steps?: number; activeEnergyKcal?: number }>();
      const add = (rows: readonly Statistics[], field: 'steps' | 'activeEnergyKcal') => {
        for (const row of rows) {
          if (row.startDate === undefined || row.sumQuantity === undefined) continue;
          const day = dayOf(row.startDate);
          days.set(day, { ...(days.get(day) ?? { day }), [field]: row.sumQuantity.quantity });
        }
      };
      add(steps, 'steps');
      add(energy, 'activeEnergyKcal');
      return [...days.values()];
    },
    readSleep: async (from, to) => {
      const samples = await kit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        limit: 0,
        filter: { date: { startDate: from, endDate: to } },
      });
      return samples.map((s) => ({ start: s.startDate.toISOString(), end: s.endDate.toISOString(), asleep: ASLEEP.has(s.value) }));
    },
  };
}
