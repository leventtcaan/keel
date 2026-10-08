/**
 * Apple Health on the phone (K-403, ADR-031): @kingstinct/react-native-healthkit behind HealthAccess. The library is a
 * native module (Nitro) that Expo Go does not carry. It must not even be loaded there: a module required after the
 * app's first synchronous load that throws while loading is reported by Metro as a fatal error (the red screen) before
 * any catch here sees it. So Expo Go is checked first — `isRunningInExpoGo()` looks for Expo Go's own native module;
 * Constants.executionEnvironment cannot tell Expo Go from a development build — and a load that still fails elsewhere
 * means "not available" too. The screens then say so (K-312, K-309).
 */
import { isRunningInExpoGo } from 'expo';

import type { HealthAccess, HealthCardioWorkout, HealthWriteAccess } from './health';
import { healthUnavailable, healthWriteUnavailable } from './health';
import { healthParams } from './params';

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

type Sample = {
  uuid: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
  metadata?: { HKExternalUUID?: unknown };
  sourceRevision?: { productType?: string };
};
// A workout as the installed 16.x library gives it (lib/typescript/types/Workouts.d.ts, WorkoutSample): the duration in
// seconds (WorkoutProxy.swift serialises HKWorkout.duration with HKUnit.second()).
type Workout = {
  uuid: string;
  workoutActivityType: number;
  startDate: Date;
  endDate: Date;
  duration: { quantity: number };
  metadata?: { HKExternalUUID?: unknown };
};
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
  queryWorkoutSamples(options: { limit: number; filter: { date: { startDate: Date; endDate: Date } } }): Promise<readonly Workout[]>;
};

// Writing (K-412), the installed 16.x signatures (lib/typescript/healthkit.ios.d.ts): the write permission is asked with
// `toShare`; its status, unlike reading's, is told (AuthorizationStatus: 0 not determined, 1 denied, 2 authorized).
type WriteKit = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: { toShare: readonly string[] }): Promise<boolean>;
  authorizationStatusFor(type: string): number;
  saveWorkoutSample(
    activityType: number,
    quantities: readonly unknown[],
    start: Date,
    end: Date,
    totals: undefined,
    metadata: Mark,
  ): Promise<unknown>;
  saveQuantitySample(
    identifier: string,
    unit: string,
    value: number,
    start: Date,
    end: Date,
    metadata: Mark & { HKWasUserEntered: boolean },
  ): Promise<unknown>;
};
type Mark = { HKExternalUUID: string; HKSyncIdentifier: string; HKSyncVersion: number };

/** What is written, and nothing else (ADR-018 §1): a session as a workout, a weigh-in as body mass. */
export const WRITE_TYPES = { workout: 'HKWorkoutTypeIdentifier', weight: 'HKQuantityTypeIdentifierBodyMass' } as const;
const SHARING_AUTHORIZED = 2;
// HKWorkoutActivityType.traditionalStrengthTraining in the installed library's WorkoutActivityType (generated enum).
const STRENGTH_TRAINING = 50;
/**
 * The app's mark on what it writes (HKExternalUUID = "keel:" + the record's clientId): reading Health back (K-402) skips
 * it, so a weigh-in typed here never returns as a scale's — whatever the build's bundle id.
 */
const MARK = 'keel:';
/**
 * The mark on a written sample: ours (read back, skipped), and one per record — HealthKit keeps a single sample per sync
 * identifier, so a finish refused and done again never adds a second workout (K-412 review).
 */
const markOf = (id: string): Mark => ({ HKExternalUUID: `${MARK}${id}`, HKSyncIdentifier: `${MARK}${id}`, HKSyncVersion: 1 });
const isOwn = (sample: Pick<Sample, 'metadata'>) =>
  typeof sample.metadata?.HKExternalUUID === 'string' && sample.metadata.HKExternalUUID.startsWith(MARK);

/**
 * Saved by an Apple Watch: HKSourceRevision.productType names the device that saved the sample, a watch's begins with
 * "Watch" (Apple's example is "watch2,4"). Only a watch measures active energy (ADR-074 #5); the phone's is an estimate.
 */
const WATCH = /^watch/i;
const MINUTE_S = 60;
const CARDIO = new Set(healthParams.cardioWorkoutTypes);

/** Kilocalories a watch measured within [from, to]: samples wholly inside it, so none is counted for two windows. */
function watchEnergyWithin(samples: readonly Sample[], from: Date, to: Date): number | undefined {
  const inside = samples.filter(
    (sample) => WATCH.test(sample.sourceRevision?.productType ?? '') && sample.startDate >= from && sample.endDate <= to,
  );
  return inside.length === 0 ? undefined : inside.reduce((kcal, sample) => kcal + sample.quantity, 0);
}

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
  const energySamples = (from: Date, to: Date) =>
    kit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      limit: 0,
      unit: 'kcal',
      filter: { date: { startDate: from, endDate: to } },
    });
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
      return samples.filter((sample) => !isOwn(sample)).map((sample) => ({ id: sample.uuid, at: sample.startDate.toISOString(), kg: sample.quantity }));
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
    readWatchActiveEnergy: async (from, to) => watchEnergyWithin(await energySamples(from, to), from, to),
    // Cardio kinds only (health_cardio_workout_types), never what the app wrote; a workout under a minute is no session.
    readCardioWorkouts: async (from, to) => {
      const workouts = (await kit.queryWorkoutSamples({ limit: 0, filter: { date: { startDate: from, endDate: to } } })).filter(
        (workout) => CARDIO.has(workout.workoutActivityType) && !isOwn(workout) && Math.round(workout.duration.quantity / MINUTE_S) >= 1,
      );
      if (workouts.length === 0) return [];
      // One energy read over the workouts' own span; each takes what a watch measured inside it.
      const start = new Date(Math.min(...workouts.map((workout) => workout.startDate.getTime())));
      const end = new Date(Math.max(...workouts.map((workout) => workout.endDate.getTime())));
      const samples = await energySamples(start, end);
      return workouts.map((workout) => {
        const cardio: HealthCardioWorkout = {
          id: workout.uuid,
          start: workout.startDate.toISOString(),
          end: workout.endDate.toISOString(),
          minutes: Math.round(workout.duration.quantity / MINUTE_S),
        };
        const kcal = watchEnergyWithin(samples, workout.startDate, workout.endDate);
        return kcal === undefined ? cardio : { ...cardio, activeEnergyKcal: kcal };
      });
    },
  };
}

/** Writing to Apple Health (K-412), loaded as reading is: never in Expo Go, not where the module or the store is missing. */
export function healthKitWrite(load: () => unknown = loadLibrary, inExpoGo: () => boolean = isRunningInExpoGo): HealthWriteAccess {
  if (inExpoGo()) return healthWriteUnavailable;
  let kit: WriteKit;
  try {
    kit = load() as WriteKit;
    if (!kit.isHealthDataAvailable()) return healthWriteUnavailable;
  } catch {
    return healthWriteUnavailable;
  }
  return {
    available: true,
    requestWrite: async (kind) => {
      await kit.requestAuthorization({ toShare: [WRITE_TYPES[kind]] });
    },
    canWrite: (kind) => kit.authorizationStatusFor(WRITE_TYPES[kind]) === SHARING_AUTHORIZED,
    // No energy total: the app does not measure it, and a guessed number would be one more made-up figure (U1).
    writeWorkout: async ({ id, start, end }) => {
      await kit.saveWorkoutSample(STRENGTH_TRAINING, [], start, end, undefined, markOf(id));
    },
    writeWeight: async ({ id, kg, at }) => {
      await kit.saveQuantitySample(WRITE_TYPES.weight, 'kg', kg, at, at, { ...markOf(id), HKWasUserEntered: true });
    },
  };
}
