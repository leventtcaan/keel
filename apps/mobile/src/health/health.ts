/**
 * Access to Apple Health (K-312). The screens ask this, never a library: the phone plugs in HealthKit (healthKit.ts,
 * K-403; the reads themselves are K-404), and where there is none — Expo Go, an iPad, tests — it is not available.
 */
export type HealthAccess = {
  /** Whether Apple Health can be asked on this build (Expo Go cannot: HealthKit needs a native build, K-308). */
  available: boolean;
  /** Shows Apple's permission sheet for what the app reads (ADR-018 §2). Resolves when the sheet closes. */
  requestRead(): Promise<void>;
  /** Scale weigh-ins in Apple Health between two moments (K-402). */
  readWeights(from: Date, to: Date): Promise<HealthWeight[]>;
  /** Steps and active energy per calendar day on the phone, Health's own sums (K-404); a day without data is absent. */
  readDailyTotals(from: Date, to: Date): Promise<HealthDayTotals[]>;
  /** Sleep analysis records between two moments, each marked asleep or not (in bed, awake) (K-404). */
  readSleep(from: Date, to: Date): Promise<HealthSleep[]>;
};

/** A day's totals as Health sums them (sources not counted twice); a kind with no data that day is left out. */
export type HealthDayTotals = { day: string; steps?: number; activeEnergyKcal?: number };

/** One sleep analysis record: when it began and ended (ISO), and whether it is sleep. */
export type HealthSleep = { start: string; end: string; asleep: boolean };

/** One weigh-in from Apple Health: its Health id, when it was taken (ISO), kilograms as Health holds them. */
export type HealthWeight = { id: string; at: string; kg: number };

/** Where Apple Health cannot be asked. */
export const healthUnavailable: HealthAccess = {
  available: false,
  requestRead: async () => {
    throw new Error('Apple Health is not available in this build');
  },
  readWeights: async () => {
    throw new Error('Apple Health is not available in this build');
  },
  readDailyTotals: async () => {
    throw new Error('Apple Health is not available in this build');
  },
  readSleep: async () => {
    throw new Error('Apple Health is not available in this build');
  },
};

/** What is written to Apple Health (K-412): a finished session, and a weigh-in typed in — each by its own switch. */
export type HealthWriteKind = 'workout' | 'weight';

/** Writing to Apple Health (K-412, ADR-018 §1): asked apart from reading, and only after the user turns a switch on. */
export type HealthWriteAccess = {
  available: boolean;
  /** Shows Apple's sheet for what the app writes (workouts, weight). Resolves when the sheet closes. */
  requestWrite(): Promise<void>;
  /** Whether iOS allows writing this kind — unlike reading, iOS tells. */
  canWrite(kind: HealthWriteKind): boolean;
  writeWorkout(workout: { id: string; start: Date; end: Date }): Promise<void>;
  writeWeight(weighIn: { id: string; kg: number; at: Date }): Promise<void>;
};

/** Where Apple Health cannot be written (Expo Go, an iPad, tests). */
export const healthWriteUnavailable: HealthWriteAccess = {
  available: false,
  requestWrite: async () => {
    throw new Error('Apple Health is not available in this build');
  },
  canWrite: () => false,
  writeWorkout: async () => {
    throw new Error('Apple Health is not available in this build');
  },
  writeWeight: async () => {
    throw new Error('Apple Health is not available in this build');
  },
};
