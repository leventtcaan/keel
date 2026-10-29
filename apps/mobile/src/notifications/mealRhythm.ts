/**
 * The user's usual meal times (K-1063, ADR-090 #2, the fourth reminder kind), learned on the phone from the meals it reads:
 * the median time of day of each slot's logs over the last `meal_reminder_window_days`, a slot only with `meal_reminder_min_logs`
 * logs. Pure, like the rest of the plan (ADR-036 #2): meals and a clock in, facts out. Nothing here leaves the phone.
 */
import type { components } from '@/api/schema';
import { localDay } from '@/today/today';

import { notificationParams as P } from './params';

export type MealSlot = components['schemas']['MealSlot'];
/** What a meal needs to be learned from: when, and which slot. */
export type LoggedMeal = Pick<components['schemas']['Meal'], 'eatenAt' | 'slot'>;

/** The slots with a habit (usual minute of the day, how many logs say so), and which slots today already has. */
export type MealRhythm = {
  /** The phone's calendar day these facts are about; `loggedToday` is only trusted on that day. */
  day: string;
  slots: { slot: MealSlot; minute: number; logs: number }[];
  loggedToday: MealSlot[];
};

const minuteOf = (moment: Date) => moment.getHours() * 60 + moment.getMinutes();

/** The middle of the minutes; of an even count, the mean of the two middle ones, rounded. */
function median(minutes: number[]): number {
  const sorted = [...minutes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** The rhythm of the meals read: the window is the last `meal_reminder_window_days` calendar days up to and including today. */
export function learnRhythm(meals: LoggedMeal[], now: Date): MealRhythm {
  const today = localDay(now);
  // Calendar days, not 24-hour steps: a clock change must not move the window's first day.
  const first = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (P.mealWindowDays - 1)));
  const bySlot = new Map<MealSlot, number[]>();
  const loggedToday = new Set<MealSlot>();
  for (const meal of meals) {
    const at = new Date(meal.eatenAt);
    if (Number.isNaN(at.getTime())) continue;
    const day = localDay(at);
    if (day < first || day > today) continue;
    bySlot.set(meal.slot, [...(bySlot.get(meal.slot) ?? []), minuteOf(at)]);
    if (day === today) loggedToday.add(meal.slot);
  }
  const slots = [...bySlot.entries()]
    .filter(([, minutes]) => minutes.length >= P.mealMinLogs)
    .map(([slot, minutes]) => ({ slot, minute: median(minutes), logs: minutes.length }))
    // The best-known habit first (most logs), then the earlier in the day: the order that picks the day's reminders.
    .sort((a, b) => b.logs - a.logs || a.minute - b.minute);
  return { day: today, slots, loggedToday: [...loggedToday] };
}

/**
 * The slots and moments to remind about, from the rhythm: for today and the days ahead, the habits with the most logs (at most
 * `meal_reminder_max_per_day`), each `meal_reminder_after_minutes` after its usual time. Today's slot that is already logged
 * (as of the rhythm's own day) and a moment already past are left out.
 */
export function mealMoments(rhythm: MealRhythm | null, now: Date): { slot: MealSlot; at: Date; day: string }[] {
  if (rhythm === null) return [];
  const chosen = rhythm.slots.slice(0, P.mealMaxPerDay);
  const today = localDay(now);
  const moments: { slot: MealSlot; at: Date; day: string }[] = [];
  for (let ahead = 0; ahead < P.mealDaysAhead; ahead++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    const day = localDay(date);
    for (const { slot, minute } of chosen) {
      if (ahead === 0 && rhythm.day === today && rhythm.loggedToday.includes(slot)) continue;
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, minute + P.mealAfterMinutes);
      if (at > now) moments.push({ slot, at, day });
    }
  }
  // In the order they ring.
  return moments.sort((a, b) => a.at.getTime() - b.at.getTime());
}
