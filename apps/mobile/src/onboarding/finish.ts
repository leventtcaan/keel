/**
 * The end of onboarding (K-312). The one profile PUT first: a failed save queues nothing, so a value the user corrects
 * before trying again is the value that goes (the queue keeps the first record of an id, ADR-024). Then, with the health
 * consent, the starting weight and the waist go to the queue — saved on the phone at once, sent when the network allows
 * (K-304) — under ids made once for the draft. Once the profile lands the root layout leaves onboarding (K-306); this
 * function carries on regardless of the screen.
 */
import type { SyncQueue } from '@/sync/queue';
import type { ProfileStatus } from '@/onboarding/profileStatus';
import type { UnitSystem } from '@/units/units';

import { type Draft, startingWaistCm, startingWeightKg, toProfile } from './draft';

type Options = {
  draft: Draft;
  units: UnitSystem;
  queue: Pick<SyncQueue, 'record'>;
  profile: Pick<ProfileStatus, 'save'>;
  now: Date;
  timeZone: string;
};

/** The calendar day on the user's clock (en-CA writes it YYYY-MM-DD). */
const localDay = (now: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);

export async function finishOnboarding({ draft, units, queue, profile, now, timeZone }: Options): Promise<void> {
  // Built first: an incomplete draft throws before anything is queued.
  const finished = toProfile(draft, { units, timeZone, thisYear: now.getFullYear() });
  await profile.save(finished);
  if (draft.healthConsent === 'granted') {
    const kg = startingWeightKg(draft.weight, units);
    if (kg !== null) {
      await queue.record({
        kind: 'weighIn',
        body: { clientId: draft.ids.weighIn, measuredAt: now.toISOString(), kg, source: 'MANUAL' },
      });
    }
    const cm = draft.waist.trim() === '' ? null : startingWaistCm(draft.waist, units);
    if (cm !== null) {
      await queue.record({ kind: 'waist', body: { clientId: draft.ids.waist, measuredOn: localDay(now, timeZone), cm } });
    }
  }
}
