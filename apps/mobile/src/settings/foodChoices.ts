/**
 * The foods people most often leave out (K-1062; US shoppers): a chip each on Settings › Foods you avoid. The profile keeps the
 * word as a plain string (FoodPreferences.avoid), the common ones as the id below and the user's own as they typed them; the
 * chip's words are copy (`settings.food.common.<id>`). Matching is by lower case, so "Peanuts" typed once is the same food.
 */
export const COMMON_AVOIDS = ['pork', 'beef', 'shellfish', 'fish', 'dairy', 'eggs', 'gluten', 'nuts', 'peanuts', 'soy', 'alcohol'] as const;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whether the list holds the food (case does not matter). */
export const has = (list: readonly string[], food: string): boolean => list.some((kept) => same(kept, food));

/** The list with the food taken off if it was there, or put at the end if it was not. */
export const toggled = (list: readonly string[], food: string): string[] =>
  has(list, food) ? list.filter((kept) => !same(kept, food)) : [...list, food];
