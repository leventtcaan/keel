/**
 * Adding a training day (ADR-090 Ek 1, K-1060): the one way a day is added, from the Train tab, from Edit and from the first
 * week's call. The user picks the weekday; the server has the content (POST /v1/program/days). Which weekdays are free, and
 * which one to suggest, are worked out here: a default for the user's one tap, not a coaching rule (the server decides what
 * the day holds, and refuses a weekday the program trains).
 */
import type { components } from '@/api/schema';
import { WEEKDAYS } from '@/train/programEdit';

type Program = components['schemas']['Program'];
type Weekday = components['schemas']['Weekday'];

/** The weekdays the program trains on, in the week's order. */
export function trainedWeekdays(program: Program): Weekday[] {
  const on = new Set(program.days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday])));
  return WEEKDAYS.filter((day) => on.has(day));
}

/** The weekdays the program does not train on, in the week's order: where a day can go. */
export function freeWeekdays(program: Program): Weekday[] {
  const on = new Set(trainedWeekdays(program));
  return WEEKDAYS.filter((day) => !on.has(day));
}

/** Days between two weekdays going round the week (Sunday and Monday are neighbours). */
const gap = (a: Weekday, b: Weekday): number => {
  const apart = Math.abs(WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  return Math.min(apart, WEEKDAYS.length - apart);
};

/**
 * The free weekday to suggest: the one furthest from the days already trained (the most rest around it), the earliest in the
 * week when two are as far. None when no weekday is free.
 */
export function suggestedWeekday(program: Program): Weekday | undefined {
  const trained = trainedWeekdays(program);
  let best: { day: Weekday; room: number } | undefined;
  for (const day of freeWeekdays(program)) {
    const room = trained.length === 0 ? WEEKDAYS.length : Math.min(...trained.map((other) => gap(day, other)));
    if (best === undefined || room > best.room) best = { day, room };
  }
  return best?.day;
}
