/**
 * Access to Apple Health (K-312; the library and the real reads are K-403/K-404). The screens ask this, never a library:
 * the phone build plugs in HealthKit, Expo Go and tests plug in what they can.
 */
export type HealthAccess = {
  /** Whether Apple Health can be asked on this build (Expo Go cannot: HealthKit needs a native build, K-308). */
  available: boolean;
  /** Shows Apple's permission sheet for what the app reads (ADR-018 §2). Resolves when the sheet closes. */
  requestRead(): Promise<void>;
};

/** Until K-403 chooses the library: nothing to ask. */
export const healthUnavailable: HealthAccess = {
  available: false,
  requestRead: async () => {
    throw new Error('Apple Health is not available in this build');
  },
};
