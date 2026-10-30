/**
 * What a meal already holds on the day being logged, and what can be logged again (Evre 7 A, ADR-090 Ek 6): the tray under the search, the
 * calories each meal shows on its pill, and the past meals of a slot as one row each. Only arranging what the server gave (U1): nothing is
 * estimated here. A meal the phone has kept but not sent has no numbers of its own; the screen knows what it added (names, the calories of
 * the portion it showed), and that stands in until the server's list has it.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { localDay } from '@/today/today';

import { amountPhrase } from './amountText';
import { QUICK } from './draft';
import type { DayMeal } from './meals';
import { mid } from './single';

type Schemas = components['schemas'];
type Meal = Schemas['Meal'];
type Slot = Schemas['MealSlot'];

/** What the screen itself put into a meal, by the meal's clientId: the names and calories it knew when it logged them. */
export type Added = ReadonlyMap<string, { name: string; amount: string | null; kcal: number | null }[]>;

export type TrayItem = {
  key: string;
  name: string;
  /** "150 g", "1 large"; null for a quick add or a meal not sent yet. */
  amount: string | null;
  /** Null: not known yet (not sent). */
  kcal: number | null;
  /** Where the item is on the server, to change it in place; absent for a meal not sent yet. */
  meal?: Meal;
  index?: number;
};

/** The items of one slot on the day, in the order they were logged. */
export function trayOf(rows: DayMeal[], slot: Slot, added: Added): TrayItem[] {
  return rows.flatMap((row): TrayItem[] => {
    if (row.kind === 'sent') {
      if (row.meal.slot !== slot) return [];
      return row.meal.items.map((item, index) => ({
        key: `${row.meal.id}-${index}`,
        name: item.name,
        amount: item.foodId === QUICK ? null : amountPhrase(item.amount),
        kcal: mid(item.kcal),
        meal: row.meal,
        index,
      }));
    }
    if (row.slot !== slot) return [];
    const known = added.get(row.clientId);
    if (known === undefined) return [{ key: row.clientId, name: t('food.meals.waiting'), amount: null, kcal: null }];
    return known.map((item, index) => ({ key: `${row.clientId}-${index}`, name: item.name, amount: item.amount, kcal: item.kcal }));
  });
}

/** What each slot holds on the day, as one number (the middle of the server's range); a slot with nothing known is absent. */
export function slotKcal(rows: DayMeal[], added: Added): Partial<Record<Slot, number>> {
  const total: Partial<Record<Slot, number>> = {};
  for (const row of rows) {
    const slot = row.kind === 'sent' ? row.meal.slot : row.slot;
    const kcal =
      row.kind === 'sent'
        ? mid(row.meal.kcal)
        : (added.get(row.clientId) ?? []).reduce((sum, item) => sum + (item.kcal ?? 0), 0);
    if (row.kind === 'waiting' && added.get(row.clientId) === undefined) continue;
    total[slot] = (total[slot] ?? 0) + kcal;
  }
  return total;
}

/** Everything the user logged into one slot on one day: the logs are one meal to eat, so they are one meal to log again. */
export type SlotLog = {
  day: string;
  slot: Slot;
  meals: Meal[];
  items: Schemas['EstimatedItem'][];
  /** The middle of each log's range, added. */
  kcal: number;
  /** When the last of them was eaten. */
  at: number;
};

/** The meals grouped by the phone's day and slot, freshest first. */
export function slotLogs(meals: Meal[]): SlotLog[] {
  const groups = new Map<string, SlotLog>();
  for (const meal of meals) {
    const day = localDay(new Date(meal.eatenAt));
    const key = `${day}|${meal.slot}`;
    const at = Date.parse(meal.eatenAt);
    const group = groups.get(key) ?? { day, slot: meal.slot, meals: [], items: [], kcal: 0, at };
    group.meals.push(meal);
    group.items.push(...meal.items);
    group.kcal += mid(meal.kcal);
    group.at = Math.max(group.at, at);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.at - a.at);
}

const signatureOf = (log: SlotLog) => log.items.map((item) => `${item.foodId}:${item.amount.quantity}${item.amount.unit}`).join('|');

/** The past meals of `slot` to offer again: not those of `excludeDay` (the day being logged), one of each kind, the freshest first, at most `max`. */
export function logsToRepeat(logs: SlotLog[], slot: Slot, excludeDay: string, max: number): SlotLog[] {
  const seen = new Set<string>();
  const picked: SlotLog[] = [];
  for (const log of logs) {
    if (log.slot !== slot || log.day === excludeDay) continue;
    const key = signatureOf(log);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(log);
    if (picked.length === max) break;
  }
  return picked;
}
