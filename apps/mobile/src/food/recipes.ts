import type { components } from '@/api/schema';

type Recipe = components['schemas']['Recipe'];

export function recipeMatches(_recipes: Recipe[], _query: string): { recipe: Recipe; available: boolean }[] {
  return [];
}
