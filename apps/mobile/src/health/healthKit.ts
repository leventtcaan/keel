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

type Kit = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: { toRead: readonly string[] }): Promise<boolean>;
};

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
  };
}
