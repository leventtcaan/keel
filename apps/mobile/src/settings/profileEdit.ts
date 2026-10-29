/**
 * Changing one answer of the profile after onboarding (K-1062). The contract has one write, `PUT /v1/profile`, which replaces
 * the profile whole, so a change is read-modify-write in one go: the profile is read now, `change` says what is different,
 * and the whole of it goes back, the rest as the server just gave it. Nothing is written from a copy kept earlier on a screen,
 * which could be older than another edit (training days, units, foods); and without the health data consent the server's
 * read leaves the foods out and its write keeps the stored list (ProfileController), so a change here never empties them.
 * What the server answers with reaches the reminders at once: the check-in morning follows the check-in day.
 */
import { useCallback } from 'react';

import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { useSavedSignal } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';

export type Profile = components['schemas']['Profile'];

/** By name, so the screen's action can word it (V3: never the body). */
function failure(name: 'NoConnection' | 'ProfileReadFailed' | 'ProfileSaveFailed', message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

/** Reads the profile, applies `change`, writes it back whole and returns what the server holds now. */
export async function editProfile(api: Pick<ApiClient, 'GET' | 'PUT'>, change: (current: Profile) => Profile): Promise<Profile> {
  let read;
  try {
    read = await api.GET('/v1/profile');
  } catch {
    throw failure('NoConnection', 'profile read: no answer');
  }
  if (read.data === undefined) throw failure('ProfileReadFailed', `profile read failed with HTTP ${read.response.status}`);
  let put;
  try {
    put = await api.PUT('/v1/profile', { body: change(read.data) });
  } catch {
    throw failure('NoConnection', 'profile save: no answer');
  }
  if (put.data === undefined) throw failure('ProfileSaveFailed', `profile save failed with HTTP ${put.response.status}`);
  return put.data;
}

/**
 * The edit, as a screen uses it: saved, the reminders keep the new schedule (the check-in day) and the screens that read the
 * profile are told to read it again, with no banner (the page closes on the row that shows the new value).
 */
export function useProfileEdit(): (change: (current: Profile) => Profile) => Promise<Profile> {
  const { api, reminders } = useAppServices();
  const changed = useSavedSignal();
  return useCallback(
    async (change) => {
      const held = await editProfile(api, change);
      // A reminder that cannot be planned is reported by the reminders themselves and is not the edit failing.
      void reminders.keepSchedule(held.schedule).catch(() => undefined);
      changed();
      return held;
    },
    [api, reminders, changed],
  );
}
