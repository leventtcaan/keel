/**
 * "Last: 80.4 kg" and when (K-980 review): the phone only formats what the server sent. A date is written on the phone's
 * calendar and left out when it is today's; the year only when it is not this year's. No threshold lives here.
 */
import type { components } from '@/api/schema';
import { localDay } from '@/today/today';

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const WITH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function lastWeighInDate(measuredAt: string, now: Date): string | null {
  const at = new Date(measuredAt);
  if (Number.isNaN(at.getTime()) || localDay(at) === localDay(now)) return null;
  return (at.getFullYear() === now.getFullYear() ? SHORT : WITH_YEAR).format(at);
}

/**
 * What the field starts at: the last weigh-in's kilograms, unless it was brought in from before (IMPORT) — that one is shown
 * as "Last" but is history, not this morning's scale, so nothing is filled in for the user.
 */
export function prefillKg(last: components['schemas']['WeighIn'] | undefined): number | null {
  return last === undefined || last.source === 'IMPORT' ? null : last.kg;
}
