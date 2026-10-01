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
};

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
};
