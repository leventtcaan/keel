/** The user's recipes on the phone (K-423, ADR-034): found by name beside the database's foods. */
import type { components } from '@/api/schema';

type Recipe = components['schemas']['Recipe'];
export type RecipeMatch = { recipe: Recipe; available: boolean };

/**
 * Recipes whose name holds the words typed, whatever the case. One with an ingredient the database dropped is marked
 * unavailable (ADR-034 #6): shown, so the user knows why, but never offered for a meal.
 */
export function recipeMatches(recipes: Recipe[], query: string): RecipeMatch[] {
  const q = query.trim().toLocaleLowerCase();
  if (q === '') return [];
  return recipes
    .filter((recipe) => recipe.name.toLocaleLowerCase().includes(q))
    .map((recipe) => ({ recipe, available: (recipe.unavailable ?? []).length === 0 && recipe.perPortion !== undefined }));
}
