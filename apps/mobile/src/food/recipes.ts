/** The user's recipes on the phone (K-423, ADR-034): found by name beside the database's foods. */
import type { components } from '@/api/schema';

import { type DraftItem, type KnownFoods, requestsOf } from './draft';
import { foodParams } from './params';

type Recipe = components['schemas']['Recipe'];
type NewRecipe = components['schemas']['NewRecipe'];
export type RecipeMatch = { recipe: Recipe; available: boolean };

/**
 * Recipes whose name holds the words typed, whatever the case. One with an ingredient the database dropped is marked
 * unavailable (ADR-034 #6): shown, so the user knows why, but never offered for a meal.
 */
/**
 * Letters folded alike whatever the phone's locale: a Turkish iPhone lowercases "I" to "ı" and "İ" to "i̇" (K-423
 * review), so both sides lose the dot above (U+0307) and "ı" reads as "i".
 */
const fold = (text: string) => text.normalize('NFD').replace(/\u0307/g, '').toLowerCase().replace(/ı/g, 'i');

export function recipeMatches(recipes: Recipe[], query: string): RecipeMatch[] {
  const q = fold(query.trim());
  if (q === '') return [];
  return recipes
    .filter((recipe) => fold(recipe.name).includes(q))
    .map((recipe) => ({ recipe, available: (recipe.unavailable ?? []).length === 0 && recipe.perPortion !== undefined }));
}

export type RecipeDraft = { name: string; portions: string; items: DraftItem[] };
type Part = 'name' | 'portions' | 'items';

/**
 * A recipe being entered, as the contract's NewRecipe — or null, with the parts the server would refuse (K-423): the
 * name trimmed, 1 to the most code points; the portions a whole number from 1 to the most; the ingredients as a meal's
 * items (database foods, every amount given). Nothing is sent that the server would turn away.
 */
export function recipeOf(draft: RecipeDraft, known: KnownFoods, clientId: string): { recipe: NewRecipe | null; missing: Part[] } {
  const name = draft.name.trim();
  const portions = /^\d+$/.test(draft.portions.trim()) ? Number(draft.portions.trim()) : NaN;
  const items = requestsOf(draft.items, known);
  const missing: Part[] = [];
  if (name === '' || Array.from(name).length > foodParams.recipeNameMaxChars) missing.push('name');
  if (!(portions >= 1 && portions <= foodParams.recipePortionsMax)) missing.push('portions');
  if (items === null) missing.push('items');
  return { recipe: missing.length === 0 && items !== null ? { clientId, name, portions, items } : null, missing };
}
