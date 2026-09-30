/**
 * The end of onboarding (K-312). With the health consent, the starting weight and the waist go to the queue first —
 * saved on the phone at once, sent when the network allows (K-304), each under an id made once for the draft, so a retry
 * after a failed save queues the same records (the queue and the server both keep the first, ADR-024). Then the one
 * profile PUT; once it lands, the root layout leaves onboarding (K-306).
 */
import type { SyncQueue } from '@/sync/queue';
import type { ProfileStatus } from '@/onboarding/profileStatus';
import { type UnitSystem, parseWaistCm, parseWeightKg } from '@/units/units';

import { type Draft, toProfile } from './draft';

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
  if (draft.healthConsent === 'granted') {
    const kg = parseWeightKg(draft.weight, units);
    if (kg !== null) {
      await queue.record({
        kind: 'weighIn',
        body: { clientId: draft.ids.weighIn, measuredAt: now.toISOString(), kg, source: 'MANUAL' },
      });
    }
    const cm = draft.waist.trim() === '' ? null : parseWaistCm(draft.waist, units);
    if (cm !== null) {
      await queue.record({ kind: 'waist', body: { clientId: draft.ids.waist, measuredOn: localDay(now, timeZone), cm } });
    }
  }
  await profile.save(finished);
}
