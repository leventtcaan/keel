/**
 * What the paywall says (K-702, ADR-057 D3; Apple 3.1.2): the plan's name and the store's price, how long it runs, the trial
 * only when the store says this user can have it, what is charged when it ends, that it renews until cancelled, and how to
 * cancel. Every word from the copy; every price the store's own string (K2).
 */
import { t } from '@/copy';
import { weekdayDate } from '@/today/today';

import { subscriptionParams } from './params';
import type { Plan } from './store';

// "Oct 11, 2026": the phone's own calendar day of a moment, in English like every word of the app.
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** A moment (ISO, or a Date) as the day it falls on, on this phone. */
export function dayWords(moment: string | Date): string {
  return DAY.format(typeof moment === 'string' ? new Date(moment) : moment);
}

/** "7 days", "1 week": the trial in the store's own unit. */
function span(trial: NonNullable<Plan['trial']>): string {
  return trial.count === 1 ? t(`subscription.trialSpanOne.${trial.unit}`) : t(`subscription.trialSpan.${trial.unit}`, { count: String(trial.count) });
}

/** One plan to choose: its name, and its price as the store gives it. */
export function planWords(plan: Plan): { title: string; body: string } {
  if (plan.period === 'annual') {
    const price = t('subscription.plan.annualPrice', { price: plan.price });
    return {
      title: t('subscription.plan.annual'),
      body: plan.pricePerMonth === null ? price : `${price} · ${t('subscription.plan.annualPerMonth', { perMonth: plan.pricePerMonth })}`,
    };
  }
  return { title: t('subscription.plan.monthly'), body: `${t('subscription.plan.monthlyPrice', { price: plan.price })} · ${t('subscription.plan.monthlyBilled')}` };
}

/** The page for the chosen plan: its title, the terms in order, and what its button says. */
export function paywallWords(plan: Plan): { title: string; terms: string[]; action: string } {
  const cancel = t('subscription.cancelNote');
  if (plan.trial === null) {
    return { title: t('subscription.title'), terms: [t(`subscription.renews.${plan.period}`, { price: plan.price }), cancel], action: t('subscription.subscribe') };
  }
  return {
    title: t('subscription.titleTrial', { trial: span(plan.trial) }),
    // The reminder is offered, never promised: it needs the user's tap and iOS's yes (K-707, ADR-058 › 105).
    terms: [
      t('subscription.today'),
      t('subscription.reminderOffer', { days: String(subscriptionParams.trialReminderDaysBefore) }),
      t(`subscription.after.${plan.period}`, { price: plan.price }),
      cancel,
    ],
    action: t('subscription.startTrial'),
  };
}

/** One line of the timeline: its day (YYYY-MM-DD), when it is said to be, and what happens then. */
export type TimelineRow = { day: string; when: string; words: string };

/** A calendar day so many days, weeks, months or years on (read as a date only: no time zone moves it). */
function after(day: string, count: number, unit: NonNullable<Plan['trial']>['unit']): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (unit === 'day' || unit === 'week') date.setUTCDate(date.getUTCDate() + count * (unit === 'week' ? DAYS_A_WEEK : 1));
  else if (unit === 'month') date.setUTCMonth(date.getUTCMonth() + count);
  else date.setUTCFullYear(date.getUTCFullYear() + count);
  return date.toISOString().slice(0, 10);
}
const DAYS_A_WEEK = 7;

/**
 * The timeline (ADR-072 #7, ADR-058 Ek 1; prototype `.tl`): today nothing charged · the first call · the reminder before
 * the trial ends, if wanted · the day it charges — in the order their days come, the trial as long as the store's offer.
 * Without an offer, today it charges. The first call only when there is one to name; the reminder only when it would come
 * after today. `today` and `firstCall` are days on the user's calendar. Short words: the full terms stay under the button
 * (paywallWords, Apple 3.1.2).
 */
export function paywallTimeline(plan: Plan, { today, firstCall }: { today: string; firstCall: string | null }): TimelineRow[] {
  const at = (day: string, words: string): TimelineRow => ({ day, when: day === today ? t('subscription.timeline.today') : weekdayDate(day), words });
  const price = { price: plan.price };
  const rows = [at(today, plan.trial === null ? t(`subscription.timeline.chargedToday.${plan.period}`, price) : t('subscription.timeline.free'))];
  if (firstCall !== null) rows.push(at(firstCall, t('subscription.timeline.firstCall')));
  if (plan.trial !== null) {
    const ends = after(today, plan.trial.count, plan.trial.unit);
    const reminder = after(ends, -subscriptionParams.trialReminderDaysBefore, 'day');
    if (reminder > today) rows.push(at(reminder, t('subscription.timeline.reminder')));
    rows.push(at(ends, t(`subscription.timeline.charge.${plan.period}`, price)));
  }
  // Stable: on one day, the first call comes before the charge.
  return rows.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
