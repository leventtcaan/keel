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
import { AppState, Share } from 'react-native';

import { apiBaseUrl } from '@/api/config';
import type { HealthAccess } from '@/health/health';
import { healthKitAccess, healthKitWrite } from '@/health/healthKit';
import { syncActivityDays } from '@/health/activitySync';
import { bothHealthConsents } from '@/health/consent';
import { importHealthWeights, syncHealthWeights } from '@/health/weightSync';
import { deviceAlerts, deviceNotifications } from '@/notifications/deviceNotifications';
import { trackOpens } from '@/notifications/reminders';
import type { OnboardingState } from '@/onboarding/profileStatus';
import { devicePhotoFiles } from '@/photos/photoFiles';
import { type SignInResult, deviceNonce, signInWithApple } from '@/session/appleSignIn';
import type { GateState } from '@/subscription/gate';
import { useGateState } from '@/subscription/useGate';
import { configuredLegalLinks } from '@/subscription/links';
import { revenueCatStore } from '@/subscription/revenueCat';
import { keychainStorage } from '@/session/keychain';
import { exportAccount } from '@/settings/exportData';
import { deviceShareImage } from '@/share/deviceShare';
import { deviceTriggers, startAutoSync } from '@/sync/autoSync';
import type { UnitSystem } from '@/units/units';

import { type AppServices, createAppServices } from './appServices';

export type PhoneServices = AppServices & {
  signInWithApple(): Promise<SignInResult>;
  appleAvailable(): Promise<boolean>;
  health: HealthAccess;
  /**
   * Reads Apple Health with both consents: new scale weigh-ins into the queue (K-402), steps, sleep and active energy to
   * the server (K-404). How many weigh-ins were new, and today's steps as Health counts them.
   */
  syncHealth(): Promise<{ weighIns: number; stepsToday: number | null }>;
  /**
   * Apple Health's older weigh-ins, once, when the user asks in Settings (K-616): how many were new, or 'consent' when
   * the two consents are not both given (nothing is read then).
   */
  importHealthWeights(): Promise<number | 'consent'>;
  /** The share card made on this phone (K-612), as a PNG in base64, handed to the share sheet; the app sends it nowhere. */
  shareImage(base64: string): Promise<void>;
  /**
   * The system's file picker for another app's export (K-609): the chosen file's text, read on the phone; null when none
   * was chosen. The file goes nowhere from here (import/formats.ts reads it).
   */
  importFile: { pick(): Promise<string | null> };
  /** The account's data as a JSON file, handed to the share sheet (K-309). */
  exportData(): Promise<void>;
};

const DATABASE = 'keel.db';

/** By name only (V3): a message can quote a record, and records carry health data. */
const reportProblem = (problem: { name: string }) => console.warn('sync problem:', problem.name);

async function build(): Promise<PhoneServices> {
  const db = await openDatabaseAsync(DATABASE);
  // Write-ahead log: reads do not wait for the queue's writes (the setting expo-sqlite's guide recommends).
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const services = await createAppServices({
    baseUrl: apiBaseUrl(),
    storage: keychainStorage(SecureStore),
    db,
    report: reportProblem,
    kv: Storage,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    notifications: deviceNotifications(), // local only: no push token, nothing to a server (K-410)
    alerts: deviceAlerts(), // the rest timer's (K-411)
    healthWrite: healthKitWrite(), // not available in Expo Go (no native module)
    photoFiles: devicePhotoFiles(), // progress photos: a folder on this phone, never uploaded (K-614, V1)
    links: configuredLegalLinks(), // without both, nothing is sold and the gate stays open (ADR-057 D3, K-706)
    purchases: revenueCatStore({ report: reportProblem }), // not available in Expo Go or without the SDK key; set up only when first needed (ADR-057 D1)
  });
  // Offline: the kept answers (units, onboarding done) stay; an unknown onboarding state offers to try again.
  if (await services.session.isSignedIn()) services.profile.refresh().catch(() => undefined);
  startAutoSync(services.queue.drainInBackground, deviceTriggers);
  // The quiet spell starts again from each open, and iOS's answer is read afresh (K-410); for the app's life.
  trackOpens(services.reminders.opened, services.session.isSignedIn, (listener) => {
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && listener());
    return () => subscription.remove();
  });
  const health = healthKitAccess(); // not available in Expo Go (no native module)
  return {
    ...services,
    signInWithApple: () =>
      signInWithApple({ apple: AppleAuthentication, nonce: deviceNonce, api: services.api, session: services.session, claimPhotos: services.claimPhotos }),
    appleAvailable: () => AppleAuthentication.isAvailableAsync(),
    health,
    syncHealth: async () => {
      // Both consents, asked once for the two reads (K-402, K-404).
      const both = await bothHealthConsents(services.consents);
      const consented = async () => both;
      const now = new Date();
      const weighIns = await syncHealthWeights({ health, queue: services.queue, consented, now });
      const { stepsToday } = await syncActivityDays({ health, api: services.api, kv: Storage, consented, now });
      return { weighIns, stepsToday };
    },
    importHealthWeights: () =>
      importHealthWeights({
        health,
        queue: services.queue,
        consented: () => bothHealthConsents(services.consents),
        now: new Date(),
      }),
    shareImage: deviceShareImage(services.report),
    importFile: {
      pick: async () => {
        const picked = await File.pickFileAsync();
        return picked.canceled ? null : picked.result.text();
      },
    },
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

/** Whether the account meets the paywall before the tabs (K-706); the root layout routes on it. */
export function useSubscriptionGate(): GateState {
  return useGateState(useAppServices().gate);
}

export function useSignedIn(): boolean {
  const state = useContext(Context);
  if (state === null) throw new Error('useSignedIn outside ServicesProvider');
  return state.signedIn;
}
