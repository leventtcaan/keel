/**
 * Where the session is kept between launches (K-305): the iOS keychain, through expo-secure-store. This device only
 * (not carried to a new phone by a backup), readable after the first unlock — so the session can be refreshed while the
 * phone is locked in a pocket at the gym.
 */
import { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY } from 'expo-secure-store';

import type { SessionStorage, StoredSession } from './session';

/** The expo-secure-store functions used; passed in so the storage is testable without a keychain. */
export type SecureStore = {
  getItemAsync(key: string, options?: object): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: object): Promise<void>;
  deleteItemAsync(key: string, options?: object): Promise<void>;
};

const KEY = 'session';
const OPTIONS = { keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

function isSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.accessToken === 'string' && typeof v.refreshToken === 'string' && typeof v.accessTokenExpiresAt === 'string';
}

export function keychainStorage(secure: SecureStore): SessionStorage {
  return {
    load: async () => {
      const stored = await secure.getItemAsync(KEY, OPTIONS);
      if (stored === null) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = null;
      }
      if (isSession(parsed)) return parsed;
      // Damaged: signing in again is the way out; keeping it would fail the same way on every launch.
      await secure.deleteItemAsync(KEY, OPTIONS);
      return null;
    },
    save: (session) => secure.setItemAsync(KEY, JSON.stringify(session), OPTIONS),
    clear: () => secure.deleteItemAsync(KEY, OPTIONS),
  };
}
