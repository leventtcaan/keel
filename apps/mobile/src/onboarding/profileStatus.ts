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
type Options = { kv: KeyValue; api: ApiClient; units: UnitsPreference };

const KEY = 'onboarded';
const DONE = 'done';

export type ProfileStatus = Awaited<ReturnType<typeof createProfileStatus>>;

export async function createProfileStatus({ kv, api, units }: Options) {
  let state: OnboardingState = (await kv.getItemAsync(KEY)) === DONE ? 'done' : 'unknown';
  const listeners = new Set<() => void>();
  // Bumped by a sign-out: a read or save that started for the previous account must not land on the next one.
  let generation = 0;

  function become(next: OnboardingState) {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function markDone(startedIn: number) {
    if (startedIn !== generation) return;
    await kv.setItemAsync(KEY, DONE);
    become('done');
  }

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): OnboardingState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Asks the server. A 404 means onboarding is needed; any other failure reaches the caller, nothing changed. */
    refresh: async (): Promise<void> => {
      const startedIn = generation;
      const adoptUnits = units.beginRead();
      const { data, response } = await api.GET('/v1/profile');
      if (data !== undefined) {
        await adoptUnits(data.units);
        await markDone(startedIn);
      } else if (response.status === 404) {
        if (startedIn === generation) become('needed');
      } else {
        throw new Error(`profile read failed with HTTP ${response.status}`);
      }
    },

    /** The finished onboarding: the whole profile, once. A refusal throws with its status; onboarding stays open. */
    save: async (profile: Profile): Promise<void> => {
      const startedIn = generation;
      const adoptUnits = units.beginRead();
      const { data, response } = await api.PUT('/v1/profile', { body: profile });
      if (data === undefined) throw new Error(`profile save failed with HTTP ${response.status}`);
      await adoptUnits(data.units);
      await markDone(startedIn);
    },

    /** Sign-out: the answer belongs to the account. */
    forget: async (): Promise<void> => {
      generation += 1;
      await kv.removeItemAsync(KEY);
      become('unknown');
    },
  };
}
