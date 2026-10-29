/**
 * "I eat N meals a day" (K-1063, ADR-090 Ek 3): the slots offered follow the user's own pattern — the ones they logged into lately —
 * so someone who eats three times a day sees three, and can add a fourth with a tap. With a calorie target, a meal of the day is about
 * the target over the slots they use: only a small hint, never a form or a rule (U7: nothing to make up for).
 */
import type { components } from '@/api/schema';

import { foodParams } from './params';

type Slot = components['schemas']['MealSlot'];

export const ALL_SLOTS: Slot[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

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

/** About how much a meal of the day is, from the day's target over the slots in use, to the nearest `meal_hint_round_kcal`. Null: no target or no slots. */
export function perMealKcal(targetKcal: number | undefined, slots: number): number | null {
  if (targetKcal === undefined || slots < 1) return null;
  return Math.round(targetKcal / slots / foodParams.mealHintRoundKcal) * foodParams.mealHintRoundKcal;
}
