/**
 * A meal the coach read, handed to the meal screen (K-509): in memory and once — never in a link, where the words a user
 * eats would sit in a URL (V3). The meal screen looks at it while it is built (a pure read: React may build it twice) and
 * clears it once it is on screen, so the next meal starts empty.
 */
export type HandedMeal = { foodId: string; name: string; quantity: number; unit: string }[];

let handed: HandedMeal | null = null;

export function handOffMeal(items: HandedMeal): void {
  handed = items;
}

export function peekMeal(): HandedMeal | null {
  return handed;
}

export function clearMeal(): void {
  handed = null;
}

/** Look and clear at once. */
export function takeMeal(): HandedMeal | null {
  const taken = handed;
  handed = null;
  return taken;
}
