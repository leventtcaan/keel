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

/** One plan to choose: its name, how it is billed, the store's price, and (yearly only) the saving over twelve months of monthly. */
export type PlanLine = { title: string; note: string; price: string; perMonth: string | null; badge: string | null; label: string };

/** `saving` is the yearly plan's percentage (saving.ts), or null when none is to be said; the monthly plan never carries it. */
export function planWords(plan: Plan, saving: number | null): PlanLine {
  const annual = plan.period === 'annual';
  const title = t(annual ? 'subscription.plan.annual' : 'subscription.plan.monthly');
  const note = t(annual ? 'subscription.plan.annualBilled' : 'subscription.plan.monthlyBilled');
  const price = t(annual ? 'subscription.plan.annualPrice' : 'subscription.plan.monthlyPrice', { price: plan.price });
  const perMonth = annual && plan.pricePerMonth !== null ? t('subscription.plan.perMonth', { perMonth: plan.pricePerMonth }) : null;
  const percent = annual ? saving : null;
  const badge = percent === null ? null : t('subscription.plan.save', { percent });
  const spoken = percent === null ? [] : [t('subscription.plan.savesSpoken', { percent })];
  return { title, note, price, perMonth, badge, label: [title, note, price, ...(perMonth === null ? [] : [perMonth]), ...spoken].join(', ') };
}

/** What the paywall's page says for the chosen plan, in the order it shows it. */
export type PaywallWords = {
  /** The whole headline, for a screen reader. */
  title: string;
  /** Its first line, and its second (the trial's length, in the accent colour); none without a trial. */
  lead: string;
  accent: string | null;
  /** The cancel note, in the scroll. The price and the renewal are said once, in `dock` by the button (Apple 3.1.2, K-1066). */
  terms: string[];
  /**
   * The line above the bottom links: what today costs (the trial only), then what it renews at. The billed amount is its own part
   * (`price`), so the screen can set it at least as prominent as the trial claim (Apple 3.1.2); `label` is the whole line.
   */
  dock: { strong: string | null; lead: string | null; price: string; tail: string; label: string };
  /** The button. */
  action: string;
};

/** The line at the bottom: "No charge today." (the trial only), "Then" (the same), the price as the store gives it, and how it renews. */
function dockWords(plan: Plan, strong: string | null): PaywallWords['dock'] {
  const lead = strong === null ? null : t('subscription.dock.then');
  const price = t(plan.period === 'annual' ? 'subscription.plan.annualPrice' : 'subscription.plan.monthlyPrice', { price: plan.price });
  const tail = t(`subscription.dock.tail.${plan.period}`);
  return { strong, lead, price, tail, label: [strong, lead, `${price}${tail}`].filter((part) => part !== null).join(' ') };
}

/**
 * The page for the chosen plan: its headline, the day the trial ends (`today` is a day on the user's calendar), the terms in
 * order, the line under the button and what the button says. The reminder before the trial ends is the timeline's: offered,
 * never promised (K-707, ADR-058 › 105).
 */
export function paywallWords(plan: Plan, today: string): PaywallWords {
  const cancel = t('subscription.cancelNote');
  if (plan.trial === null) {
    const title = t('subscription.title');
    return { title, lead: title, accent: null, terms: [cancel], dock: dockWords(plan, null), action: t('subscription.subscribe') };
  }
  const trial = span(plan.trial);
  return {
    title: t('subscription.titleTrial', { trial }),
    lead: t('subscription.titleLead'),
    accent: t('subscription.titleFor', { trial }),
    terms: [cancel],
    dock: dockWords(plan, t('subscription.dock.noCharge')),
    action: t('subscription.startTrial', { trial: t(`subscription.trial.${plan.trial.unit}`, { count: String(plan.trial.count) }) }),
  };
}

/** One line of the timeline: its day (YYYY-MM-DD), when it is said to be, and what happens then. */
export type TimelineRow = { day: string; when: string; words: string };

/**
 * A calendar day so many days, weeks, months or years on (read as a date only: no time zone moves it). A month or a year
 * on from a day the target month lacks (Jan 31, Feb 29) is that month's last day, never a day of the month after.
 */
function after(day: string, count: number, unit: NonNullable<Plan['trial']>['unit']): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (unit === 'day' || unit === 'week') {
    date.setUTCDate(date.getUTCDate() + count * (unit === 'week' ? DAYS_A_WEEK : 1));
    return date.toISOString().slice(0, 10);
  }
  const months = date.getUTCMonth() + count * (unit === 'year' ? MONTHS_A_YEAR : 1);
  // Day 0 of the month after the target is the target's last day.
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(date.getUTCFullYear(), months, Math.min(date.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}
const MONTHS_A_YEAR = 12;
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
