/**
 * The day's meals on the phone (K-407). The server's list is the truth; what the phone has not sent yet joins it, each
 * meal once by clientId, so a meal logged offline is there at once. Offline, the copies the server sent back stand in for
 * its list. A meal the server refused is not a meal (the queue keeps it, marked; K-304). Nothing here counts or estimates:
 * the ranges are the server's (U1, U5) — a meal not sent yet has none to show.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { localDay } from '@/today/today';
import { parseNumber } from '@/units/units';

import { foodParams } from './params';

type Schemas = components['schemas'];
type Meal = Schemas['Meal'];
type MealSlot = Schemas['MealSlot'];

export type DayMeal = { kind: 'sent'; meal: Meal } | { kind: 'waiting'; clientId: string; eatenAt: string; slot: MealSlot; repeatOf?: string };

const eatenAt = (row: DayMeal) => (row.kind === 'sent' ? row.meal.eatenAt : row.eatenAt);

/** `server`: the day's list, or null when it could not be read. `day` is the phone's calendar day (YYYY-MM-DD). */
export function dayMeals(server: Meal[] | null, records: LocalRecord[], day: string): DayMeal[] {
  const rows = new Map<string, DayMeal>();
  for (const meal of server ?? []) rows.set(meal.clientId, { kind: 'sent', meal });
  for (const record of records) {
    if (record.kind !== 'meal' || rows.has(record.clientId)) continue;
    const body = record.body as Schemas['NewMeal'];
    if (localDay(new Date(body.eatenAt)) !== day) continue;
    if (record.state === 'PENDING') {
      rows.set(record.clientId, {
        kind: 'waiting',
        clientId: record.clientId,
        eatenAt: body.eatenAt,
        slot: body.slot,
        ...(body.repeatOf === undefined ? {} : { repeatOf: body.repeatOf }),
      });
    } else if (record.state === 'SYNCED' && server === null && record.serverBody !== null) {
      // With the server's list read, a synced meal missing from it was deleted there: it is not shown again.
      rows.set(record.clientId, { kind: 'sent', meal: record.serverBody as Meal });
    }
  }
  return [...rows.values()].sort((a, b) => Date.parse(eatenAt(a)) - Date.parse(eatenAt(b)));
}

/** One slot of the day: every meal logged into it (several logs of the same slot are one section), and how many are not sent yet. */
export type SlotGroup = { slot: MealSlot; meals: Meal[]; waiting: number };

/** The day's rows grouped by slot, in the order the slots first appear (the rows are in time order): one header per slot (K-1066). */
export function groupBySlot(rows: DayMeal[]): SlotGroup[] {
  const groups = new Map<MealSlot, SlotGroup>();
  for (const row of rows) {
    const slot = row.kind === 'sent' ? row.meal.slot : row.slot;
    const group = groups.get(slot) ?? { slot, meals: [], waiting: 0 };
    if (row.kind === 'sent') group.meals.push(row.meal);
    else group.waiting += 1;
    groups.set(slot, group);
  }
  return [...groups.values()];
}

/**
 * "Same as yesterday" (K-407): yesterday's meals for the slots today has nothing in yet, one tap each. Once a slot is
 * logged — by a repeat or otherwise — its offers go.
 */
export function repeatOffers(yesterday: Meal[], today: DayMeal[]): Meal[] {
  const logged = new Set(today.map((row) => (row.kind === 'sent' ? row.meal.slot : row.slot)));
  return yesterday.filter((meal) => !logged.has(meal.slot));
}

/** The slot a new meal starts on, from the clock; one tap changes it. Before the first start it is the last slot. */
export function defaultSlot(now: Date): MealSlot {
  const starts = foodParams.slotStarts;
  const hour = now.getHours();
  let slot = starts[starts.length - 1].slot;
  for (const start of starts) if (hour >= start.fromHour) slot = start.slot;
  return slot;
}

/** An amount as typed: above 0, at most the contract's decimals; a comma is a decimal point (the iOS number pad). */
export function parseQuantity(text: string): number | null {
  const value = parseNumber(text);
  if (value === null || value <= 0) return null;
  const factor = 10 ** foodParams.amountDecimals;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-9 ? value : null;
}

/** What an ounce of weight is in grams (a physical constant): for a food read without portions, the server's own list has it. */
const GRAMS_PER_OUNCE = 28.349523125;

/** The grams an amount makes: by the food's own portion when it has one, else grams as they are, ounces, a serving by its own grams; null for a unit the food does not have. */
export function amountGrams(food: Schemas['Food'], amount: Schemas['Amount']): number | null {
  const portion = food.portions?.find((p) => p.unit === amount.unit);
  if (portion !== undefined) return portion.grams * amount.quantity;
  if (amount.unit === 'g') return amount.quantity;
  if (amount.unit === 'oz') return amount.quantity * GRAMS_PER_OUNCE;
  const serving = food.servings?.find((s) => s.name === amount.unit);
  return serving === undefined ? null : serving.grams * amount.quantity;
}

/** The calendar day before `day` (YYYY-MM-DD), on the phone's calendar. */
export function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}
