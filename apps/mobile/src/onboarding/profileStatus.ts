/**
 * Whether the signed-in account has finished onboarding (K-306): it has once the server holds its profile. "done" is
 * kept on the phone, so a finished user opens on the tabs even offline; "needed" is not (onboarding may finish on
 * another phone), so until the server answers the state is "unknown". The read also brings the account's units
 * (K-310): the profile is read once, not once per answer.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { KeyValue, UnitsPreference } from '@/units/preference';

export type OnboardingState = 'unknown' | 'needed' | 'done';
type Profile = components['schemas']['Profile'];
type Options = {
  kv: KeyValue;
  api: ApiClient;
  units: UnitsPreference;
  /** The profile the server holds, after each read or save that still belongs to this account (the reminders, K-410). */
  onProfile?: (profile: Profile) => Promise<void>;
};

const KEY = 'onboarded';

/** By name, so a screen can tell no connection from a server that answered with an error. */
function failure(name: 'NoConnection' | 'ProfileReadFailed' | 'ProfileSaveFailed', message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}
const DONE = 'done';

export type ProfileStatus = Awaited<ReturnType<typeof createProfileStatus>>;

export async function createProfileStatus({ kv, api, units, onProfile }: Options) {
  let state: OnboardingState = (await kv.getItemAsync(KEY)) === DONE ? 'done' : 'unknown';
  const listeners = new Set<() => void>();
  // Bumped by a sign-out: a read or save that started for the previous account must not land on the next one.
  let generation = 0;

  let inFlight: Promise<void> | null = null;

  async function read(): Promise<void> {
    const startedIn = generation;
    const adoptUnits = units.beginRead();
    let answer;
    try {
      answer = await api.GET('/v1/profile');
    } catch {
      throw failure('NoConnection', 'profile read: no answer');
    }
    const { data, response } = answer;
    if (data !== undefined) {
      await adoptUnits(data.units);
      await markDone(startedIn, data);
    } else if (response.status === 404) {
      if (startedIn !== generation) return;
      await kv.removeItemAsync(KEY);
      become('needed');
    } else {
      throw failure('ProfileReadFailed', `profile read failed with HTTP ${response.status}`);
    }
  }

  function become(next: OnboardingState) {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function markDone(startedIn: number, profile: Profile) {
    if (startedIn !== generation) return;
    await kv.setItemAsync(KEY, DONE);
    if (startedIn !== generation) {
      // Signed out while "done" was written: the write landed after the sign-out's removal, so it goes again.
      await kv.removeItemAsync(KEY);
      return;
    }
    become('done');
    // Not waited for: routing on "done" must not hang on the phone's notification centre (the reminders report their own
    // failures, K-410).
    void onProfile?.(profile);
  }

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): OnboardingState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Asks the server. A 404 means onboarding is needed — even over a kept "done": the server holds the truth. Any other
     * failure reaches the caller as NoConnection or ProfileReadFailed, nothing changed. Reads asked for while one is on
     * its way join it (sign-in and the checking screen both ask).
     */
    refresh: (): Promise<void> => {
      inFlight ??= read().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    /** The finished onboarding: the whole profile, once. A refusal throws with its status; onboarding stays open. */
    save: async (profile: Profile): Promise<void> => {
      const startedIn = generation;
      const adoptUnits = units.beginRead();
      let answer;
      try {
        answer = await api.PUT('/v1/profile', { body: profile });
      } catch {
        throw failure('NoConnection', 'profile save: no answer');
      }
      const { data, response } = answer;
      if (data === undefined) throw failure('ProfileSaveFailed', `profile save failed with HTTP ${response.status}`);
      await adoptUnits(data.units);
      await markDone(startedIn, data);
    },

    /** Sign-out: the answer belongs to the account. */
    forget: async (): Promise<void> => {
      generation += 1;
      await kv.removeItemAsync(KEY);
      become('unknown');
    },
  };
}
