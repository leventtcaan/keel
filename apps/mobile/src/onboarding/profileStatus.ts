/**
 * Whether the signed-in account has finished onboarding (K-306): it has once the server holds its profile. "done" is
 * kept on the phone, so a finished user opens on the tabs even offline; "needed" is not (onboarding may finish on
 * another phone), so until the server answers the state is "unknown". The read also brings the account's units
 * (K-310): the profile is read once, not once per answer.
 *
 * The plan is shown after the profile is saved (K-967): from just before that save until the plan's Continue, onboarding
 * is marked open on the phone. A start that finds the mark and a profile on the server resumes the plan ("resume");
 * the mark with no profile on the server starts over. A sign-out drops the mark: it belongs to the account.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { KeyValue, UnitsPreference } from '@/units/preference';

export type OnboardingState = 'unknown' | 'needed' | 'resume' | 'done';
type Profile = components['schemas']['Profile'];
type Options = {
  kv: KeyValue;
  api: ApiClient;
  units: UnitsPreference;
  /** The profile the server holds, after each read or save that still belongs to this account (the reminders, K-410). */
  onProfile?: (profile: Profile) => Promise<void>;
};

const KEY = 'onboarded';
/** Onboarding left open after the profile was saved: the plan is still to be seen (K-967). */
const OPEN = 'onboarding.open';

/** By name, so a screen can tell no connection from a server that answered with an error. */
function failure(name: 'NoConnection' | 'ProfileReadFailed' | 'ProfileSaveFailed', message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}
const DONE = 'done';

export type ProfileStatus = Awaited<ReturnType<typeof createProfileStatus>>;

export async function createProfileStatus({ kv, api, units, onProfile }: Options) {
  // "done" is never undone by the mark: the mark goes before "done" is kept, so both kept is an older order of the two.
  const open = async () => (await kv.getItemAsync(OPEN)) !== null && (await kv.getItemAsync(KEY)) !== DONE;
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
      if (!(await open())) {
        await markDone(startedIn, data);
        return;
      }
      if (startedIn !== generation) return;
      stored = { profile: data, generation: startedIn };
      become('resume');
    } else if (response.status === 404) {
      if (startedIn !== generation) return;
      await kv.removeItemAsync(KEY);
      await kv.removeItemAsync(OPEN); // the save never landed: start over
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

  /** A profile stored before the walk's end (`store`) or found on resuming, for this account: `finish` marks it done. */
  let stored: { profile: Profile; generation: number } | null = null;

  /** The PUT both ways of saving share: the units the server answers with are adopted; a failure throws by name. */
  async function put(profile: Profile): Promise<Profile> {
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
    return data;
  }

  async function markDone(startedIn: number, profile: Profile) {
    if (startedIn !== generation) return;
    // The mark first: closed between the two, neither is kept and the server's profile reads as done.
    await kv.removeItemAsync(OPEN);
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
      await markDone(startedIn, await put(profile));
    },

    /**
     * The whole profile on the server, onboarding still open (K-967): the plan is built and shown on it before the walk
     * ends (ADR-072 #2). Throws like `save`. What the server holds comes back, and waits for `finish`.
     */
    store: async (profile: Profile): Promise<Profile> => {
      const startedIn = generation;
      // Marked first: closed during or after the save, the next start finds the plan still to be seen.
      await kv.setItemAsync(OPEN, '1');
      if (startedIn !== generation) await kv.removeItemAsync(OPEN);
      const held = await put(profile);
      if (startedIn === generation) stored = { profile: held, generation: startedIn };
      return held;
    },

    /** The profile a resumed onboarding was saved with (the server's); none otherwise. */
    resumed: (): Profile | null => (state === 'resume' && stored !== null && stored.generation === generation ? stored.profile : null),

    /**
     * The end of the walk after `store` (or on resuming): done, kept, the mark dropped, handed on. Nothing stored for this
     * account, nothing to do. A failure to keep it throws, and the same profile can be finished again.
     */
    finish: async (): Promise<void> => {
      if (stored === null || stored.generation !== generation) return;
      const { profile: held, generation: startedIn } = stored;
      await markDone(startedIn, held);
      if (stored?.generation === startedIn) stored = null;
    },

    /** Sign-out: the answer belongs to the account. */
    forget: async (): Promise<void> => {
      generation += 1;
      stored = null;
      await kv.removeItemAsync(KEY);
      await kv.removeItemAsync(OPEN);
      become('unknown');
    },
  };
}
