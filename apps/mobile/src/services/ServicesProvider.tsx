/**
 * The app's services on the phone (K-305): built once for the life of the process — the network listener must not be
 * stopped and started with screens — and handed to screens through context. Until the database and the keychain are
 * read, nothing renders; the root layout keeps the splash up until its children mount.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseAsync } from 'expo-sqlite';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { apiBaseUrl } from '@/api/config';
import { type SignInResult, deviceNonce, signInWithApple } from '@/session/appleSignIn';
import { keychainStorage } from '@/session/keychain';
import { deviceTriggers, startAutoSync } from '@/sync/autoSync';

import { type AppServices, createAppServices } from './appServices';

export type PhoneServices = AppServices & {
  signInWithApple(): Promise<SignInResult>;
  appleAvailable(): Promise<boolean>;
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
  });
  startAutoSync(services.queue.drainInBackground, deviceTriggers);
  return {
    ...services,
    signInWithApple: () =>
      signInWithApple({ apple: AppleAuthentication, nonce: deviceNonce, api: services.api, session: services.session }),
    appleAvailable: () => AppleAuthentication.isAvailableAsync(),
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

export function useSignedIn(): boolean {
  const state = useContext(Context);
  if (state === null) throw new Error('useSignedIn outside ServicesProvider');
  return state.signedIn;
}
