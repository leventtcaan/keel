/**
 * The paywall's timeline (ADR-072 #7, ADR-058 Ek 1): today nothing charged · the first call · the reminder, if wanted
 * (`trial_reminder_days_before`) · the day it charges. The trial's length is never written in code: it is the store's
 * introductory offer (RevenueCat introPrice, Plan.trial), whatever App Store Connect says — 2 weeks (ADR-071 #1), 1 week,
 * or none yet (charged today). The full terms stay under the button (paywall-words.test.ts).
 */
import { t } from '@/copy';
import { subscriptionParams } from '@/subscription/params';
import type { Plan } from '@/subscription/store';
import { paywallTimeline } from '@/subscription/words';
import { weekdayDate } from '@/today/today';

const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 2, unit: 'week' } };
const TODAY = '2026-10-12'; // a Monday
const FIRST_CALL = '2026-10-19';
const DAYS_BEFORE = subscriptionParams.trialReminderDaysBefore;

/** A day so many days from another. */
function plus(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const rows = (plan: Plan, firstCall: string | null = FIRST_CALL) => paywallTimeline(plan, { today: TODAY, firstCall });
const row = (day: string, words: string) => ({ day, when: day === TODAY ? t('subscription.timeline.today') : weekdayDate(day), words });
const FREE = t('subscription.timeline.free');
const CALL = t('subscription.timeline.firstCall');
const REMINDER = t('subscription.timeline.reminder');
const CHARGE = t('subscription.timeline.charge.annual', { price: '$59.99' });

test('a 2-week trial: today free, the first call a week on, the reminder before it ends, the charge when it ends', () => {
  const ends = plus(TODAY, 14);
  expect(rows(ANNUAL)).toEqual([row(TODAY, FREE), row(FIRST_CALL, CALL), row(plus(ends, -DAYS_BEFORE), REMINDER), row(ends, CHARGE)]);
  expect(rows(ANNUAL).map((r) => r.when)).toEqual(['Today', 'Mon, Oct 19', 'Sat, Oct 24', 'Mon, Oct 26']);
});

test('a 1-week trial: the same lines in the order their days come; on one day the first call before the charge', () => {
  const week: Plan = { ...ANNUAL, trial: { count: 1, unit: 'week' } };
  const ends = plus(TODAY, 7);
  expect(rows(week)).toEqual([row(TODAY, FREE), row(plus(ends, -DAYS_BEFORE), REMINDER), row(FIRST_CALL, CALL), row(ends, CHARGE)]);
});

test('the trial in days or months is counted on the calendar, as the store gives it', () => {
  expect(rows({ ...ANNUAL, trial: { count: 3, unit: 'day' } }, null).at(-1)?.day).toBe(plus(TODAY, 3));
  expect(rows({ ...ANNUAL, trial: { count: 1, unit: 'month' } }, null).at(-1)?.day).toBe('2026-11-12');
});

test.each([
  ['a month from Jan 31', '2027-01-31', { count: 1, unit: 'month' } as const, '2027-02-28'],
  ['a month from Jan 31 in a leap year', '2028-01-31', { count: 1, unit: 'month' } as const, '2028-02-29'],
  ['three months from Nov 30', '2026-11-30', { count: 3, unit: 'month' } as const, '2027-02-28'],
  ['a year from Feb 29', '2028-02-29', { count: 1, unit: 'year' } as const, '2029-02-28'],
])('%s: the charge day is the last day of a shorter month, never the month after', (_, today, trial, ends) => {
  expect(paywallTimeline({ ...ANNUAL, trial }, { today, firstCall: null }).at(-1)?.day).toBe(ends);
});

test('the charge is the chosen plan\'s, in the store\'s price', () => {
  const monthly: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', pricePerMonth: null, trial: { count: 2, unit: 'week' } };
  expect(rows(monthly).at(-1)?.words).toBe(t('subscription.timeline.charge.monthly', { price: '$12.99' }));
});

test('no introductory offer (none set up yet, or had already): charged today, then the first call; no reminder', () => {
  const none: Plan = { ...ANNUAL, trial: null };
  expect(rows(none)).toEqual([row(TODAY, t('subscription.timeline.chargedToday.annual', { price: '$59.99' })), row(FIRST_CALL, CALL)]);
  expect(JSON.stringify(rows(none))).not.toContain(REMINDER);
});

test('no first call to name (no health data consent, or not known): the line is left out', () => {
  expect(rows(ANNUAL, null).map((r) => r.words)).toEqual([FREE, REMINDER, CHARGE]);
});

test('a trial too short for the reminder to come after today: no reminder line (none promised)', () => {
  const short: Plan = { ...ANNUAL, trial: { count: DAYS_BEFORE, unit: 'day' } };
  expect(rows(short, null).map((r) => r.words)).toEqual([FREE, CHARGE]);
});
