/**
 * Days on the phone's calendar for the day navigator (K-1063): the label of a day, a day some days away, the days of the strip, and
 * the moment a meal logged into a given day is given. Calendar arithmetic only, never 24-hour steps (a clock change must not move a day).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { localDay, weekdayDate } from '@/today/today';

import { foodParams } from './params';

type MealSlot = components['schemas']['MealSlot'];

const parts = (day: string): [number, number, number] => {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m - 1, d];
};

/** The calendar day `n` days after `day` (before, when negative). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day);
  return localDay(new Date(y, m, d + n));
}

/** "Today", "Yesterday", else "Mon, Oct 26". */
export function dayLabel(day: string, today: string): string {
  if (day === today) return t('food.day.today');
  if (day === addDays(today, -1)) return t('food.day.yesterday');
  return weekdayDate(day);
}

/** The Food page's title: "Today's food", "Yesterday's food", else "Food" — the navigator under it already names the day. */
export function dayTitle(day: string, today: string): string {
  if (day === today) return t('screens.food.title');
  if (day === addDays(today, -1)) return t('food.day.titleYesterday');
  return t('food.day.titleOther');
}

/** The days of the strip, today last: `count` days ending today. */
export function stripDays(today: string, count: number = foodParams.dayStripDays): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}

/**
 * When a meal logged into `day` happened (what the server stores): today's is now; a day before is that day at the slot's usual hour
 * (food.json `past_day_slot_hours`), on the phone's clock.
 */
export function eatenAtFor(day: string, slot: MealSlot, now: Date): string {
  if (day === localDay(now)) return now.toISOString();
  const [y, m, d] = parts(day);
  return new Date(y, m, d, foodParams.pastDaySlotHours[slot]).toISOString();
}

/** The same moment of the day on another day: a meal copied from `from` into `into` keeps its time of day. */
export function sameTimeOn(eatenAt: string, into: string, today: string, now: Date): string {
  if (into === today) return now.toISOString();
  const at = new Date(eatenAt);
  const [y, m, d] = parts(into);
  return new Date(y, m, d, at.getHours(), at.getMinutes()).toISOString();
}
