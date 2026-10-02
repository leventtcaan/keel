/**
 * A meal being put together (K-407), before it is logged. Each item is a food the database matched, with its amount as
 * typed: nothing is filled in for the user — an amount left empty stays empty (I2 A4: a wrong default costs more than an
 * empty field). It turns into the contract's items only when every amount is one the server takes, so the queue never
 * holds a meal the server would refuse and lose (K-304).
 */
import type { components } from '@/api/schema';

import { amountGrams, parseQuantity } from './meals';
import { foodParams } from './params';

type Schemas = components['schemas'];

/** `units`: the food's servings, then grams. `quantity`: as typed. */
export type DraftItem = { foodId: string; name: string; units: string[]; quantity: string; unit: string; weighed: boolean };
export type Draft = { slot: Schemas['MealSlot']; items: DraftItem[] };
export type ItemProblem = 'missing' | 'invalid' | 'tooMuch';
/** The foods the phone was given, by id, from the search or a barcode answer: their servings' grams. */
export type KnownFoods = Map<string, Schemas['Food']>;

const GRAMS = 'g';

/** A food added from the search or a barcode: no amount yet, on its first serving when it has one (a measure people use). */
export function addFood(items: DraftItem[], food: Schemas['Food']): DraftItem[] {
  const units = [...(food.servings ?? []).map((serving) => serving.name), GRAMS];
  return [...items, { foodId: food.id, name: food.name, units, quantity: '', unit: units[0], weighed: false }];
}

export type KnownRecipes = Map<string, Schemas['Recipe']>;

export function addRecipe(items: DraftItem[], _recipe: Schemas['Recipe']): DraftItem[] {
  return items;
}

/** Why the server would refuse this item's amount, or null. A serving whose grams are not known is left to the server. */
export function itemProblem(item: DraftItem, known: KnownFoods, _recipes: KnownRecipes = new Map()): ItemProblem | null {
  if (item.quantity.trim() === '') return 'missing';
  const quantity = parseQuantity(item.quantity);
  if (quantity === null) return 'invalid';
  const amount = { quantity, unit: item.unit };
  const food = known.get(item.foodId);
  const grams = food !== undefined ? amountGrams(food, amount) : item.unit === GRAMS ? quantity : null;
  return grams !== null && grams > foodParams.amountMaxG ? 'tooMuch' : null;
}

/** The contract's items, or null while there are none, more than the server takes, or any amount it would refuse. */
export function requestsOf(items: DraftItem[], known: KnownFoods, _recipes: KnownRecipes = new Map()): Schemas['ItemRequest'][] | null {
  if (items.length === 0 || items.length > foodParams.itemsMax || items.some((item) => itemProblem(item, known) !== null)) return null;
  return items.map((item) => ({
    foodId: item.foodId,
    amount: { quantity: parseQuantity(item.quantity) as number, unit: item.unit, certainty: item.weighed ? 'WEIGHED' : 'ESTIMATED' },
  }));
}

/** A logged meal back as a draft, to correct (K-407: correcting is first class). Its servings' grams are not known here. */
export function draftOf(meal: Schemas['Meal']): Draft {
  return {
    slot: meal.slot,
    items: meal.items.map((item) => ({
      foodId: item.foodId,
      name: item.name,
      units: item.amount.unit === GRAMS ? [GRAMS] : [item.amount.unit, GRAMS],
      quantity: String(item.amount.quantity),
      unit: item.amount.unit,
      weighed: item.amount.certainty === 'WEIGHED',
    })),
  };
}
