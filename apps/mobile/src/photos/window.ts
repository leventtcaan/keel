/**
 * When the next progress photo is due (K-614, H1 §2.5): every photo_interval_weeks weeks — a window, not a fixed day. It
 * opens that many weeks after the last photo and stays open until the next one is taken: nothing is ever "missed" (U7).
 * The first photo is due in week photo_interval_weeks of the first eight (the onboarding's promise), or once that flow is
 * over; when the week can't be read, the photo is offered without being called due.
 */
import { onboardingParams } from '@/onboarding/params';

export type PhotoWindow =
  /** No photo yet, before its week. */
  | { kind: 'first'; week: number }
  /** No photo yet, its week reached. */
  | { kind: 'firstDue' }
  /** No photo yet, the week unknown (no health consent, offline). */
  | { kind: 'anytime' }
  | { kind: 'next'; opensOn: string }
  | { kind: 'open'; since: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const plusDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** `flowWeek`: the week of the first eight (1-9, GET /v1/first-weeks), 'over' once that flow is over, null if unknown. */
export function photoWindow(lastTakenOn: string | null, today: string, flowWeek: number | 'over' | null): PhotoWindow {
  const weeks = onboardingParams.photoIntervalWeeks;
  if (lastTakenOn !== null) {
    const opensOn = plusDays(lastTakenOn, 7 * weeks);
    return today >= opensOn ? { kind: 'open', since: opensOn } : { kind: 'next', opensOn };
  }
  if (flowWeek === null) return { kind: 'anytime' };
  return flowWeek === 'over' || flowWeek >= weeks ? { kind: 'firstDue' } : { kind: 'first', week: weeks };
}
