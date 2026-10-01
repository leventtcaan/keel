/**
 * The app's services on the phone (K-305): built once for the life of the process — the network listener must not be
 * stopped and started with screens — and handed to screens through context. Until the database and the keychain are
 * read, nothing renders; the root layout keeps the splash up until its children mount.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { type ReactNode, createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Share } from 'react-native';

import { apiBaseUrl } from '@/api/config';
import type { HealthAccess } from '@/health/health';
import { healthKitAccess } from '@/health/healthKit';
import { syncHealthWeights } from '@/health/weightSync';
import type { OnboardingState } from '@/onboarding/profileStatus';
import { type SignInResult, deviceNonce, signInWithApple } from '@/session/appleSignIn';
import { keychainStorage } from '@/session/keychain';
import { exportAccount } from '@/settings/exportData';
import { deviceTriggers, startAutoSync } from '@/sync/autoSync';
import type { UnitSystem } from '@/units/units';

import { type AppServices, createAppServices } from './appServices';

export type PhoneServices = AppServices & {
  signInWithApple(): Promise<SignInResult>;
  appleAvailable(): Promise<boolean>;
  health: HealthAccess;
  /** Reads Apple Health's new scale weigh-ins into the queue, with both consents (K-402); how many were new. */
  syncHealth(): Promise<number>;
  /** The account's data as a JSON file, handed to the share sheet (K-309). */
  exportData(): Promise<void>;
};

const DATABASE = 'keel.db';

async function build(): Promise<PhoneServices> {
  const db = await openDatabaseAsync(DATABASE);
  // Write-ahead log: reads do not wait for the queue's writes (the setting expo-sqlite's guide recommends).
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const services = await createAppServices({
    baseUrl: apiBaseUrl(),
    storage: keychainStorage(SecureStore),
    db,
    // By name only: a message can quote a record, and records carry health data (V3).
    report: (problem) => console.warn('sync problem:', problem.name),
    kv: Storage,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  });
  // Offline: the kept answers (units, onboarding done) stay; an unknown onboarding state offers to try again.
  if (await services.session.isSignedIn()) services.profile.refresh().catch(() => undefined);
  startAutoSync(services.queue.drainInBackground, deviceTriggers);
  const health = healthKitAccess(); // not available in Expo Go (no native module)
  return {
    ...services,
    signInWithApple: () =>
      signInWithApple({ apple: AppleAuthentication, nonce: deviceNonce, api: services.api, session: services.session }),
    appleAvailable: () => AppleAuthentication.isAvailableAsync(),
    health,
    syncHealth: () =>
      syncHealthWeights({
        health,
        queue: services.queue,
        consented: async () => (await services.consents.granted('HEALTH_DATA')) && (await services.consents.granted('APPLE_HEALTH')),
        now: new Date(),
      }),
    exportData: () =>
      exportAccount({
        api: services.api,
        saveFile: (name, content) => {
          const file = new File(Paths.cache, name);
          file.write(content);
          return { uri: file.uri, remove: () => file.delete() };
        },
        share: async (uri) => void (await Share.share({ url: uri })),
        now: new Date(),
        report: services.report,
      }),
  };
}

let once: Promise<PhoneServices> | null = null;

type State = { services: PhoneServices; signedIn: boolean };
const Context = createContext<State | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    once ??= build();
    once
      .then(async (services) => {
        unsubscribe = services.session.subscribe((signedIn) => setState({ services, signedIn }));
        setState({ services, signedIn: await services.session.isSignedIn() });
      })
      .catch((e: unknown) => {
        once = null; // the error screen's "try again" remounts this provider and builds afresh
        setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => unsubscribe();
  }, []);

  // Thrown during render so the root layout's ErrorBoundary shows it: without a database or a server address the app
  // cannot work, and a blank screen would hide why.
  if (error !== null) throw error;
  if (state === null) return null;
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useAppServices(): PhoneServices {
  const state = useContext(Context);
  if (state === null) throw new Error('useAppServices outside ServicesProvider');
  return state.services;
}

/** The user's unit system; the screen re-renders when it changes (K-310). */
export function useUnits(): UnitSystem {
  const { units } = useAppServices();
  return useSyncExternalStore(units.subscribe, units.current);
}

/** Whether the signed-in account has finished onboarding (K-306); the root layout routes on it. */
export function useOnboarding(): OnboardingState {
  const { profile } = useAppServices();
  return useSyncExternalStore(profile.subscribe, profile.current);
}

export function useSignedIn(): boolean {
  const state = useContext(Context);
  if (state === null) throw new Error('useSignedIn outside ServicesProvider');
  return state.signedIn;
}
