/**
 * The week's weigh-ins before the first calls (ADR-089, K-1058, prototype 11.1-11.4). The server hands over the block the
 * next call reads (FirstWeeks.weighInWeek: seven days that end on the call's day, the days with a weigh-in, the count
 * needed, and `callsFrom` when the block can no longer reach it); the phone lays the seven days out and picks which of four
 * things to say. It works out no count and no date (U1): the one thing counted here is the mornings left in the block, to
 * tell "behind" from "this is the last chance". No blame, nothing to make up (U7).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { weekdayDate } from './today';
import { type Weekday, addDays, weekdayOf } from './week';

export type WeighInWeek = components['schemas']['WeighInWeek'];

export type CounterDay = { date: string; weekday: Weekday; weighed: boolean; today: boolean };
export type CounterState = 'enough' | 'behind' | 'last' | 'short';
export type Counter = {
  days: CounterDay[];
  count: number;
  needed: number;
  /** The count is reached (the mark beside the number). */
  reached: boolean;
  state: CounterState;
  /** The line under the days: its copy key and what goes in it. */
  note: { key: string; vars: Record<string, string | number> };
  /** "Weigh in": today is in the block, not weighed, and the block can still use it. */
  showWeighIn: boolean;
};

const DAYS_IN_BLOCK = 7;

/** The call's day by its weekday ("Monday"): the day the server named, said by its name. */
export const callDayName = (to: string) => t(`onboarding.schedule.dayName.${weekdayOf(to)}`);

export function counterOf(week: WeighInWeek, today: string): Counter {
  const weighed = new Set(week.weighedDays);
  const days: CounterDay[] = Array.from({ length: DAYS_IN_BLOCK }, (_, i) => {
    const date = addDays(week.from, i);
    return { date, weekday: weekdayOf(date), weighed: weighed.has(date), today: date === today };
  });
  const count = days.filter((d) => d.weighed).length;
  const missing = Math.max(0, week.needed - count);
  const day = callDayName(week.to);
  // The mornings still to weigh in on: today (while it is not weighed) and every day after it, up to the call's day.
  const left = days.filter((d) => d.date >= today && !d.weighed).length;
  const todayOpen = days.some((d) => d.today && !d.weighed);

  const base = { days, count, needed: week.needed };
  if (missing === 0) {
    return { ...base, reached: true, state: 'enough', note: { key: 'thisWeek.counter.enough', vars: { day } }, showWeighIn: false };
  }
  if (week.callsFrom !== undefined) {
    const note = { key: 'thisWeek.counter.short', vars: { day, date: weekdayDate(week.callsFrom) } };
    return { ...base, reached: false, state: 'short', note, showWeighIn: false };
  }
  if (left > 0 && left <= missing) {
    // Every morning left is needed. Said by what it is: today, today and tomorrow, tomorrow, or all of them to the call's day.
    const key = left === 1 ? (todayOpen ? 'last.today' : 'last.tomorrow') : left === 2 && todayOpen ? 'last.todayTomorrow' : 'last.every';
    return { ...base, reached: false, state: 'last', note: { key: `thisWeek.counter.${key}`, vars: { day } }, showWeighIn: todayOpen };
  }
  const note = { key: 'thisWeek.counter.behind', vars: { count: missing, day } };
  return { ...base, reached: false, state: 'behind', note, showWeighIn: todayOpen };
}
