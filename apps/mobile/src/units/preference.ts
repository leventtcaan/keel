/**
 * The unit preference (K-310, ADR-029 §4). The server profile is the truth (Profile.units); the phone keeps the last
 * known value so units show offline and from the first frame. Before there is a profile (onboarding not done), the
 * device region decides and a choice stays on the phone — onboarding sends it with the profile (K-306).
 */
import type { ApiClient } from '@/api/client';

import { type UnitSystem, defaultSystem } from './units';

/** The part of expo-sqlite/kv-store used; passed in so this is testable without a phone. */
export type KeyValue = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  removeItemAsync(key: string): Promise<unknown>;
};

type Options = { kv: KeyValue; api: ApiClient; locale: string };

const KEY = 'units';
const isSystem = (value: string | null): value is UnitSystem => value === 'METRIC' || value === 'IMPERIAL';

export type UnitsPreference = Awaited<ReturnType<typeof createUnitsPreference>>;

export async function createUnitsPreference({ kv, api, locale }: Options) {
  const kept = await kv.getItemAsync(KEY);
  let current: UnitSystem = isSystem(kept) ? kept : defaultSystem(locale);
  const listeners = new Set<() => void>();
  // Bumped by every choice and every forget: a refresh that started before one of them must not undo it (the same
  // guard as the session's, K-311).
  let generation = 0;

  function beginRead(): (system: string) => Promise<void> {
    const startedIn = generation;
    // Only a unit system this app knows is kept: the answer crossed a network.
    return async (system) => {
      if (startedIn === generation && isSystem(system)) await keep(system);
    };
  }

  async function keep(system: UnitSystem): Promise<void> {
    await kv.setItemAsync(KEY, system);
    if (system === current) return;
    current = system;
    listeners.forEach((listener) => listener());
  }

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): UnitSystem => current,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Reads the profile; nothing changes when there is none yet. Network failures reach the caller. */
    refresh: async (): Promise<void> => {
      const adopt = beginRead();
      const { data } = await api.GET('/v1/profile');
      if (data !== undefined) await adopt(data.units);
    },

    /**
     * For a profile read made elsewhere (K-306 reads it once for both answers): call before the request; the function
     * returned keeps the read's units, unless a choice or a forget came in between.
     */
    beginRead,

    /**
     * 'profile': stored on the server. 'phone': there is no profile yet; kept here until onboarding sends it.
     * A refusal or no connection throws, and nothing changes: a setting is not half-applied.
     */
    set: async (system: UnitSystem): Promise<'profile' | 'phone'> => {
      generation += 1;
      const { data, response } = await api.GET('/v1/profile');
      if (data === undefined) {
        if (response.status !== 404) throw new Error(`profile read failed with HTTP ${response.status}`);
        await keep(system);
        return 'phone';
      }
      const put = await api.PUT('/v1/profile', { body: { ...data, units: system } });
      if (put.data === undefined) throw new Error(`profile update failed with HTTP ${put.response.status}`);
      await keep(put.data.units);
      return 'profile';
    },

    /**
     * Onboarding (K-306): there is no profile yet, so the choice needs no network — it stays on the phone and goes out
     * with the profile. Never used once a profile exists: then set() stores it on the server.
     */
    keepOnPhone: async (system: UnitSystem): Promise<void> => {
      generation += 1;
      await keep(system);
    },

    /** Sign-out: the preference belongs to the account. */
    forget: async (): Promise<void> => {
      generation += 1;
      await kv.removeItemAsync(KEY);
      const fallback = defaultSystem(locale);
      if (fallback !== current) {
        current = fallback;
        listeners.forEach((listener) => listener());
      }
    },
  };
}
