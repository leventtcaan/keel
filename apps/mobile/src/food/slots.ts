/**
 * "I eat N meals a day" (K-1063, ADR-090 Ek 3): the slots offered follow the user's own pattern — the ones they logged into lately —
 * so someone who eats three times a day sees three, and can add a fourth with a tap. With a calorie target, a meal of the day is about
 * the target over the slots they use: only a small hint, never a form or a rule (U7: nothing to make up for).
 */
import type { components } from '@/api/schema';

import { foodParams } from './params';

type Slot = components['schemas']['MealSlot'];

export const ALL_SLOTS: Slot[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const MINUTES_A_DAY = 24 * 60;
const minutesOfDay = (at: Date) => at.getHours() * 60 + at.getMinutes();
/** The distance between two times of day, the short way round the clock. */
const gapBetween = (a: number, b: number) => {
  const apart = Math.abs(a - b);
  return Math.min(apart, MINUTES_A_DAY - apart);
};

/**
 * The meal a new log is most likely for (Evre 7 A): from the user's own pattern when there is one — the slot whose usual time of day
 * (the median of its logs in `history`, at least `slot_pattern_min_logs` of them) is nearest to now and within `slot_pattern_max_gap_min` —
 * else `fallback`, the meal the clock says. Someone who has lunch at 15:00 gets Lunch at 14:30, not Snack.
 */
export function likelySlot(history: { slot: Slot; eatenAt: string }[], now: Date, fallback: Slot): Slot {
  const nowAt = minutesOfDay(now);
  let best: { slot: Slot; gap: number } | null = null;
  for (const slot of ALL_SLOTS) {
    const times = history
      .filter((meal) => meal.slot === slot)
      .map((meal) => minutesOfDay(new Date(meal.eatenAt)))
      .sort((a, b) => a - b);
    if (times.length < foodParams.slotPatternMinLogs) continue;
    const usual = times[Math.floor(times.length / 2)];
    const gap = gapBetween(usual, nowAt);
    if (best === null || gap < best.gap) best = { slot, gap };
  }
  return best !== null && best.gap <= foodParams.slotPatternMaxGapMin ? best.slot : fallback;
}

/** The slots of the user's day, in the day's order: those of `history` (and `also`); all four until the pattern shows at least two. */
export function usedSlots(history: { slot: Slot }[], also: Slot[] = []): Slot[] {
  const seen = new Set<Slot>([...history.map((meal) => meal.slot), ...also]);
  const used = ALL_SLOTS.filter((slot) => seen.has(slot));
  return used.length >= 2 ? used : ALL_SLOTS;
}

/** The slots the user's day is made of that this day has no meal in. */
export function emptySlotsOf(used: Slot[], logged: Slot[]): Slot[] {
  return used.filter((slot) => !logged.includes(slot));
}

/** The sections of one day, filled and empty alike, in the day's one order (Breakfast, Lunch, Dinner, Snack); a slot the app adds later goes last. */
export function dayOrder(filled: Slot[], empty: Slot[]): Slot[] {
  const place = (slot: Slot) => {
    const at = ALL_SLOTS.indexOf(slot);
    return at === -1 ? ALL_SLOTS.length : at;
  };
  return [...new Set([...filled, ...empty])].sort((a, b) => place(a) - place(b));
}

/** About how much a meal of the day is, from the day's target over the slots in use, to the nearest `meal_hint_round_kcal`. Null: no target or no slots. */
export function perMealKcal(targetKcal: number | undefined, slots: number): number | null {
  if (targetKcal === undefined || slots < 1) return null;
  return Math.round(targetKcal / slots / foodParams.mealHintRoundKcal) * foodParams.mealHintRoundKcal;
}
