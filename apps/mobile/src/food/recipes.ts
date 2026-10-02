/** The user's recipes on the phone (K-423, ADR-034): found by name beside the database's foods. */
import type { components } from '@/api/schema';

type Recipe = components['schemas']['Recipe'];
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
