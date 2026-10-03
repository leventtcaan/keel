/**
 * A meal being put together (K-407), before it is logged. Each item is a food the database matched, with its amount as
 * typed: nothing is filled in for the user — an amount left empty stays empty (I2 A4: a wrong default costs more than an
 * empty field). It turns into the contract's items only when every amount is one the server takes, so the queue never
 * holds a meal the server would refuse and lose (K-304).
 */
import type { components } from '@/api/schema';

import type { HandedMeal } from './handoff';
import { amountGrams, parseQuantity } from './meals';
import { foodParams } from './params';

type Schemas = components['schemas'];

/** `units`: the food's servings, then grams. `quantity`: as typed. */
export type DraftItem = { foodId: string; name: string; units: string[]; quantity: string; unit: string; weighed: boolean };
export type Draft = { slot: Schemas['MealSlot']; items: DraftItem[] };
export type ItemProblem = 'missing' | 'invalid' | 'tooMuch' | 'recipeGone';
/** The foods the phone was given, by id, from the search or a barcode answer: their servings' grams. */
export type KnownFoods = Map<string, Schemas['Food']>;

const GRAMS = 'g';

/** A food added from the search or a barcode: no amount yet, on its first serving when it has one (a measure people use). */
export function addFood(items: DraftItem[], food: Schemas['Food']): DraftItem[] {
  const units = [...(food.servings ?? []).map((serving) => serving.name), GRAMS];
  return [...items, { foodId: food.id, name: food.name, units, quantity: '', unit: units[0], weighed: false }];
}

/** The user's recipes the phone was given, by their item id ("recipe:<id>", ADR-034): how many portions each makes. */
export type KnownRecipes = Map<string, Schemas['Recipe']>;

/**
 * A meal the coach read, as rows to confirm (K-509): its measure first, grams always offered — the server says whether the
 * measure is one of the food's (a measure it does not know asks for grams there, K-504).
 */
export function itemsHanded(handed: HandedMeal | null): DraftItem[] {
  return (handed ?? []).slice(0, foodParams.itemsMax).map((item) => ({
    foodId: item.foodId,
    name: item.name,
    units: item.unit === GRAMS ? [GRAMS] : [item.unit, GRAMS],
    quantity: String(item.quantity),
    unit: item.unit,
    weighed: false,
  }));
}


/** A recipe's unit in a meal (ADR-034 #2): portions — never grams, the recipe's weight is not known. */
export const PORTION = 'portion';
export const recipeItemId = (recipe: Schemas['Recipe']) => `recipe:${recipe.id}`;
const isRecipe = (item: DraftItem) => item.unit === PORTION;

/** A recipe added: one item counted in portions, no amount yet (K-423). */
export function addRecipe(items: DraftItem[], recipe: Schemas['Recipe']): DraftItem[] {
  return [...items, { foodId: recipeItemId(recipe), name: recipe.name, units: [PORTION], quantity: '', unit: PORTION, weighed: false }];
}

/**
 * Why the server would refuse this item's amount, or null. A serving whose grams are not known is left to the server.
 * A recipe: at most the whole recipe (ADR-034 #6). `recipes` is the user's recipes once read; until then (undefined) a
 * recipe is left to the server. Read and not there — deleted since, or an ingredient dropped — it cannot be estimated:
 * `recipeGone`, so the item says why rather than the whole meal blaming the connection (K-423 review).
 */
export function itemProblem(item: DraftItem, known: KnownFoods, recipes?: KnownRecipes): ItemProblem | null {
  if (isRecipe(item) && recipes !== undefined) {
    const recipe = recipes.get(item.foodId);
    if (recipe === undefined || (recipe.unavailable ?? []).length > 0 || recipe.perPortion === undefined) return 'recipeGone';
  }
  if (item.quantity.trim() === '') return 'missing';
  const quantity = parseQuantity(item.quantity);
  if (quantity === null) return 'invalid';
  if (isRecipe(item)) {
    const recipe = recipes?.get(item.foodId);
    return recipe !== undefined && quantity > recipe.portions ? 'tooMuch' : null;
  }
  const amount = { quantity, unit: item.unit };
  const food = known.get(item.foodId);
  const grams = food !== undefined ? amountGrams(food, amount) : item.unit === GRAMS ? quantity : null;
  return grams !== null && grams > foodParams.amountMaxG ? 'tooMuch' : null;
}

/** The contract's items, or null while there are none, more than the server takes, or any amount it would refuse. */
export function requestsOf(items: DraftItem[], known: KnownFoods, recipes?: KnownRecipes): Schemas['ItemRequest'][] | null {
  if (items.length === 0 || items.length > foodParams.itemsMax || items.some((item) => itemProblem(item, known, recipes) !== null)) return null;
  return items.map((item) => ({
    foodId: item.foodId,
    // A portion is never weighed: the recipe's whole weight is not known (ADR-034, alternative c).
    amount: { quantity: parseQuantity(item.quantity) as number, unit: item.unit, certainty: item.weighed && !isRecipe(item) ? 'WEIGHED' : 'ESTIMATED' },
  }));
}

/** A logged meal back as a draft, to correct (K-407: correcting is first class). Its servings' grams are not known here. */
export function draftOf(meal: Schemas['Meal']): Draft {
  return {
    slot: meal.slot,
    items: meal.items.map((item) => ({
      foodId: item.foodId,
      name: item.name,
      units: item.amount.unit === GRAMS || item.amount.unit === PORTION ? [item.amount.unit] : [item.amount.unit, GRAMS],
      quantity: String(item.amount.quantity),
      unit: item.amount.unit,
      weighed: item.amount.certainty === 'WEIGHED',
    })),
  };
}
