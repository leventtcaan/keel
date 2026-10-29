/**
 * A meal being put together (K-407), before it is logged. Each item is a food the database matched, with its amount as
 * typed. A food comes in with its amount filled — 1 of a serving, 100 g — so its estimate shows at once and the user changes
 * it (ADR-085 #5); an amount the user empties stays empty (I2 A4: a wrong default costs more than an empty field). It turns
 * into the contract's items only when every amount is one the server takes, so the queue never holds a meal the server
 * would refuse and lose (K-304).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import type { HandedMeal } from './handoff';
import { amountGrams, parseQuantity } from './meals';
import { foodParams } from './params';
import { mid } from './single';

type Schemas = components['schemas'];

/** A quick add's numbers as typed (whole numbers; a macro left empty is not sent). */
export type QuickDraft = { kcal: string; protein: string; carbs: string; fat: string };
/**
 * `units`: the food's portions (the server's list, default first), else its servings, then grams. `quantity`: as typed. `portions`:
 * the server's portions with their single numbers, when the food was read (a search, a barcode, the food by id); absent for an item
 * read back from a logged meal before its food has been. `quick`: a quick add (foodId "quick", no food behind it).
 */
export type DraftItem = {
  foodId: string;
  name: string;
  units: string[];
  quantity: string;
  unit: string;
  weighed: boolean;
  portions?: Schemas['Portion'][];
  quick?: QuickDraft;
};
export type Draft = { slot: Schemas['MealSlot']; items: DraftItem[] };
export type ItemProblem = 'missing' | 'invalid' | 'tooMuch' | 'recipeGone';
/** The foods the phone was given, by id, from the search or a barcode answer: their servings' grams. */
export type KnownFoods = Map<string, Schemas['Food']>;

const GRAMS = 'g';

const escaped = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The words of a volume measure as whole words, in any case, plural or not ("1 cup, sifted", "2 TBSPS", "1 fl. oz"). */
const VOLUME = new RegExp(`(^|[^a-z])(${foodParams.servingVolumeWords.map(escaped).join('|')})s?($|[^a-z])`);
const isVolume = (serving: string) => VOLUME.test(serving.toLowerCase().replace(/\./g, ''));

/** The food as a draft item, opened on `amount` (a recent food's last amount) or, without one, on its natural portion. */
export function itemOf(food: Schemas['Food'], amount?: Pick<Schemas['Amount'], 'quantity' | 'unit'>): DraftItem {
  const portions = food.portions ?? [];
  if (portions.length > 0) {
    // The server's list (ADR-090 #1): the natural portion first and chosen ("1 large" egg), g and oz always last; a recent food keeps
    // the amount it was had in when that portion still exists.
    const start = amount !== undefined && portions.some((portion) => portion.unit === amount.unit) ? amount : (food.defaultAmount ?? { quantity: 1, unit: portions[0].unit });
    return {
      foodId: food.id,
      name: food.name,
      units: portions.map((portion) => portion.unit),
      quantity: String(start.quantity),
      unit: start.unit,
      weighed: false,
      portions,
    };
  }
  // A food without portions (an older answer): its first serving that is not a volume measure — "1 large" over "1 cup, sifted" — else grams.
  const servings = (food.servings ?? []).map((serving) => serving.name);
  const units = [...servings, GRAMS];
  const unit = servings.find((name) => !isVolume(name)) ?? GRAMS;
  const quantity = unit === GRAMS ? foodParams.defaultGrams : 1;
  return { foodId: food.id, name: food.name, units, quantity: String(quantity), unit, weighed: false };
}

/**
 * A food added from the search, a barcode, a recent list or a star (ADR-085 #5, ADR-090 #1): on its natural portion with the amount
 * filled (1 large, 1 serving) so its numbers show at once and the user changes them with a tap.
 */
export function addFood(items: DraftItem[], food: Schemas['Food'], amount?: Pick<Schemas['Amount'], 'quantity' | 'unit'>): DraftItem[] {
  return [...items, itemOf(food, amount)];
}

/** The unit of a quick add: one "serving" of the numbers typed (the contract's QuickEntry). */
export const QUICK = 'quick';
const QUICK_UNIT = 'serving';

/** A quick add: calories, and the macros if known, with no food behind them. */
export function addQuick(items: DraftItem[], quick: QuickDraft): DraftItem[] {
  return [...items, { foodId: QUICK, name: t('meal.quickAdd.name'), units: [QUICK_UNIT], quantity: '1', unit: QUICK_UNIT, weighed: false, quick }];
}

/** A whole number from what was typed within 0..max, or null; "" is `empty`. */
function wholeNumber(text: string, max: number): number | null | 'empty' {
  if (text.trim() === '') return 'empty';
  const value = Number(text.replace(',', '.'));
  return Number.isInteger(value) && value >= 0 && value <= max ? value : null;
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
    // A recipe is eaten in portions only — never weighed (ADR-034); a food's measure first, grams always offered.
    units: item.unit === GRAMS || item.unit === PORTION ? [item.unit] : [item.unit, GRAMS],
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
  if (item.quick !== undefined) {
    const kcal = wholeNumber(item.quick.kcal, foodParams.quickAddKcalMax);
    if (kcal === 'empty') return 'missing';
    if (kcal === null || kcal < 1) return 'invalid';
    return [item.quick.protein, item.quick.carbs, item.quick.fat].some((macro) => wholeNumber(macro, foodParams.quickAddMacroMax) === null) ? 'invalid' : null;
  }
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
  return items.map((item) => {
    if (item.quick !== undefined) return quickRequest(item.quick);
    return {
    foodId: item.foodId,
    // A portion is never weighed: the recipe's whole weight is not known (ADR-034, alternative c).
    amount: { quantity: parseQuantity(item.quantity) as number, unit: item.unit, certainty: item.weighed && !isRecipe(item) ? 'WEIGHED' : 'ESTIMATED' },
    };
  });
}

/** A quick add as the contract's item: foodId "quick", one serving, the numbers typed (a macro left empty is left out). */
function quickRequest(quick: QuickDraft): Schemas['ItemRequest'] {
  const macro = (text: string) => {
    const value = wholeNumber(text, foodParams.quickAddMacroMax);
    return typeof value === 'number' ? value : undefined;
  };
  const [proteinG, carbsG, fatG] = [macro(quick.protein), macro(quick.carbs), macro(quick.fat)];
  return {
    foodId: QUICK,
    amount: { quantity: 1, unit: QUICK_UNIT },
    quick: {
      kcal: wholeNumber(quick.kcal, foodParams.quickAddKcalMax) as number,
      ...(proteinG === undefined ? {} : { proteinG }),
      ...(carbsG === undefined ? {} : { carbsG }),
      ...(fatG === undefined ? {} : { fatG }),
    },
  };
}

/** A logged item as the request that logs it again (an undo, a copy): a quick add keeps its numbers (low = high, exact). */
export function requestOfItem(item: Schemas['EstimatedItem']): Schemas['ItemRequest'] {
  if (item.foodId === QUICK) {
    return {
      foodId: QUICK,
      amount: { quantity: 1, unit: QUICK_UNIT },
      quick: { kcal: item.kcal.low, proteinG: item.proteinG.low, ...(item.carbsG === undefined ? {} : { carbsG: item.carbsG.low }), ...(item.fatG === undefined ? {} : { fatG: item.fatG.low }) },
    };
  }
  return { foodId: item.foodId, amount: { quantity: item.amount.quantity, unit: item.amount.unit, ...(item.amount.certainty === undefined ? {} : { certainty: item.amount.certainty }) } };
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
      ...(item.foodId === QUICK
        ? { quick: { kcal: String(mid(item.kcal)), protein: String(mid(item.proteinG)), carbs: item.carbsG === undefined ? '' : String(mid(item.carbsG)), fat: item.fatG === undefined ? '' : String(mid(item.fatG)) } }
        : {}),
    })),
  };
}
